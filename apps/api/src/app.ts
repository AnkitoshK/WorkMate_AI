import cors from "cors";
import express from "express";
import { Prisma, PrismaClient, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const prisma = new PrismaClient();
export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "workmate-api" });
});

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  ownerId: z.string().min(1),
  priority: z.number().int().min(1).max(3).optional(),
  dueDate: z.string().datetime().optional()
});

const updateTaskSchema = createTaskSchema.omit({ ownerId: true }).partial().extend({
  status: z.nativeEnum(TaskStatus).optional()
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

app.get("/api/tasks", async (_req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

app.get("/api/tasks/:id", async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid task", details: parsed.error.flatten() });
  try {
    const { dueDate, ...data } = parsed.data;
    const task = await prisma.task.create({ data: { ...data, dueDate: dueDate ? new Date(dueDate) : undefined } });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid task update", details: parsed.error.flatten() });
  try {
    const { dueDate, ...data } = parsed.data;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { ...data, ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}) }
    });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return res.status(404).json({ error: "Task not found" });
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});
