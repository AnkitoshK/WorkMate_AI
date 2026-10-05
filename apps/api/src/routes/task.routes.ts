import { Router } from "express";
import { z } from "zod";
import { TaskService } from "../services/task.service.js";
import { TaskStatus } from "@prisma/client";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  ownerId: z.string().min(1),
  priority: z.number().int().min(1).max(4).optional(),
  category: z.string().trim().max(100).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  issueId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  category: z.string().trim().max(100).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  issueId: z.string().optional().nullable(),
  ownerId: z.string().min(1).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

// GET /api/tasks
router.get("/", async (req, res, next) => {
  try {
    const { status, priority, ownerId, issueId, search } = req.query;
    const tasks = await TaskService.listTasks({
      status: status ? (status as TaskStatus) : undefined,
      priority: priority ? parseInt(String(priority), 10) : undefined,
      ownerId: ownerId ? String(ownerId) : undefined,
      issueId: issueId ? String(issueId) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req, res, next) => {
  try {
    const task = await TaskService.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks
router.post("/", async (req, res, next) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid task data", details: parsed.error.flatten() });
  }

  try {
    const { dueDate, ...rest } = parsed.data;
    const task = await TaskService.createTask({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      issueId: rest.issueId || undefined,
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res, next) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid task update", details: parsed.error.flatten() });
  }

  try {
    const { dueDate, ...rest } = parsed.data;
    const task = await TaskService.updateTask(req.params.id, {
      ...rest,
      dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
    });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await TaskService.deleteTask(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
