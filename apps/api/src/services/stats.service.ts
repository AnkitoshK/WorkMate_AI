import { PrismaClient, IssueStatus, IssuePriority } from "@prisma/client";

const prisma = new PrismaClient();

export class StatsService {
  static async getDashboardStats() {
    const [
      totalIssues,
      openIssues,
      assignedIssues,
      inProgressIssues,
      resolvedIssues,
      closedIssues,
      urgentIssues,
      highIssues,
      totalTasks,
      doneTasks,
      inProgressTasks,
      users,
      issuesByCategory,
      issuesByPriority,
      recentIssues,
      recentComments,
    ] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: IssueStatus.OPEN } }),
      prisma.issue.count({ where: { status: IssueStatus.ASSIGNED } }),
      prisma.issue.count({ where: { status: IssueStatus.IN_PROGRESS } }),
      prisma.issue.count({ where: { status: IssueStatus.RESOLVED } }),
      prisma.issue.count({ where: { status: IssueStatus.CLOSED } }),
      prisma.issue.count({
        where: {
          priority: IssuePriority.URGENT,
          status: { notIn: [IssueStatus.RESOLVED, IssueStatus.CLOSED] },
        },
      }),
      prisma.issue.count({
        where: {
          priority: IssuePriority.HIGH,
          status: { notIn: [IssueStatus.RESOLVED, IssueStatus.CLOSED] },
        },
      }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "DONE" } }),
      prisma.task.count({ where: { status: "IN_PROGRESS" } }),
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
      prisma.issue.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
      prisma.issue.groupBy({
        by: ["priority"],
        _count: { id: true },
      }),
      prisma.issue.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: { select: { name: true } },
          assignee: { select: { name: true } },
        },
      }),
      prisma.comment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { name: true, role: true } },
          issue: { select: { id: true, title: true, ticketNumber: true } },
        },
      }),
    ]);

    const activeIssues = openIssues + assignedIssues + inProgressIssues;
    const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const resolutionRate = totalIssues > 0 ? Math.round(((resolvedIssues + closedIssues) / totalIssues) * 100) : 0;

    return {
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
  }
}
