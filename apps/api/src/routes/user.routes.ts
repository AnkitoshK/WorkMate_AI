import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

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

// POST /api/users/login (Authenticate user by email & password)
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
    const user = await prisma.user.findFirst({
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

    if (!user) {
      return res.status(404).json({
        error: `No user account found for "${email.trim()}". Please verify the email address or ask your SuperAdmin to create an account.`,
      });
    }

    // Verify hashed password
    if (user.password) {
      const isMatch = bcrypt.compareSync(password.trim(), user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: "Invalid password. Please check your credentials.",
        });
      }
    } else {
      // Fallback check if user hasn't had password hashed yet
      if (password.trim() !== "WorkMate@123") {
        return res.status(401).json({
          error: "Invalid password. Default initial password is WorkMate@123",
        });
      }
      // Auto-update to hashed password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: bcrypt.hashSync("WorkMate@123", 10) },
      });
    }

    // Shift Cooldown Check:
    // If user logged out recently, enforce 8 hours and 30 minutes shift cycle cooldown
    // (Exempt SUPER_ADMIN and ADMIN so operations and administrative overrides are unrestricted)
    if (user.lastLogoutAt && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      const cooldownMs = 8.5 * 60 * 60 * 1000; // 8 hours 30 minutes
      const elapsedMs = Date.now() - new Date(user.lastLogoutAt).getTime();
      if (elapsedMs < cooldownMs) {
        const remainingMs = cooldownMs - elapsedMs;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const allowAt = new Date(Date.now() + remainingMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return res.status(403).json({
          error: `Shift cooldown active: You logged out of your shift. Per 8h 30m shift cycle rules, you can log in again at ${allowAt} (remaining: ${remainingHours}h ${remainingMinutes}m).`,
          cooldownRemainingMs: remainingMs,
          canLoginAt: allowAt,
        });
      }
    }

    // Record login timestamp (attendance is explicitly marked by punch, not web login)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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

// POST /api/users/logout - Record logout timestamp for 8h 30m cooldown tracking
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
