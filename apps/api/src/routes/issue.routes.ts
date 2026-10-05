import { Router } from "express";
import { z } from "zod";
import { IssueService } from "../services/issue.service.js";
import { IssueStatus, IssuePriority, IssueCategory } from "@prisma/client";

const router = Router();

const emptyToNull = z
  .union([z.string().trim(), z.null(), z.undefined()])
  .transform((v) => (v === "" || v === undefined ? null : v))
  .optional()
  .nullable();

const createIssueSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().min(3, "Description must be at least 3 characters").max(10000),
  priority: z.nativeEnum(IssuePriority).optional(),
  category: z.nativeEnum(IssueCategory).optional(),
  department: emptyToNull,
  serviceAssetId: emptyToNull,
  affectedUrl: emptyToNull,
  source: z.string().trim().max(50).optional(),
  location: emptyToNull,
  reporterId: z.string().min(1, "Reporter ID is required"),
  assigneeId: emptyToNull,
  runAiTriage: z.boolean().optional(),
});

const updateIssueSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(5).max(10000).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  category: z.nativeEnum(IssueCategory).optional(),
  department: z.string().trim().max(100).optional().nullable(),
  serviceAssetId: z.string().optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  resolutionNotes: z.string().trim().max(4000).optional().nullable(),
});

const commentSchema = z.object({
  content: z.string().trim().min(1).max(3000),
  authorId: z.string().min(1),
  isAiGenerated: z.boolean().optional(),
});

// GET /api/issues
router.get("/", async (req, res, next) => {
  try {
    const { status, priority, category, department, serviceAssetId, assigneeId, reporterId, search } = req.query;
    const issues = await IssueService.listIssues({
      status: status ? (status as IssueStatus) : undefined,
      priority: priority ? (priority as IssuePriority) : undefined,
      category: category ? (category as IssueCategory) : undefined,
      department: department ? String(department) : undefined,
      serviceAssetId: serviceAssetId ? String(serviceAssetId) : undefined,
      assigneeId: assigneeId ? String(assigneeId) : undefined,
      reporterId: reporterId ? String(reporterId) : undefined,
      search: search ? String(search) : undefined,
    });
    res.json(issues);

  } catch (error) {
    next(error);
  }
});

// GET /api/issues/:id
router.get("/:id", async (req, res, next) => {
  try {
    const issue = await IssueService.getIssueById(req.params.id);
    if (!issue) return res.status(404).json({ error: "Ticket not found" });
    res.json(issue);
  } catch (error) {
    next(error);
  }
});

// POST /api/issues
router.post("/", async (req, res, next) => {
  console.log("📥 [POST /api/issues] Received ticket creation payload:", req.body);
  const parsed = createIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("❌ [POST /api/issues] Validation failed:", parsed.error.flatten());
    return res.status(400).json({ error: "Invalid ticket data", details: parsed.error.flatten() });
  }

  try {
    const issue = await IssueService.createIssue({
      ...parsed.data,
      assigneeId: parsed.data.assigneeId || undefined,
    });
    console.log("✅ [POST /api/issues] Successfully created ticket #" + issue.ticketNumber);
    res.status(201).json(issue);
  } catch (error) {
    console.error("❌ [POST /api/issues] Error in IssueService.createIssue:", error);
    next(error);
  }
});

// PATCH /api/issues/:id
router.patch("/:id", async (req, res, next) => {
  const parsed = updateIssueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid ticket update", details: parsed.error.flatten() });
  }

  try {
    const issue = await IssueService.updateIssue(req.params.id, parsed.data);
    res.json(issue);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/issues/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await IssueService.deleteIssue(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// DELETE /api/issues (Purge all tickets)
router.delete("/", async (_req, res, next) => {
  try {
    const result = await IssueService.deleteAllIssues();
    res.json({ success: true, count: result.count, message: `Deleted ${result.count} tickets successfully.` });
  } catch (error) {
    next(error);
  }
});

// POST /api/issues/:id/comments
router.post("/:id/comments", async (req, res, next) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid comment", details: parsed.error.flatten() });
  }

  try {
    const comment = await IssueService.addComment(
      req.params.id,
      parsed.data.authorId,
      parsed.data.content,
      parsed.data.isAiGenerated
    );
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// POST /api/issues/:id/ai-triage
router.post("/:id/ai-triage", async (req, res, next) => {
  try {
    const updated = await IssueService.runAiTriageOnIssue(req.params.id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
