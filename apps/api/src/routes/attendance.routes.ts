import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

const recordAttendanceSchema = z.object({
  userId: z.string().optional().nullable(),
  userName: z.string().trim().min(1),
  userEmail: z.string().trim().email(),
  role: z.string().trim().min(1),
  department: z.string().trim().optional().nullable(),
  clientType: z.string().trim().default("WEB_PORTAL"),
  action: z.string().trim().default("LOGIN"),
  status: z.string().trim().default("PRESENT"),
});

// GET /api/attendance - List attendance logs with filter & statistics
router.get("/", async (req, res, next) => {
  try {
    const { search, limit = "100", role, department } = req.query;
    const take = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const where: any = {};
    if (role && role !== "ALL") where.role = String(role);
    if (department && department !== "ALL") where.department = String(department);

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { userName: { contains: q, mode: "insensitive" } },
        { userEmail: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { role: { contains: q, mode: "insensitive" } },
        { clientType: { contains: q, mode: "insensitive" } },
      ];
    }

    const [logs, totalCount] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take,
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    // Calculate Today's Logins (from midnight local/UTC)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await prisma.attendanceLog.count({
      where: {
        timestamp: { gte: startOfToday },
      },
    });

    // Unique users active today
    const activeTodayLogs = await prisma.attendanceLog.findMany({
      where: {
        timestamp: { gte: startOfToday },
      },
      select: { userEmail: true },
      distinct: ["userEmail"],
    });

    res.json({
      logs,
      totalCount,
      todayCount,
      uniqueStaffToday: activeTodayLogs.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance - Record manual or session login attendance
router.post("/", async (req, res, next) => {
  const parsed = recordAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid attendance data", details: parsed.error.flatten() });
  }

  try {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const userAgent = (req.headers["user-agent"] as string) || "Web Browser";

    const log = await prisma.attendanceLog.create({
      data: {
        userId: parsed.data.userId || null,
        userName: parsed.data.userName,
        userEmail: parsed.data.userEmail.toLowerCase(),
        role: parsed.data.role,
        department: parsed.data.department || "Operations",
        clientType: parsed.data.clientType,
        action: parsed.data.action,
        status: parsed.data.status,
        ipAddress: clientIp,
        userAgent: userAgent.slice(0, 255),
      },
    });

    res.status(201).json(log);
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
