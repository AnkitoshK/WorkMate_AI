import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { sendStyledExcelStream } from "../utils/excelExport.js";
import { formatTimeInTimezone, getZonedDateParts } from "../utils/timezone.js";
import { resolveIpLocation } from "../utils/ipGeo.js";

const router = Router();

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

// Helper: Format date as YYYY-MM-DD in user's timezone
function getTodayDateString(d = new Date(), preferredTimezone = "Asia/Kolkata"): string {
  return getZonedDateParts(d, preferredTimezone).dateString;
}

const punchSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  action: z.enum(["PUNCH_IN", "PUNCH_OUT"]),
  clientType: z.string().trim().default("WEB_PORTAL"),
  remarks: z.string().trim().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  location: z.string().trim().optional().nullable(),
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
    const clientTz = (req.headers["x-timezone"] || req.query.timeZone) as string || "Asia/Kolkata";
    const todayStr = getTodayDateString(new Date(), clientTz);
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

  const { userId, action, clientType, remarks, latitude, longitude, location } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Employee account not found" });
    }

    const clientTimezone = (req.headers["x-timezone"] || req.query.timeZone || req.body?.timeZone) as string || "Asia/Kolkata";
    const now = new Date();
    const zoned = getZonedDateParts(now, clientTimezone);
    const todayStr = zoned.dateString;

    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "Web Browser";

    // Resolve location: GPS coords from client -> cached user profile -> server IP lookup -> fallback
    let finalLat = latitude;
    let finalLng = longitude;
    let finalLoc = location;

    if (finalLat == null || finalLng == null) {
      if (user.lastLatitude != null && user.lastLongitude != null) {
        finalLat = user.lastLatitude;
        finalLng = user.lastLongitude;
        finalLoc = finalLoc || user.lastLocation || null;
      } else {
        const resolved = await resolveIpLocation(clientIp);
        if (resolved) {
          finalLat = resolved.latitude;
          finalLng = resolved.longitude;
          finalLoc = finalLoc || resolved.location;
        }
      }
    }

    if (action === "PUNCH_IN") {
      // Cooldown check: If employee logged out recently, enforce 1-hour cooldown
      // (Exempt SUPER_ADMIN and ADMIN for administrative flexibility)
      if (user.lastLogoutAt && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
        const cooldownMs = 1 * 60 * 60 * 1000; // 1 hour cooling period
        const elapsedMs = now.getTime() - new Date(user.lastLogoutAt).getTime();
        if (elapsedMs < cooldownMs) {
          const remainingMs = cooldownMs - elapsedMs;
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMins = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const clientTimezone = (req.headers["x-timezone"] || req.query.timeZone || req.body?.timeZone) as string | undefined;
          const targetDate = new Date(now.getTime() + remainingMs);
          const allowAt = formatTimeInTimezone(targetDate, clientTimezone);
          return res.status(403).json({
            error: `Shift cooldown active: You logged out of your shift. Per 1-hour cooling period rules, at ${allowAt} you are able to login and punch in attendance again (remaining: ${remainingHours > 0 ? `${remainingHours}h ` : ""}${remainingMins}m).`,
            cooldownRemainingMs: remainingMs,
            canPunchAt: allowAt,
            canLoginAt: allowAt,
            canPunchAtIso: targetDate.toISOString(),
            userId: user.id,
            userName: user.name,
          });
        }
      }

      // Fast single-query lookup for today's punches
      const todayLogs = await prisma.attendanceLog.findMany({
        where: {
          userId: user.id,
          shiftDate: todayStr,
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      });

      const existingTodayPunch = todayLogs.find((l) => l.action === "PUNCH_IN");
      const existingTodayPunchOut = todayLogs.find((l) => l.action === "PUNCH_OUT");
      const isSubsequentPunch = !!(existingTodayPunch || existingTodayPunchOut);

      // If user has already completed/marked shift today, they cannot mark regular attendance again directly;
      // Remarks are strictly required to record an additional/re-entry session!
      if (isSubsequentPunch) {
        if (!remarks || !remarks.trim()) {
          const reasonMsg = existingTodayPunchOut
            ? "Shift attendance was already completed and punched out for today. To log presence again, remarks/reason are required."
            : `You have already punched in for today's cycle at ${new Date(existingTodayPunch?.punchIn || existingTodayPunch?.timestamp || now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Remarks/reason are required to log an additional session.`;
          return res.status(400).json({
            error: reasonMsg,
            requiresRemarks: true,
            hasPunchedOutToday: !!existingTodayPunchOut,
          });
        }
      }

      // Calculate arrival status relative to 9:00 AM shift and 30-min buffer (up to 9:30 AM) in user's timezone
      const currentTotalMins = zoned.totalMins;
      const shiftStartMins = 9 * 60; // 9:00 AM = 540 mins
      const bufferEndMins = 9 * 60 + 30; // 9:30 AM = 570 mins

      let status = "ON_TIME";
      let calculatedArrivalRemarks = "";

      if (currentTotalMins <= bufferEndMins) {
        status = "ON_TIME";
        calculatedArrivalRemarks = currentTotalMins <= shiftStartMins
          ? "On-time arrival (9:00 AM Shift)"
          : "Relaxation buffer applied (Arrival between 9:00 AM - 9:30 AM)";
      } else {
        status = "LATE";
        const lateMins = currentTotalMins - shiftStartMins;
        const lH = Math.floor(lateMins / 60);
        const lM = lateMins % 60;
        calculatedArrivalRemarks = `Late arrival by ${lH > 0 ? `${lH}h ` : ""}${lM}m (Shift starts 9:00 AM)`;
      }

      let logRemarks = calculatedArrivalRemarks;
      let finalStatus = status;

      if (isSubsequentPunch && remarks?.trim()) {
        finalStatus = "RE_ENTRY";
        logRemarks = `[Re-Entry Remarks]: ${remarks.trim()}`;
      } else if (remarks?.trim()) {
        logRemarks = `${calculatedArrivalRemarks} [Note: ${remarks.trim()}]`;
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
          status: finalStatus,
          shiftDate: todayStr,
          punchIn: now,
          remarks: logRemarks,
          latitude: finalLat != null ? finalLat : null,
          longitude: finalLng != null ? finalLng : null,
          location: finalLoc || null,
          ipAddress: clientIp,
          userAgent: userAgent.slice(0, 255),
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastPunchIn: now,
          shiftStatus: "ON_DUTY",
          ...(finalLat != null ? { lastLatitude: finalLat } : {}),
          ...(finalLng != null ? { lastLongitude: finalLng } : {}),
          ...(finalLoc ? { lastLocation: finalLoc } : {}),
        },
      });

      return res.status(201).json({
        success: true,
        message: isSubsequentPunch
          ? `Additional attendance session recorded with remarks for ${user.name}.`
          : `Punch-in recorded successfully for ${user.name}. ${calculatedArrivalRemarks}`,
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

      // Shift is 8 hours 30 minutes (8.5 hrs) or punching out at/after 5:30 PM (17:30 in user timezone)
      const isShiftCompleted = workHours >= 8.5 || (zoned.hour >= 17 && zoned.minute >= 30) || zoned.hour >= 18;
      const status = isShiftCompleted ? "COMPLETED" : workHours >= 4.25 ? "HALF_DAY" : "EARLY_LOGOUT";
      const customNotes = remarks && remarks.trim() ? ` [Notes: ${remarks.trim()}]` : "";
      const punchOutRemarks = `Punched out at ${zoned.timeString}. Total Shift Duration: ${hours}h ${minutes}m. Status: ${status}.${customNotes}`;

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
          remarks: punchOutRemarks,
          latitude: finalLat != null ? finalLat : null,
          longitude: finalLng != null ? finalLng : null,
          location: finalLoc || null,
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
          ...(finalLat != null ? { lastLatitude: finalLat } : {}),
          ...(finalLng != null ? { lastLongitude: finalLng } : {}),
          ...(finalLoc ? { lastLocation: finalLoc } : {}),
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

    // Pre-calculate shift punch pairings (to correlate punch in & out across records on same date)
    const shiftPunchMap = new Map<string, { punchIn?: Date; punchOut?: Date; workHours?: number }>();
    logs.forEach((r) => {
      const key = `${r.userEmail || r.userId}_${r.shiftDate || new Date(r.timestamp).toISOString().slice(0, 10)}`;
      const existing = shiftPunchMap.get(key) || {};
      if (r.punchIn) {
        const pIn = new Date(r.punchIn);
        if (!existing.punchIn || pIn < existing.punchIn) existing.punchIn = pIn;
      } else if (r.action === "PUNCH_IN") {
        const pIn = new Date(r.timestamp);
        if (!existing.punchIn || pIn < existing.punchIn) existing.punchIn = pIn;
      }
      if (r.punchOut) {
        const pOut = new Date(r.punchOut);
        if (!existing.punchOut || pOut > existing.punchOut) existing.punchOut = pOut;
      } else if (r.action === "PUNCH_OUT") {
        const pOut = new Date(r.timestamp);
        if (!existing.punchOut || pOut > existing.punchOut) existing.punchOut = pOut;
      }
      if (r.workHours && (!existing.workHours || r.workHours > existing.workHours)) {
        existing.workHours = r.workHours;
      }
      shiftPunchMap.set(key, existing);
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
      "Total Time (Punch In - Punch Out)",
      "Total Hours (Decimal Calculation)",
      "Latitude",
      "Longitude",
      "GPS Coordinates",
      "Punch Location / Nearby Address",
      "Google Maps Link",
      "Shift Remarks",
      "Client Type",
      "Timestamp",
    ];

    const rows = logs.map((log) => {
      const key = `${log.userEmail || log.userId}_${log.shiftDate || new Date(log.timestamp).toISOString().slice(0, 10)}`;
      const shiftData = shiftPunchMap.get(key);

      const effectivePunchIn = log.punchIn ? new Date(log.punchIn) : shiftData?.punchIn;
      const effectivePunchOut = log.punchOut ? new Date(log.punchOut) : shiftData?.punchOut;

      const punchInStr = effectivePunchIn
        ? effectivePunchIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : (log.action === "PUNCH_IN" ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "N/A");

      const punchOutStr = effectivePunchOut
        ? effectivePunchOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : (log.action === "PUNCH_OUT" ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "N/A");

      let totalTimeStr = "N/A";
      let decimalHours = "0.00";

      if (effectivePunchIn && effectivePunchOut) {
        const diffMs = Math.max(0, effectivePunchOut.getTime() - effectivePunchIn.getTime());
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalTimeStr = `${hours}h ${mins}m`;
        decimalHours = (diffMs / 3600000).toFixed(2);
      } else if (log.workHours != null && Number(log.workHours) > 0) {
        const totalMinutes = Math.round(Number(log.workHours) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalTimeStr = `${hours}h ${mins}m`;
        decimalHours = Number(log.workHours).toFixed(2);
      } else if (shiftData?.workHours != null && Number(shiftData.workHours) > 0) {
        const totalMinutes = Math.round(Number(shiftData.workHours) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalTimeStr = `${hours}h ${mins}m`;
        decimalHours = Number(shiftData.workHours).toFixed(2);
      } else if (effectivePunchIn && !effectivePunchOut) {
        totalTimeStr = "In Progress (On Duty)";
        decimalHours = "0.00";
      }

      const latStr = log.latitude != null ? log.latitude.toFixed(6) : "N/A";
      const lngStr = log.longitude != null ? log.longitude.toFixed(6) : "N/A";
      const coordsStr = log.latitude != null && log.longitude != null ? `${log.latitude.toFixed(6)}, ${log.longitude.toFixed(6)}` : "N/A";
      const locationStr = log.location ? log.location : "N/A";
      const mapsLink = log.latitude != null && log.longitude != null ? `https://www.google.com/maps?q=${log.latitude},${log.longitude}` : "N/A";

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
        `"${totalTimeStr}"`,
        `${decimalHours}`,
        `"${latStr}"`,
        `"${lngStr}"`,
        `"${coordsStr}"`,
        `"${locationStr.replace(/"/g, '""')}"`,
        `"${mapsLink}"`,
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

// GET /api/attendance/export-excel - Styled Excel (.xlsx) export with colorful formatted headings
router.get("/export-excel", async (req, res, next) => {
  try {
    const { userId, date } = req.query as { userId?: string; date?: string };

    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (date && typeof date === "string" && date.trim()) {
      where.shiftDate = date.trim();
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const shiftPunchMap = new Map<string, { punchIn?: Date; punchOut?: Date; workHours?: number }>();
    logs.forEach((r) => {
      const key = `${r.userEmail || r.userId}_${r.shiftDate || new Date(r.timestamp).toISOString().slice(0, 10)}`;
      const existing = shiftPunchMap.get(key) || {};
      if (r.punchIn) {
        const pIn = new Date(r.punchIn);
        if (!existing.punchIn || pIn < existing.punchIn) existing.punchIn = pIn;
      } else if (r.action === "PUNCH_IN") {
        const pIn = new Date(r.timestamp);
        if (!existing.punchIn || pIn < existing.punchIn) existing.punchIn = pIn;
      }
      if (r.punchOut) {
        const pOut = new Date(r.punchOut);
        if (!existing.punchOut || pOut > existing.punchOut) existing.punchOut = pOut;
      } else if (r.action === "PUNCH_OUT") {
        const pOut = new Date(r.timestamp);
        if (!existing.punchOut || pOut > existing.punchOut) existing.punchOut = pOut;
      }
      if (r.workHours && (!existing.workHours || r.workHours > existing.workHours)) {
        existing.workHours = r.workHours;
      }
      shiftPunchMap.set(key, existing);
    });

    const columns = [
      { header: "Log ID", key: "id", width: 28 },
      { header: "Shift Date", key: "shiftDate", width: 14 },
      { header: "Staff Member", key: "userName", width: 22 },
      { header: "Email Address", key: "userEmail", width: 26 },
      { header: "Role", key: "role", width: 16 },
      { header: "Department", key: "department", width: 22 },
      { header: "Action", key: "action", width: 16 },
      { header: "Shift Status", key: "status", width: 18 },
      { header: "Punch In Time", key: "punchInStr", width: 16 },
      { header: "Punch Out Time", key: "punchOutStr", width: 16 },
      { header: "Total Shift Duration", key: "totalTimeStr", width: 20 },
      { header: "Total Hours (Decimal)", key: "decimalHours", width: 20 },
      { header: "Latitude", key: "latitude", width: 16 },
      { header: "Longitude", key: "longitude", width: 16 },
      { header: "GPS Coordinates", key: "gpsCoordinates", width: 24 },
      { header: "Punch Location / Nearby Address", key: "location", width: 36 },
      { header: "Google Maps Link", key: "mapsLink", width: 38 },
      { header: "Shift Remarks", key: "remarks", width: 28 },
      { header: "Terminal Client", key: "clientType", width: 16 },
      { header: "Exact Timestamp", key: "timestampStr", width: 22 },
    ];

    const data = logs.map((log) => {
      const key = `${log.userEmail || log.userId}_${log.shiftDate || new Date(log.timestamp).toISOString().slice(0, 10)}`;
      const shiftData = shiftPunchMap.get(key);

      const effectivePunchIn = log.punchIn ? new Date(log.punchIn) : shiftData?.punchIn;
      const effectivePunchOut = log.punchOut ? new Date(log.punchOut) : shiftData?.punchOut;

      const punchInStr = effectivePunchIn
        ? effectivePunchIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : (log.action === "PUNCH_IN" ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "N/A");

      const punchOutStr = effectivePunchOut
        ? effectivePunchOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : (log.action === "PUNCH_OUT" ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "N/A");

      let totalTimeStr = "N/A";
      let decimalHours: number | string = 0.00;

      if (effectivePunchIn && effectivePunchOut) {
        const diffMs = Math.max(0, effectivePunchOut.getTime() - effectivePunchIn.getTime());
        const totalMinutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalTimeStr = `${hours}h ${mins}m`;
        decimalHours = parseFloat((diffMs / 3600000).toFixed(2));
      } else if (log.workHours != null && Number(log.workHours) > 0) {
        const totalMinutes = Math.round(Number(log.workHours) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalTimeStr = `${hours}h ${mins}m`;
        decimalHours = parseFloat(Number(log.workHours).toFixed(2));
      } else if (shiftData?.workHours != null && Number(shiftData.workHours) > 0) {
        const totalMinutes = Math.round(Number(shiftData.workHours) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalTimeStr = `${hours}h ${mins}m`;
        decimalHours = parseFloat(Number(shiftData.workHours).toFixed(2));
      } else if (effectivePunchIn && !effectivePunchOut) {
        totalTimeStr = "In Progress (On Duty)";
        decimalHours = 0.00;
      }

      const coordsStr = log.latitude != null && log.longitude != null ? `${log.latitude.toFixed(6)}, ${log.longitude.toFixed(6)}` : "N/A";
      const mapsLink = log.latitude != null && log.longitude != null ? `https://www.google.com/maps?q=${log.latitude},${log.longitude}` : "N/A";

      return {
        id: log.id,
        shiftDate: log.shiftDate || new Date(log.timestamp).toISOString().slice(0, 10),
        userName: log.userName || "",
        userEmail: log.userEmail || "",
        role: log.role,
        department: log.department || "Operations",
        action: log.action,
        status: log.status,
        punchInStr,
        punchOutStr,
        totalTimeStr,
        decimalHours,
        latitude: log.latitude != null ? log.latitude.toFixed(6) : "N/A",
        longitude: log.longitude != null ? log.longitude.toFixed(6) : "N/A",
        gpsCoordinates: coordsStr,
        location: log.location || "N/A",
        mapsLink,
        remarks: log.remarks || "",
        clientType: log.clientType,
        timestampStr: new Date(log.timestamp).toLocaleString(),
      };
    });

    const dateSuffix = date ? `_${date}` : `_${new Date().toISOString().slice(0, 10)}`;
    const filename = `WorkMate_Attendance_Report${dateSuffix}.xlsx`;

    await sendStyledExcelStream({
      res,
      filename,
      sheetName: "Attendance_Records",
      columns,
      data,
      theme: "emerald",
      statusColumnKey: "status",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/scrap-old - Retention cycle scrap (mode: "all" to clear completely or "30days")
router.post("/scrap-old", async (req, res, next) => {
  try {
    const mode = (req.query.mode || req.body?.mode || "30days") as string;
    let resultCount = 0;

    if (mode === "all") {
      const result = await prisma.attendanceLog.deleteMany({});
      resultCount = result.count;
      // Reset user on-duty stamps for a clean slate
      await prisma.user.updateMany({
        data: {
          shiftStatus: "OFF_DUTY",
          lastPunchIn: null,
          lastPunchOut: null,
        },
      });

      return res.json({
        success: true,
        mode: "all",
        scrappedCount: resultCount,
        message: `Successfully scrapped all ${resultCount} attendance records from database, UI, and Excel reports. Clean slate active.`,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.attendanceLog.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } },
    });

    res.json({
      success: true,
      mode: "30days",
      scrappedCount: result.count,
      retentionPolicyDays: 30,
      cutoffDate: thirtyDaysAgo.toISOString(),
      message: `Successfully scrapped ${result.count} attendance records older than 30 days. New monthly cycle operating.`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/clear-all - Instant purge of all attendance logs (UI & Excel clean slate)
router.post("/clear-all", async (_req, res, next) => {
  try {
    const result = await prisma.attendanceLog.deleteMany({});
    await prisma.user.updateMany({
      data: {
        shiftStatus: "OFF_DUTY",
        lastPunchIn: null,
        lastPunchOut: null,
      },
    });

    res.json({
      success: true,
      scrappedCount: result.count,
      message: `Scrapped and wiped all ${result.count} attendance records. Table and Excel exports are now completely clear.`,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/attendance (SuperAdmin maintenance)
router.delete("/", async (_req, res, next) => {
  try {
    const result = await prisma.attendanceLog.deleteMany({});
    await prisma.user.updateMany({
      data: {
        shiftStatus: "OFF_DUTY",
        lastPunchIn: null,
        lastPunchOut: null,
      },
    });
    res.json({ success: true, count: result.count, message: `Cleared ${result.count} attendance records.` });
  } catch (error) {
    next(error);
  }
});

export default router;
