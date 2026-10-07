import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/closed-tickets - List all closed tickets from ClosedTicket archive table
router.get("/", async (req, res, next) => {
  try {
    const { search, department, category } = req.query;
    const where: any = {};

    if (department && department !== "ALL") {
      where.department = String(department);
    }
    if (category && category !== "ALL") {
      where.category = String(category);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { resolutionNotes: { contains: q, mode: "insensitive" } },
        { reporterName: { contains: q, mode: "insensitive" } },
        { assigneeName: { contains: q, mode: "insensitive" } },
      ];
    }

    let closedTickets = await prisma.closedTicket.findMany({
      where,
      orderBy: { closedAt: "desc" },
    });

    // Fallback: If ClosedTicket table has fewer records than Issue table's CLOSED status, sync them
    const issueClosedCount = await prisma.issue.count({ where: { status: "CLOSED" } });
    if (closedTickets.length < issueClosedCount) {
      const closedIssues = await prisma.issue.findMany({
        where: { status: "CLOSED" },
        include: { reporter: true, assignee: true, serviceAsset: true },
      });

      for (const iss of closedIssues) {
        const createdTime = iss.createdAt.getTime();
        const closedTime = (iss.closedAt || iss.resolvedAt || iss.updatedAt).getTime();
        const durationMs = Math.max(0, closedTime - createdTime);
        const turnaroundHours = Math.round((durationMs / 3600000) * 10) / 10;
        const hours = Math.floor(durationMs / 3600000);
        const mins = Math.floor((durationMs % 3600000) / 60000);
        const durationStr = `${hours}h ${mins}m`;

        await prisma.closedTicket.upsert({
          where: { ticketNumber: iss.ticketNumber },
          update: {
            title: iss.title,
            description: iss.description,
            status: "CLOSED",
            category: iss.category,
            priority: iss.priority,
            department: iss.department,
            source: iss.source,
            affectedUrl: iss.affectedUrl,
            location: iss.location,
            resolutionNotes: iss.resolutionNotes || "Resolved per standard operations procedure",
            aiSummary: iss.aiSummary,
            aiRootCause: iss.aiRootCause || "N/A",
            reporterId: iss.reporter?.id,
            reporterName: iss.reporter?.name || "Unknown",
            reporterEmail: iss.reporter?.email || "",
            assigneeId: iss.assignee?.id,
            assigneeName: iss.assignee?.name || "Lead Engineer",
            assigneeEmail: iss.assignee?.email || "",
            serviceAssetName: iss.serviceAsset?.name || "Standard Asset",
            turnaroundDuration: durationStr,
            turnaroundHours,
            closedAt: iss.closedAt || iss.resolvedAt || iss.updatedAt,
          },
          create: {
            ticketNumber: iss.ticketNumber,
            originalIssueId: iss.id,
            title: iss.title,
            description: iss.description,
            status: "CLOSED",
            category: iss.category,
            priority: iss.priority,
            department: iss.department,
            source: iss.source,
            affectedUrl: iss.affectedUrl,
            location: iss.location,
            resolutionNotes: iss.resolutionNotes || "Resolved per standard operations procedure",
            aiSummary: iss.aiSummary,
            aiRootCause: iss.aiRootCause || "N/A",
            reporterId: iss.reporter?.id,
            reporterName: iss.reporter?.name || "Unknown",
            reporterEmail: iss.reporter?.email || "",
            assigneeId: iss.assignee?.id,
            assigneeName: iss.assignee?.name || "Lead Engineer",
            assigneeEmail: iss.assignee?.email || "",
            serviceAssetName: iss.serviceAsset?.name || "Standard Asset",
            turnaroundDuration: durationStr,
            turnaroundHours,
            closedAt: iss.closedAt || iss.resolvedAt || iss.updatedAt,
          },
        });
      }

      closedTickets = await prisma.closedTicket.findMany({
        where,
        orderBy: { closedAt: "desc" },
      });
    }

    res.json(closedTickets);
  } catch (error) {
    next(error);
  }
});

