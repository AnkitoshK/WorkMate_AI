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
