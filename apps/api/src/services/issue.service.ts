import { PrismaClient, IssueStatus, IssuePriority, IssueCategory } from "@prisma/client";
import { AiService } from "./ai.service.js";

const prisma = new PrismaClient();

export interface IssueFilter {
  status?: IssueStatus;
  priority?: IssuePriority;
  category?: IssueCategory;
  department?: string;
  serviceAssetId?: string;
  assigneeId?: string;
  reporterId?: string;
  search?: string;
}

export class IssueService {
  static async listIssues(filters?: IssueFilter) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.department) where.department = filters.department;
    if (filters?.serviceAssetId) where.serviceAssetId = filters.serviceAssetId;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.reporterId) where.reporterId = filters.reporterId;

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
        { affectedUrl: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.issue.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, email: true, role: true, avatar: true, department: true } },
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true, department: true } },
        serviceAsset: { select: { id: true, name: true, slug: true, type: true, environment: true, slaTargetMins: true } },
        _count: { select: { comments: true, tasks: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getIssueById(id: string) {
    return prisma.issue.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true, role: true, avatar: true, department: true } },
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true, department: true } },
        serviceAsset: true,
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        tasks: {
          include: {
            owner: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  static async createIssue(data: {
    title: string;
    description: string;
    priority?: IssuePriority;
    category?: IssueCategory;
    department?: string | null;
    source?: string;
    affectedUrl?: string | null;
    serviceAssetId?: string | null;
    location?: string | null;
    reporterId: string;
    assigneeId?: string | null;
    runAiTriage?: boolean;
  }) {

    let aiSummary = undefined;
    let aiSuggestedAction = undefined;
    let aiRootCause = undefined;
    let aiConfidence = undefined;
    let priority = data.priority || IssuePriority.MEDIUM;
    let category = data.category || IssueCategory.OTHER;
    let department = data.department;
    let serviceAssetId = data.serviceAssetId;
    let assigneeId = data.assigneeId;
    let slaMinutes = 60;

    // Validate reporter exists in database; if user session was stale/deleted, fall back to active admin/member
    let reporterId = data.reporterId;
    const reporterExists = await prisma.user.findUnique({ where: { id: reporterId } });
    if (!reporterExists) {
      const fallback = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (!fallback) {
        throw new Error("No user accounts exist in database to report tickets.");
      }
      console.warn(`Reporter ID ${reporterId} not found in database. Falling back to active member ${fallback.name} (${fallback.id})`);
      reporterId = fallback.id;
    }

    // Validate serviceAssetId if provided
    if (serviceAssetId) {
      const assetExists = await prisma.serviceAsset.findUnique({ where: { id: serviceAssetId } });
      if (!assetExists) {
        console.warn(`ServiceAsset ${serviceAssetId} not found in database. Clearing serviceAssetId.`);
        serviceAssetId = null;
      }
    }

    // Validate assigneeId if provided
    if (assigneeId) {
      const assigneeExists = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assigneeExists) {
        console.warn(`Assignee ${assigneeId} not found in database. Clearing assigneeId.`);
        assigneeId = null;
      }
    }

    // Run AI Triage & Service Recognition
    if (data.runAiTriage !== false) {
      try {
        const triage = await AiService.triageIssue(
          data.title,
          data.description,
          data.category,
          data.location || undefined,
          data.affectedUrl || undefined
        );

        aiSummary = triage.summary;
        aiSuggestedAction = triage.suggestedAction;
        aiRootCause = triage.rootCause;
        aiConfidence = triage.confidence;
        if (!data.priority) priority = triage.predictedPriority;
        if (!data.category) category = triage.predictedCategory;
        if (!department && triage.detectedDepartment) department = triage.detectedDepartment;
        if (!serviceAssetId && triage.detectedServiceAssetId) {
          const detectedExists = await prisma.serviceAsset.findUnique({ where: { id: triage.detectedServiceAssetId } });
          if (detectedExists) {
            serviceAssetId = triage.detectedServiceAssetId;
          }
        }
        if (!assigneeId) {
          if (triage.recommendedAssigneeId) {
            const userExists = await prisma.user.findUnique({ where: { id: triage.recommendedAssigneeId } });
            if (userExists) assigneeId = triage.recommendedAssigneeId;
          }
          if (!assigneeId && department) {
            const deptUser = await prisma.user.findFirst({
              where: { department },
              orderBy: { createdAt: "asc" },
            });
            if (deptUser) assigneeId = deptUser.id;
          }
        }
        if (triage.slaTargetMinutes) slaMinutes = triage.slaTargetMinutes;
      } catch (err) {
        console.warn("AI Triage failed during issue creation:", err);
      }
    }

    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);

    const issue = await prisma.issue.create({
      data: {
        title: data.title,
        description: data.description,
        status: assigneeId ? IssueStatus.ASSIGNED : IssueStatus.OPEN,
        priority,
        category,
        department: department || "Operations",
        source: data.source || "WEB_PORTAL",
        affectedUrl: data.affectedUrl || null,
        serviceAssetId: serviceAssetId || null,
        location: data.location || null,
        slaDeadline,
        slaBreached: false,
        reporterId,
        assigneeId: assigneeId || null,
        aiSummary,
        aiSuggestedAction,
        aiRootCause,
        aiConfidence,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        serviceAsset: true,
      },
    });

    // If AI summary exists, create an initial AI Copilot advisory comment
    if (aiSummary) {
      await prisma.comment.create({
        data: {
          issueId: issue.id,
          authorId: reporterId,
          isAiGenerated: true,
          content: `🤖 WorkMate AI Auto-Triage & Routing:\n• Target Asset: ${issue.serviceAsset?.name || "Auto-detected Service"}\n• Assigned Dept: ${issue.department}\n• Root Cause: ${aiRootCause}\n• Remediation Checklist:\n${aiSuggestedAction}`,
        },
      });
    }

    return issue;
  }

  static async updateIssue(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: IssueStatus;
      priority?: IssuePriority;
      category?: IssueCategory;
      department?: string | null;
      serviceAssetId?: string | null;
      location?: string | null;
      assigneeId?: string | null;
      resolutionNotes?: string | null;
    }
  ) {
    const updateData: any = { ...data };

    if (data.status === IssueStatus.RESOLVED || data.status === IssueStatus.CLOSED) {
      updateData.resolvedAt = new Date();
    } else if (data.status === IssueStatus.OPEN || data.status === IssueStatus.IN_PROGRESS) {
      updateData.resolvedAt = null;
    }

    return prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        reporter: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        serviceAsset: true,
      },
    });
  }

  static async deleteIssue(id: string) {
    return prisma.issue.delete({ where: { id } });
  }

  static async deleteAllIssues() {
    await prisma.comment.deleteMany({});
    await prisma.task.updateMany({ data: { issueId: null } });
    return prisma.issue.deleteMany({});
  }

  static async addComment(issueId: string, authorId: string, content: string, isAiGenerated = false) {
    return prisma.comment.create({
      data: {
        issueId,
        authorId,
        content,
        isAiGenerated,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    });
  }

  static async runAiTriageOnIssue(issueId: string) {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new Error("Issue not found");

    const triage = await AiService.triageIssue(
      issue.title,
      issue.description,
      issue.category,
      issue.location || undefined,
      issue.affectedUrl || undefined
    );

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data: {
        aiSummary: triage.summary,
        aiSuggestedAction: triage.suggestedAction,
        aiRootCause: triage.rootCause,
        aiConfidence: triage.confidence,
        department: issue.department || triage.detectedDepartment,
        serviceAssetId: issue.serviceAssetId || triage.detectedServiceAssetId,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        assignee: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        serviceAsset: true,
      },
    });

    await prisma.comment.create({
      data: {
        issueId,
        authorId: issue.reporterId,
        isAiGenerated: true,
        content: `⚡ WorkMate AI Re-Triage:\n• Hypothesis: ${triage.rootCause}\n• Next Actions:\n${triage.suggestedAction}`,
      },
    });

    return updated;
  }
}
