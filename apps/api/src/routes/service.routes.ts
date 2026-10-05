import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(50),
  type: z.enum(["WEB_APP", "MOBILE_APP", "API_SERVICE", "CLOUD_INFRA", "DATABASE", "HARDWARE", "FACILITY"]),
  department: z.string().trim().min(2).max(100),
  environment: z.enum(["PRODUCTION", "STAGING", "ON_PREMISE"]).optional(),
  slaTargetMins: z.number().int().min(5).max(1440).optional(),
  urlOrLocation: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
});

const updateServiceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z.string().trim().min(2).max(50).optional(),
  type: z.enum(["WEB_APP", "MOBILE_APP", "API_SERVICE", "CLOUD_INFRA", "DATABASE", "HARDWARE", "FACILITY"]).optional(),
  department: z.string().trim().min(2).max(100).optional(),
  environment: z.enum(["PRODUCTION", "STAGING", "ON_PREMISE"]).optional(),
  healthStatus: z.enum(["OPERATIONAL", "DEGRADED", "OUTAGE"]).optional(),
  slaTargetMins: z.number().int().min(5).max(1440).optional(),
  urlOrLocation: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});

// GET /api/services
router.get("/", async (_req, res, next) => {
  try {
    const services = await prisma.serviceAsset.findMany({
      include: {
        _count: {
          select: {
            issues: {
              where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const mapped = services.map((s) => ({
      ...s,
      activeIncidents: s._count.issues,
    }));

    res.json(mapped);
  } catch (error) {
    next(error);
  }
});

// POST /api/services (Add project/service)
router.post("/", async (req, res, next) => {
  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid application / service payload", details: parsed.error.flatten() });
  }

  try {
    const service = await prisma.serviceAsset.create({
      data: parsed.data,
    });
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/services/:id (Rename or update project/service)
router.patch("/:id", async (req, res, next) => {
  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid application / service payload", details: parsed.error.flatten() });
  }

  try {
    const updated = await prisma.serviceAsset.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/services/:id (Delete project/service)
router.delete("/:id", async (req, res, next) => {
  try {
    await prisma.issue.updateMany({
      where: { serviceAssetId: req.params.id },
      data: { serviceAssetId: null },
    });
    await prisma.serviceAsset.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
