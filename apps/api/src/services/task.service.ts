import { PrismaClient, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

export interface TaskFilter {
  status?: TaskStatus;
  priority?: number;
  ownerId?: string;
  issueId?: string;
  search?: string;
}

export class TaskService {
  static async listTasks(filters?: TaskFilter) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.issueId) where.issueId = filters.issueId;

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { category: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.task.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        issue: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getTaskById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        issue: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true } },
      },
    });
  }

  static async createTask(data: {
    title: string;
    description?: string;
    priority?: number;
    category?: string;
    status?: TaskStatus;
    dueDate?: Date;
    ownerId: string;
    issueId?: string;
  }) {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority ?? 2,
        category: data.category,
        status: data.status ?? TaskStatus.TODO,
        dueDate: data.dueDate,
        ownerId: data.ownerId,
        issueId: data.issueId || null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        issue: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true } },
      },
    });
  }

  static async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: number;
      category?: string | null;
      status?: TaskStatus;
      dueDate?: Date | null;
      issueId?: string | null;
      ownerId?: string;
    }
  ) {

    return prisma.task.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        issue: { select: { id: true, ticketNumber: true, title: true, status: true, priority: true } },
      },
    });
  }

  static async deleteTask(id: string) {
    return prisma.task.delete({ where: { id } });
  }
}
