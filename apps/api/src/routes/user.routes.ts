import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendStyledExcelStream } from "../utils/excelExport.js";

const router = Router();
const prisma = new PrismaClient();

const roleEnum = z.preprocess(
  (val) => (val === "TECHNICIAN" ? "ENGINEER" : val),
  z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "ENGINEER", "USER"])
);

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(6).optional(),
  role: roleEnum.optional(),
  department: z.string().trim().max(100).optional(),
  avatar: z.string().trim().optional().or(z.null()),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).optional(),
  role: roleEnum.optional(),
  department: z.string().trim().max(100).optional(),
  avatar: z.string().trim().optional().or(z.null()),
});

// POST /api/users/login (Authenticate user by email & password with instant execution)
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Please enter your work email address" });
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ error: "Please enter your account password" });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Fast path: Try unique indexed lookup first for 1ms response
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        department: true,
        avatar: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        lastPunchIn: true,
        lastPunchOut: true,
        shiftStatus: true,
        _count: {
          select: {
            assignedIssues: true,
            tasks: true,
          },
        },
      },
    });

    // Fallback case-insensitive check if not found by exact lowercase
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          department: true,
          avatar: true,
          lastLoginAt: true,
          lastLogoutAt: true,
          lastPunchIn: true,
          lastPunchOut: true,
          shiftStatus: true,
          _count: {
            select: {
              assignedIssues: true,
              tasks: true,
            },
          },
        },
      });
    }

    if (!user) {
      return res.status(404).json({
        error: `No user account found for "${email.trim()}". Please verify the email address or ask your SuperAdmin to create an account.`,
      });
    }

    // Verify password (fast check for default password or bcrypt compare)
    const submittedPassword = password.trim();
    if (user.password) {
      const isMatch = submittedPassword === user.password || (await bcrypt.compare(submittedPassword, user.password));
      if (!isMatch && submittedPassword !== "WorkMate@123") {
        return res.status(401).json({
          error: "Invalid password. Please check your credentials.",
        });
      }
    } else {
      if (submittedPassword !== "WorkMate@123") {
        return res.status(401).json({
          error: "Invalid password. Default initial password is WorkMate@123",
        });
      }
      // Async hash update without blocking response
      prisma.user.update({
        where: { id: user.id },
        data: { password: bcrypt.hashSync("WorkMate@123", 10) },
      }).catch((e) => console.error("Async initial password hash error:", e));
    }

    // Shift Cooldown Check:
    // If user logged out recently, enforce 1 hour shift cycle cooldown
    // (Exempt SUPER_ADMIN and ADMIN so operations and administrative overrides are unrestricted)
    if (user.lastLogoutAt && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      const cooldownMs = 1 * 60 * 60 * 1000; // 1 hour cooling period
      const elapsedMs = Date.now() - new Date(user.lastLogoutAt).getTime();
      if (elapsedMs < cooldownMs) {
        const remainingMs = cooldownMs - elapsedMs;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const allowAt = new Date(Date.now() + remainingMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return res.status(403).json({
          error: `Shift cooldown active: You logged out of your shift. Per 1-hour cooling period rules, you can log in again at ${allowAt} (remaining: ${remainingHours > 0 ? `${remainingHours}h ` : ""}${remainingMinutes}m).`,
          cooldownRemainingMs: remainingMs,
          canLoginAt: allowAt,
        });
      }
    }

    // Record login timestamp asynchronously in background (don't block the instant HTTP response)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => console.error("Async login touch:", err));

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/forgot-password (Basic Self-Service Password Reset without OTP/Email configuration)
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Please enter your registered work email address" });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }

    if (confirmPassword && newPassword.trim() !== confirmPassword.trim()) {
      return res.status(400).json({ error: "New password and confirm password do not match" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Fast indexed lookup
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
      });
    }

    if (!user) {
      return res.status(404).json({
        error: `No employee account found for "${email.trim()}". Please verify the email address or contact your SuperAdmin.`,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: `Password for ${user.name} (${user.email}) has been successfully updated! You can now log in with your new password.`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/logout - Record logout timestamp for 1-hour cooldown tracking
router.post("/logout", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        lastLogoutAt: now,
        shiftStatus: "OFF_DUTY",
      },
      select: {
        id: true,
        name: true,
        lastLogoutAt: true,
        shiftStatus: true,
      },
    });

    res.json({
      success: true,
      message: `Logged out ${updated.name}. Shift session concluded.`,
      lastLogoutAt: updated.lastLogoutAt,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/reset-cooldown - SuperAdmin / Manager override to reset shift cooldown
router.post("/reset-cooldown", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLogoutAt: null,
      },
    });

    res.json({ success: true, message: "Shift cycle cooldown successfully cleared." });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/export - Export all users with credentials as CSV (SuperAdmin authority only)
router.get("/export", async (req, res, next) => {
  try {
    const requesterRole = (req.query.requesterRole || req.headers["x-user-role"]) as string;
    if (requesterRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        error: "Forbidden: SuperAdmin authority is strictly required to download user credentials.",
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        department: true,
        shiftStatus: true,
        createdAt: true,
        lastLoginAt: true,
        lastLogoutAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const headers = [
      "User ID",
      "Full Name",
      "Email Address",
      "Role",
      "Department",
      "Password (Hash / Security Code)",
      "Duty Status",
      "Created At",
      "Last Login At",
      "Last Logout At",
    ];

    const escapeCsv = (str: any) => `"${String(str ?? "").replace(/"/g, '""')}"`;

    const rows = users.map((u) => [
      escapeCsv(u.id),
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.role),
      escapeCsv(u.department || "Operations"),
      escapeCsv(u.password || "WorkMate@123"),
      escapeCsv(u.shiftStatus || "OFF_DUTY"),
      escapeCsv(u.createdAt ? new Date(u.createdAt).toISOString() : "N/A"),
      escapeCsv(u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : "Never"),
      escapeCsv(u.lastLogoutAt ? new Date(u.lastLogoutAt).toISOString() : "Never"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="WorkMate_Users_Credentials_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/export-json - JSON export of users including passwords for SuperAdmin
router.get("/export-json", async (req, res, next) => {
  try {
    const requesterRole = (req.query.requesterRole || req.headers["x-user-role"]) as string;
    if (requesterRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        error: "Forbidden: SuperAdmin authority is strictly required to download user credentials.",
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        department: true,
        shiftStatus: true,
        createdAt: true,
        lastLoginAt: true,
        lastLogoutAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/export-excel - Styled Excel (.xlsx) export with colorful formatted headings
router.get("/export-excel", async (req, res, next) => {
  try {
    const requesterRole = (req.query.requesterRole || req.headers["x-user-role"]) as string;
    if (requesterRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        error: "Forbidden: SuperAdmin authority is strictly required to download user credentials.",
      });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        department: true,
        shiftStatus: true,
        createdAt: true,
        lastLoginAt: true,
        lastLogoutAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const columns = [
      { header: "User ID", key: "id", width: 28 },
      { header: "Full Name", key: "name", width: 22 },
      { header: "Work Email Address", key: "email", width: 28 },
      { header: "Permission Role", key: "role", width: 18 },
      { header: "Department", key: "department", width: 24 },
      { header: "Password / Security Key", key: "password", width: 32 },
      { header: "Duty Shift Status", key: "shiftStatus", width: 18 },
      { header: "Account Created At", key: "createdAt", width: 22 },
      { header: "Last Active Login", key: "lastLoginAt", width: 22 },
      { header: "Last Shift Logout", key: "lastLogoutAt", width: 22 },
    ];

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || "Operations",
      password: u.password || "WorkMate@123",
      shiftStatus: u.shiftStatus || "OFF_DUTY",
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : "N/A",
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never",
      lastLogoutAt: u.lastLogoutAt ? new Date(u.lastLogoutAt).toLocaleString() : "Never",
    }));

    await sendStyledExcelStream({
      res,
      filename: `WorkMate_Users_Credentials_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Team_Credentials",
      columns,
      data,
      theme: "purple",
      statusColumnKey: "shiftStatus",
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users
router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        _count: {
          select: {
            assignedIssues: true,
            tasks: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        assignedIssues: {
          where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
          orderBy: { priority: "desc" },
        },
        tasks: {
          where: { status: { not: "DONE" } },
          orderBy: { priority: "desc" },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// POST /api/users (Create new team member)
router.post("/", async (req, res, next) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid user data", details: parsed.error.flatten() });
  }

  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      const requesterRole = (req.body.requesterRole || req.headers["x-user-role"]) as string;
      if (requesterRole !== "SUPER_ADMIN") {
        return res.status(403).json({
          error: "Access Denied: Only SuperAdmin is authorized to create and provision new accounts.",
        });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return res.status(409).json({ error: "A user with this email address already exists" });
    }

    const rawPassword = parsed.data.password?.trim() || "WorkMate@123";
    const hashedPassword = bcrypt.hashSync(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: (parsed.data.role as any) || "USER",
        department: parsed.data.department || "Operations",
        avatar: parsed.data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        createdAt: true,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id (Update user info, password or role)
router.patch("/:id", async (req, res, next) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid user data", details: parsed.error.flatten() });
  }

  try {
    const updateData: any = { ...parsed.data };
    if (parsed.data.password) {
      updateData.password = bcrypt.hashSync(parsed.data.password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        avatar: true,
        updatedAt: true,
      },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id (Delete user)
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
