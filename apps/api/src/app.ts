import "dotenv/config";
import cors from "cors";
import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";

import issueRoutes from "./routes/issue.routes.js";
import taskRoutes from "./routes/task.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import userRoutes from "./routes/user.routes.js";
import serviceRoutes from "./routes/service.routes.js";

export const prisma = new PrismaClient();
export const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "workmate-api", version: "1.0.0" });
});
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "workmate-api", version: "1.0.0" });
});

// Modular API Routes
app.use("/api/issues", issueRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/services", serviceRoutes);


// Centralized Error Handling Middleware
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must contain valid JSON" });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return res.status(404).json({ error: "Record not found" });
    if (error.code === "P2003") return res.status(400).json({ error: "Referenced foreign entity does not exist" });
    if (error.code === "P2002") return res.status(409).json({ error: "A record with unique constraint violation already exists" });
    if (["P1001", "P1002", "P2024"].includes(error.code)) {
      return res.status(503).json({ error: "Database is temporarily unavailable. Wait a moment, then try again." });
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return res.status(503).json({ error: "Database connection failed. Check database configuration and network connectivity." });
  }

  console.error("API Unhandled Error:", error);
  res.status(500).json({
    error: error instanceof Error ? error.message : "Internal server error",
  });
});