// GET /api/closed-tickets/export - Download full CSV/Excel report of closed tickets
router.get("/export", async (req, res, next) => {
  try {
    const { department, category } = req.query;
    const where: any = {};
    if (department && department !== "ALL") where.department = String(department);
    if (category && category !== "ALL") where.category = String(category);

    const closed = await prisma.closedTicket.findMany({
      where,
      orderBy: { closedAt: "desc" },
    });

    const headers = [
      "Ticket Number",
      "Title",
      "Category",
      "Priority",
      "Department",
      "Reporter",
      "Reporter Email",
      "Resolver / Assignee",
      "Created At",
      "Closed At",
      "Turnaround Duration",
      "Resolution Notes",
      "AI Diagnosis Root Cause",
      "Affected Asset",
    ];

    const rows = closed.map((iss) => {
      const created = new Date(iss.createdAt).toLocaleString();
      const closedDate = new Date(iss.closedAt).toLocaleString();
      const duration = iss.turnaroundDuration || (iss.turnaroundHours ? `${iss.turnaroundHours}h` : "N/A");

      return [
        `"TIK-${String(iss.ticketNumber).padStart(3, "0")}"`,
        `"${(iss.title || "").replace(/"/g, '""')}"`,
        `"${iss.category}"`,
        `"${iss.priority}"`,
        `"${(iss.department || "Operations").replace(/"/g, '""')}"`,
        `"${(iss.reporterName || "Unknown").replace(/"/g, '""')}"`,
        `"${(iss.reporterEmail || "").replace(/"/g, '""')}"`,
        `"${(iss.assigneeName || "Lead Engineer").replace(/"/g, '""')}"`,
        `"${created}"`,
        `"${closedDate}"`,
        `"${duration}"`,
        `"${(iss.resolutionNotes || "Resolved per standard procedure").replace(/"/g, '""')}"`,
        `"${(iss.aiRootCause || "N/A").replace(/"/g, '""')}"`,
        `"${(iss.serviceAssetName || "Unlinked").replace(/"/g, '""')}"`,
      ].join(",");
    });

    // UTF-8 BOM (\uFEFF) ensures Excel opens without encoding issues
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const filename = `WorkMate_Closed_Tickets_Report_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// POST /api/closed-tickets/sync - Manual SuperAdmin sync from Issue table
router.post("/sync", async (_req, res, next) => {
  try {
    const closedIssues = await prisma.issue.findMany({
      where: { status: "CLOSED" },
      include: { reporter: true, assignee: true, serviceAsset: true },
    });

    let count = 0;
    for (const iss of closedIssues) {
      const createdTime = iss.createdAt.getTime();
      const closedTime = (iss.closedAt || iss.resolvedAt || iss.updatedAt).getTime();
      const durationMs = Math.max(0, closedTime - createdTime);
      const turnaroundHours = Math.round((durationMs / 3600000) * 10) / 10;
      const hours = Math.floor(durationMs / 3600000);
      const mins = Math.floor((durationMs % 3600000) / 60000);
      const durationStr = `${hours}h ${mins}m`;

      await prisma.closedTicket.upsert({
        where: { ticketNumber: iss.ticketNumber },
        update: {
          title: iss.title,
          description: iss.description,
          status: "CLOSED",
          category: iss.category,
          priority: iss.priority,
          department: iss.department,
          source: iss.source,
          affectedUrl: iss.affectedUrl,
          location: iss.location,
          resolutionNotes: iss.resolutionNotes || "Resolved per standard operations procedure",
          aiSummary: iss.aiSummary,
          aiRootCause: iss.aiRootCause || "N/A",
          reporterId: iss.reporter?.id,
          reporterName: iss.reporter?.name || "Unknown",
          reporterEmail: iss.reporter?.email || "",
          assigneeId: iss.assignee?.id,
          assigneeName: iss.assignee?.name || "Lead Engineer",
          assigneeEmail: iss.assignee?.email || "",
          serviceAssetName: iss.serviceAsset?.name || "Standard Asset",
          turnaroundDuration: durationStr,
          turnaroundHours,
          closedAt: iss.closedAt || iss.resolvedAt || iss.updatedAt,
        },
        create: {
          ticketNumber: iss.ticketNumber,
          originalIssueId: iss.id,
          title: iss.title,
          description: iss.description,
          status: "CLOSED",
          category: iss.category,
          priority: iss.priority,
          department: iss.department,
          source: iss.source,
          affectedUrl: iss.affectedUrl,
          location: iss.location,
          resolutionNotes: iss.resolutionNotes || "Resolved per standard operations procedure",
          aiSummary: iss.aiSummary,
          aiRootCause: iss.aiRootCause || "N/A",
          reporterId: iss.reporter?.id,
          reporterName: iss.reporter?.name || "Unknown",
          reporterEmail: iss.reporter?.email || "",
          assigneeId: iss.assignee?.id,
          assigneeName: iss.assignee?.name || "Lead Engineer",
          assigneeEmail: iss.assignee?.email || "",
          serviceAssetName: iss.serviceAsset?.name || "Standard Asset",
          turnaroundDuration: durationStr,
          turnaroundHours,
          closedAt: iss.closedAt || iss.resolvedAt || iss.updatedAt,
        },
      });
      count++;
    }

    res.json({ success: true, syncedCount: count });
  } catch (error) {
    next(error);
  }
});

export default router;
