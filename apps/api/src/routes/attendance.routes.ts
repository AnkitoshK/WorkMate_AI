import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Helper: Auto-scrap records older than 30 days (1 month rolling retention cycle)
async function autoScrapRecordsOlderThanOneMonth(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.attendanceLog.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo },
      },
    });
    if (result.count > 0) {
      console.log(`🧹 [Retention] Auto-scrapped ${result.count} attendance records older than 30 days.`);
    }
    return result.count;
  } catch (err) {
    console.error("Auto-scrap attendance notice:", err);
    return 0;
  }
}

// Helper: Format date as YYYY-MM-DD
function getTodayDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const punchSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  action: z.enum(["PUNCH_IN", "PUNCH_OUT"]),
  clientType: z.string().trim().default("WEB_PORTAL"),
});

// GET /api/attendance - List attendance logs with datewise filter & statistics
router.get("/", async (req, res, next) => {
  try {
    // Run 30-day retention auto-scrap
    await autoScrapRecordsOlderThanOneMonth();

    const { search, limit = "200", role, department, date, startDate, endDate, userId } = req.query;
    const take = Math.min(Math.max(Number(limit) || 200, 1), 1000);

    const where: any = {};
    if (role && role !== "ALL") where.role = String(role);
    if (department && department !== "ALL") where.department = String(department);
    if (userId && typeof userId === "string" && userId.trim()) {
      where.userId = String(userId).trim();
    }

    // Date-wise filtering: single specific date or range
    if (date && typeof date === "string" && date.trim()) {
      const targetDate = date.trim();
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
      where.OR = [
        { shiftDate: targetDate },
        { timestamp: { gte: startOfDay, lte: endOfDay } },
      ];
    } else if (startDate || endDate) {
      const timeFilter: any = {};
      if (startDate) timeFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) timeFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
      where.timestamp = timeFilter;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      const searchCond = [
        { userName: { contains: q, mode: "insensitive" } },
        { userEmail: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { role: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCond }];
        delete where.OR;
      } else {
        where.OR = searchCond;
      }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take,
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    // Calculate Today's punches (from midnight local/UTC)
    const todayStr = getTodayDateString();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayWhere: any = {
      OR: [
        { shiftDate: todayStr },
        { timestamp: { gte: startOfToday } },
      ],
    };
    if (where.userId) {
      todayWhere.userId = where.userId;
    }

    const todayCount = await prisma.attendanceLog.count({
      where: todayWhere,
    });

    // Unique staff active today
    const activeTodayLogs = await prisma.attendanceLog.findMany({
      where: {
        OR: [
          { shiftDate: todayStr },
          { timestamp: { gte: startOfToday } },
        ],
      },
      select: { userEmail: true },
      distinct: ["userEmail"],
    });

    res.json({
      logs,
      totalCount,
      todayCount,
      uniqueStaffToday: activeTodayLogs.length,
      retentionPolicy: "30_DAYS_ROLLING_SCRAP",
      filterDate: date || null,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/punch - Explicit shift punch in/out (Shift: 9:00 AM - 5:30 PM with 30-min buffer)
router.post("/punch", async (req, res, next) => {
  const parsed = punchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid punch parameters", details: parsed.error.flatten() });
  }

  const { userId, action, clientType } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Employee account not found" });
    }

    const now = new Date();
    const todayStr = getTodayDateString(now);

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "Web Browser";

    if (action === "PUNCH_IN") {
      // Cooldown check: If employee logged out recently, enforce 8h 30m cooldown
      // (Exempt SUPER_ADMIN and ADMIN for administrative flexibility)
      if (user.lastLogoutAt && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
        const cooldownMs = 8.5 * 60 * 60 * 1000; // 8 hours 30 mins
        const elapsedMs = now.getTime() - new Date(user.lastLogoutAt).getTime();
        if (elapsedMs < cooldownMs) {
          const remainingMs = cooldownMs - elapsedMs;
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const allowAt = new Date(now.getTime() + remainingMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return res.status(403).json({
            error: `Shift cooldown active: You logged out earlier. In accordance with the 8h 30m shift cycle, next punch-in is allowed at ${allowAt} (remaining: ${remainingHours}h ${remainingMins}m).`,
            cooldownRemainingMs: remainingMs,
            canPunchAt: allowAt,
          });
        }
      }

      // Check if employee already punched in today
      const existingTodayPunch = await prisma.attendanceLog.findFirst({
        where: {
          userId: user.id,
          shiftDate: todayStr,
          action: "PUNCH_IN",
        },
      });

      if (existingTodayPunch) {
        return res.status(400).json({
          error: `You have already punched in for today's cycle at ${new Date(existingTodayPunch.punchIn || existingTodayPunch.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
          log: existingTodayPunch,
        });
      }

      // Calculate arrival status relative to 9:00 AM shift and 30-min buffer (up to 9:30 AM)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMins = currentHour * 60 + currentMinute;
      const shiftStartMins = 9 * 60; // 9:00 AM = 540 mins
      const bufferEndMins = 9 * 60 + 30; // 9:30 AM = 570 mins

      let status = "ON_TIME";
      let remarks = "";

      if (currentTotalMins <= bufferEndMins) {
        status = "ON_TIME";
        remarks = currentTotalMins <= shiftStartMins
          ? "On-time arrival (9:00 AM Shift)"
          : "Relaxation buffer applied (Arrival between 9:00 AM - 9:30 AM)";
      } else {
        status = "LATE";
        const lateMins = currentTotalMins - shiftStartMins;
        const lH = Math.floor(lateMins / 60);
        const lM = lateMins % 60;
        remarks = `Late arrival by ${lH > 0 ? `${lH}h ` : ""}${lM}m (Shift starts 9:00 AM)`;
      }

      const log = await prisma.attendanceLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email.toLowerCase(),
          role: user.role,
          department: user.department || "Operations",
          clientType,
          action: "PUNCH_IN",
          status,
          shiftDate: todayStr,
          punchIn: now,
          remarks,
          ipAddress: clientIp,
          userAgent: userAgent.slice(0, 255),
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastPunchIn: now,
          shiftStatus: "ON_DUTY",
        },
      });

      return res.status(201).json({
        success: true,
        message: `Punch-in recorded successfully for ${user.name}. ${remarks}`,
        log,
      });
    }

    if (action === "PUNCH_OUT") {
      // Find today's punch in
      const todayPunchIn = await prisma.attendanceLog.findFirst({
        where: {
          userId: user.id,
          shiftDate: todayStr,
          action: "PUNCH_IN",
        },
        orderBy: { timestamp: "desc" },
      });

      const punchInTime = todayPunchIn?.punchIn ? new Date(todayPunchIn.punchIn) : now;
      const workDurationMs = Math.max(0, now.getTime() - punchInTime.getTime());
      const workHours = Math.round((workDurationMs / (1000 * 60 * 60)) * 100) / 100;
      const hours = Math.floor(workDurationMs / 3600000);
      const minutes = Math.floor((workDurationMs % 3600000) / 60000);

      // Shift is 8 hours 30 minutes (8.5 hrs)
      const isShiftCompleted = workHours >= 8.5 || (now.getHours() >= 17 && now.getMinutes() >= 30);
      const status = isShiftCompleted ? "COMPLETED" : workHours >= 4.25 ? "HALF_DAY" : "EARLY_LOGOUT";
      const remarks = `Punched out at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Total Shift Duration: ${hours}h ${minutes}m. Status: ${status}.`;

      const log = await prisma.attendanceLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email.toLowerCase(),
          role: user.role,
          department: user.department || "Operations",
          clientType,
          action: "PUNCH_OUT",
          status,
          shiftDate: todayStr,
          punchIn: punchInTime,
          punchOut: now,
          workHours,
          remarks,
          ipAddress: clientIp,
          userAgent: userAgent.slice(0, 255),
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastPunchOut: now,
          lastLogoutAt: now,
          shiftStatus: "OFF_DUTY",
        },
      });

      return res.status(201).json({
        success: true,
        message: `Shift logout completed for ${user.name}. Worked ${hours}h ${minutes}m. Next cycle operates daily.`,
        log,
      });
    }

    return res.status(400).json({ error: "Unsupported punch action" });
  } catch (error) {
    next(error);
  }
});

// GET /api/attendance/export - Export attendance logs to CSV (supports ?date=YYYY-MM-DD or date range)
router.get("/export", async (req, res, next) => {
  try {
    const { date, role, department, userId } = req.query;
    const where: any = {};
    if (role && role !== "ALL") where.role = String(role);
    if (department && department !== "ALL") where.department = String(department);
    if (userId && typeof userId === "string" && userId.trim()) {
      where.userId = String(userId).trim();
    }

    if (date && typeof date === "string" && date.trim()) {
      const targetDate = date.trim();
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
      where.OR = [
        { shiftDate: targetDate },
        { timestamp: { gte: startOfDay, lte: endOfDay } },
      ];
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const headers = [
      "Log ID",
      "Shift Date",
      "Staff Name",
      "Email Address",
      "Role",
      "Department",
      "Action",
      "Shift Status",
      "Punch In Time",
      "Punch Out Time",
      "Logged Hours",
      "Shift Remarks",
      "Client Type",
      "Timestamp",
    ];

    const rows = logs.map((log) => {
      const punchInStr = log.punchIn ? new Date(log.punchIn).toLocaleTimeString() : "N/A";
      const punchOutStr = log.punchOut ? new Date(log.punchOut).toLocaleTimeString() : "N/A";
      const hoursStr = log.workHours ? `${log.workHours}h` : "N/A";

      return [
        `"${log.id}"`,
        `"${log.shiftDate || new Date(log.timestamp).toISOString().slice(0, 10)}"`,
        `"${(log.userName || "").replace(/"/g, '""')}"`,
        `"${(log.userEmail || "").replace(/"/g, '""')}"`,
        `"${log.role}"`,
        `"${(log.department || "Operations").replace(/"/g, '""')}"`,
        `"${log.action}"`,
        `"${log.status}"`,
        `"${punchInStr}"`,
        `"${punchOutStr}"`,
        `"${hoursStr}"`,
        `"${(log.remarks || "").replace(/"/g, '""')}"`,
        `"${log.clientType}"`,
        `"${new Date(log.timestamp).toLocaleString()}"`,
      ].join(",");
    });

    // UTF-8 BOM ensures Excel loads properly without character issues
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const dateSuffix = date ? `_${date}` : `_${new Date().toISOString().slice(0, 10)}`;
    const filename = `WorkMate_Attendance_Report${dateSuffix}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/scrap-old - Explicit 30-day (1-month) retention cycle scrap
router.post("/scrap-old", async (_req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.attendanceLog.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } },
    });

    res.json({
      success: true,
      scrappedCount: result.count,
      retentionPolicyDays: 30,
      cutoffDate: thirtyDaysAgo.toISOString(),
      message: `Successfully scrapped ${result.count} attendance records older than 30 days. New monthly cycle operating.`,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/attendance/clear (SuperAdmin maintenance)
router.delete("/", async (_req, res, next) => {
  try {
    const result = await prisma.attendanceLog.deleteMany({});
    res.json({ success: true, count: result.count, message: `Cleared ${result.count} attendance records.` });
  } catch (error) {
    next(error);
  }
});

export default router;
