import { IssueStatus, IssuePriority } from "@prisma/client";
import { prisma } from "../db.js";

interface CacheEntry {
  data: any;
  expiresAt: number;
}

let statsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15 * 1000; // 15-second TTL for blazing-fast dashboard loads

export class StatsService {
  /**
   * Invalidate stats cache whenever tickets or tasks are modified
   */
  static invalidateCache() {
    statsCache = null;
  }

  static async getDashboardStats(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && statsCache && now < statsCache.expiresAt) {
      return statsCache.data;
    }

    const [
      issueStatusGroups,
      unresolvedPriorityGroups,
      taskStatusGroups,
      users,
      issuesByCategory,
      issuesByPriority,
      recentIssues,
      recentComments,
    ] = await Promise.all([
      // 1 query for all issue status counts
      prisma.issue.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // 1 query for unresolved priority counts (urgent & high)
      prisma.issue.groupBy({
        by: ["priority"],
        where: {
          status: { notIn: [IssueStatus.RESOLVED, IssueStatus.CLOSED] },
        },
        _count: { id: true },
      }),
      // 1 query for all task status counts
      prisma.task.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Team workload
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          avatar: true,
          department: true,
          _count: {
            select: {
              assignedIssues: true,
              tasks: true,
            },
          },
        },
      }),
      // Category breakdown
      prisma.issue.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
      // Overall priority breakdown
      prisma.issue.groupBy({
        by: ["priority"],
        _count: { id: true },
      }),
      // Recent issues (limit 5)
      prisma.issue.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: { select: { name: true } },
          assignee: { select: { name: true } },
        },
      }),
      // Recent comments (limit 5)
      prisma.comment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true, role: true } },
          issue: { select: { id: true, title: true, ticketNumber: true } },
        },
      }),
    ]);

    // Compute status counts from groupBy
    const statusMap = new Map<string, number>();
    let totalIssues = 0;
    for (const item of issueStatusGroups) {
      statusMap.set(item.status, item._count.id);
      totalIssues += item._count.id;
    }

    const openIssues = statusMap.get(IssueStatus.OPEN) || 0;
    const assignedIssues = statusMap.get(IssueStatus.ASSIGNED) || 0;
    const inProgressIssues = statusMap.get(IssueStatus.IN_PROGRESS) || 0;
    const resolvedIssues = statusMap.get(IssueStatus.RESOLVED) || 0;
    const closedIssues = statusMap.get(IssueStatus.CLOSED) || 0;

    // Compute urgent and high counts from groupBy
    const priorityMap = new Map<string, number>();
    for (const item of unresolvedPriorityGroups) {
      priorityMap.set(item.priority, item._count.id);
    }
    const urgentIssues = priorityMap.get(IssuePriority.URGENT) || 0;
    const highIssues = priorityMap.get(IssuePriority.HIGH) || 0;

    // Compute task counts from groupBy
    const taskMap = new Map<string, number>();
    let totalTasks = 0;
    for (const item of taskStatusGroups) {
      taskMap.set(item.status, item._count.id);
      totalTasks += item._count.id;
    }
    const doneTasks = taskMap.get("DONE") || 0;
    const inProgressTasks = taskMap.get("IN_PROGRESS") || 0;

    const activeIssues = openIssues + assignedIssues + inProgressIssues;
    const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const resolutionRate = totalIssues > 0 ? Math.round(((resolvedIssues + closedIssues) / totalIssues) * 100) : 0;

    const result = {
      overview: {
        totalIssues,
        activeIssues,
        openIssues,
        assignedIssues,
        inProgressIssues,
        resolvedIssues,
        closedIssues,
        urgentIssues,
        highIssues,
        resolutionRate,
        totalTasks,
        doneTasks,
        inProgressTasks,
        taskCompletionRate,
      },
      categoryBreakdown: issuesByCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      priorityBreakdown: issuesByPriority.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      teamWorkload: users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        department: u.department,
        activeTickets: u._count.assignedIssues,
        assignedTasks: u._count.tasks,
      })),
      recentActivity: {
        issues: recentIssues,
        comments: recentComments,
      },
    };

    statsCache = {
      data: result,
      expiresAt: now + CACHE_TTL_MS,
    };

    return result;
  }
}
