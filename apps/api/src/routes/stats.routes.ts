import { Router } from "express";
import { StatsService } from "../services/stats.service.js";

const router = Router();

// GET /api/stats
router.get("/", async (_req, res, next) => {
  try {
    const stats = await StatsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
