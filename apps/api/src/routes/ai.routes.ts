import { Router } from "express";
import { z } from "zod";
import { AiService } from "../services/ai.service.js";
import { IssueService } from "../services/issue.service.js";
import { TaskService } from "../services/task.service.js";

const router = Router();

const triageReqSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().min(3),
  category: z.string().optional(),
  location: z.string().optional(),
});

const suggestActionReqSchema = z.object({
  title: z.string().trim().min(3),
  context: z.string().optional(),
});

// POST /api/ai/triage
router.post("/triage", async (req, res, next) => {
  const parsed = triageReqSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid triage payload", details: parsed.error.flatten() });
  }

  try {
    const result = await AiService.triageIssue(
      parsed.data.title,
      parsed.data.description,
      parsed.data.category,
      parsed.data.location
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/shift-summary
router.post("/shift-summary", async (_req, res, next) => {
  try {
    const [issues, tasks] = await Promise.all([
      IssueService.listIssues(),
      TaskService.listTasks(),
    ]);

    const summary = await AiService.generateShiftSummary(issues, tasks);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/suggest-action
router.post("/suggest-action", async (req, res, next) => {
  const parsed = suggestActionReqSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid action request", details: parsed.error.flatten() });
  }

  try {
    const plan = await AiService.suggestNextAction(parsed.data.title, parsed.data.context);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/query - Interactive Technical Assistant & Deep Explanations
router.post("/query", async (req, res, next) => {
  const { query, context } = req.body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Please provide a query or technical question" });
  }

  try {
    const response = await AiService.answerUserQuery(query.trim(), context);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
