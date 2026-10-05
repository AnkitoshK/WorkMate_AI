"use client";

import React, { useState, useEffect, useCallback, FormEvent } from "react";

// --- Types ---
export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "ENGINEER" | "USER";
export type IssueStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type IssueCategory = "HARDWARE" | "SOFTWARE" | "NETWORK" | "FACILITY" | "SAFETY" | "OTHER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  avatar?: string | null;
  _count?: { assignedIssues?: number; tasks?: number };
}

export interface ServiceAsset {
  id: string;
  name: string;
  slug: string;
  type: "WEB_APP" | "MOBILE_APP" | "API_SERVICE" | "CLOUD_INFRA" | "DATABASE" | "HARDWARE" | "FACILITY";
  department: string;
  environment: "PRODUCTION" | "STAGING" | "ON_PREMISE";
  healthStatus: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  slaTargetMins: number;
  urlOrLocation?: string | null;
  description?: string | null;
  activeIncidents?: number;
}

export interface Comment {
  id: string;
  content: string;
  isAiGenerated: boolean;
  createdAt: string;
  author: { id: string; name: string; role: Role; avatar?: string | null };
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number;
  category?: string | null;
  dueDate?: string | null;
  createdAt: string;
  ownerId: string;
  owner?: { id: string; name: string; avatar?: string | null };
  issueId?: string | null;
  issue?: { id: string; ticketNumber: number; title: string; status: IssueStatus; priority: IssuePriority } | null;
}

export interface Issue {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  category: IssueCategory;
  department?: string | null;
  source?: string;
  affectedUrl?: string | null;
  location?: string | null;
  resolutionNotes?: string | null;
  aiSummary?: string | null;
  aiSuggestedAction?: string | null;
  aiRootCause?: string | null;
  aiConfidence?: number | null;
  slaDeadline?: string | null;
  slaBreached?: boolean;
  serviceAssetId?: string | null;
  serviceAsset?: ServiceAsset | null;
  reporterId: string;
  reporter: { id: string; name: string; email: string; role: Role; avatar?: string | null; department?: string | null };
  assigneeId?: string | null;
  assignee?: { id: string; name: string; email: string; role: Role; avatar?: string | null; department?: string | null } | null;
  comments?: Comment[];
  tasks?: Task[];
  _count?: { comments: number; tasks: number };
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  overview: {
    totalIssues: number;
    activeIssues: number;
    openIssues: number;
    assignedIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    closedIssues: number;
    urgentIssues: number;
    highIssues: number;
    resolutionRate: number;
    totalTasks: number;
    doneTasks: number;
    inProgressTasks: number;
    taskCompletionRate: number;
  };
  categoryBreakdown: Array<{ category: string; count: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  teamWorkload: Array<{
    id: string;
    name: string;
    role: Role;
    avatar?: string | null;
    department?: string | null;
    activeTickets: number;
    assignedTasks: number;
  }>;
}

export interface ShiftSummary {
  headline: string;
  urgentAlerts: string[];
  operationalSummary: string;
  recommendedFocus: string[];
  metricsSnapshot: {
    criticalItemsCount: number;
    pendingTasksCount: number;
    completionVelocity: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
];

const getServiceIcon = (slugOrType?: string | null) => {
  const lower = (slugOrType || "").toLowerCase();
  if (lower.includes("web") || lower.includes("portal") || lower.includes("react")) return "🌐";
  if (lower.includes("bill") || lower.includes("payment") || lower.includes("stripe")) return "💳";
  if (lower.includes("auth") || lower.includes("identity") || lower.includes("jwt") || lower.includes("oauth")) return "🔐";
  if (lower.includes("k8s") || lower.includes("kube") || lower.includes("cluster") || lower.includes("infra")) return "☸️";
  if (lower.includes("postgres") || lower.includes("db") || lower.includes("data") || lower.includes("sql")) return "🐘";
  if (lower.includes("mobile") || lower.includes("expo")) return "📱";
  if (lower.includes("api")) return "⚡";
  return "📦";
};

export default function WorkMateEnterpriseApp() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets" | "services" | "team" | "tasks" | "ai">("dashboard");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Core Data
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [services, setServices] = useState<ServiceAsset[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  // Modals & Auth State
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [projectSelectMode, setProjectSelectMode] = useState<"cards" | "dropdown">("cards");
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "switch" | "register" | "profile">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceAsset | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Profile Edit Form State
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDepartment, setProfileDepartment] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // AI Sandbox State
  const [sandboxTitle, setSandboxTitle] = useState("504 Gateway Timeout during checkout on /api/v1/billing");
  const [sandboxDesc, setSandboxDesc] = useState("Payment microservice experiencing high latency. Customer credit card transactions dropping with 504 Gateway Timeout. Redis cache queue backlogged.");
  const [sandboxLocation, setSandboxLocation] = useState("AWS us-east-2 Production Cluster");
  const [sandboxResult, setSandboxResult] = useState<any>(null);

  // Form: New Ticket
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "SOFTWARE" as IssueCategory,
    priority: "HIGH" as IssuePriority,
    serviceAssetId: "",
    department: "",
    location: "",
    affectedUrl: "",
    assigneeId: "",
    runAiTriage: true,
  });

  // Form: New User / Registration
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SUPER_ADMIN" as Role,
    department: "All Engineering Squads (Global)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  });

  // Enterprise Role Scoping Filter for Tickets
  const [roleScopeFilter, setRoleScopeFilter] = useState<"MY_ROLE_DEFAULT" | "MY_ASSIGNED" | "MY_REPORTED" | "ALL_TICKETS">("MY_ROLE_DEFAULT");

  // Form: New Service / Application (SuperAdmin)
  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    type: "WEB_APP" as ServiceAsset["type"],
    department: "Frontend & Mobile Engineering",
    environment: "PRODUCTION" as ServiceAsset["environment"],
    slaTargetMins: 30,
    urlOrLocation: "",
    description: "",
  });

  // Form: New Task
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: 2,
    category: "Code Fix & PR",
    issueId: "",
    dueDate: "",
  });

  const [switchNotification, setSwitchNotification] = useState<{ name: string; role: Role; department?: string | null } | null>(null);

  // Service / Project Selection for Ticket
  const handleSelectServiceForTicket = useCallback((serviceId: string) => {
    if (!serviceId) {
      setTicketForm((prev) => ({
        ...prev,
        serviceAssetId: "",
      }));
      return;
    }
    const found = services.find((s) => s.id === serviceId);
    if (found) {
      setTicketForm((prev) => ({
        ...prev,
        serviceAssetId: found.id,
        department: found.department,
        affectedUrl: found.urlOrLocation || prev.affectedUrl,
        location: found.environment || prev.location,
        priority: (found.slaTargetMins && found.slaTargetMins <= 15 ? "URGENT" : prev.priority) as IssuePriority,
      }));
    }
  }, [services]);

  // Session: Login as user
  const handleLoginAs = useCallback((user: User) => {
    setActiveUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("workmate_active_user_id", user.id);
      localStorage.setItem("workmate_active_user_email", user.email);
    }
    setIsAuthModalOpen(false);
    setLoginError("");
    setLoginEmail("");
    setLoginPassword("");
    setSwitchNotification({ name: user.name, role: user.role, department: user.department });
    setTimeout(() => {
      setSwitchNotification(null);
    }, 7000);
  }, []);

  // Session: Email + Password Login (Production Real-Time Authentication)
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError("Please enter your work email address.");
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError("Please enter your account password.");
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError("");

      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please verify your email and password.");
      }

      handleLoginAs(data.user);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in");
    } finally {
      setLoginLoading(false);
    }
  };

  // Session: Logout
  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("workmate_active_user_id");
      localStorage.removeItem("workmate_active_user_email");
    }
    setActiveUser(null);
    setSwitchNotification(null);
    setLoginError("");
    setLoginEmail("");
    setLoginPassword("");
    setAuthTab("login");
    setIsAuthModalOpen(true);
  }, []);

  // 1. Initial Data Fetch
  const refreshAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [uRes, iRes, tRes, sRes, servRes] = await Promise.all([
        fetch(`${API_BASE}/api/users`).then((r) => r.json()),
        fetch(`${API_BASE}/api/issues`).then((r) => r.json()),
        fetch(`${API_BASE}/api/tasks`).then((r) => r.json()),
        fetch(`${API_BASE}/api/stats`).then((r) => r.json()),
        fetch(`${API_BASE}/api/services`).then((r) => r.json()),
      ]);

      const fetchedUsers: User[] = Array.isArray(uRes) ? uRes : [];
      setUsers(fetchedUsers);

      // Session Restoration from localStorage
      const savedUserId = typeof window !== "undefined" ? localStorage.getItem("workmate_active_user_id") : null;
      if (savedUserId) {
        const found = fetchedUsers.find((u) => u.id === savedUserId);
        if (found) {
          setActiveUser(found);
          setIsAuthModalOpen(false);
        } else {
          // Saved user no longer exists in database
          setActiveUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("workmate_active_user_id");
            localStorage.removeItem("workmate_active_user_email");
          }
          setAuthTab("login");
          setIsAuthModalOpen(true);
        }
      } else {
        // First-time visitor or logged out: prompt for login
        setActiveUser(null);
        setAuthTab("login");
        setIsAuthModalOpen(true);
      }

      setIssues(Array.isArray(iRes) ? iRes : []);
      setTasks(Array.isArray(tRes) ? tRes : []);
      setStats(sRes);
      setServices(Array.isArray(servRes) ? servRes : []);
      setErrorMessage("");
    } catch (err) {
      setErrorMessage("Could not connect to WorkMate API at " + API_BASE + ". Please ensure API server is listening.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAllData();
  }, [refreshAllData]);

  // Dynamic Role Update from UI
  const handleUpdateUserRole = async (userId: string, newRole: Role) => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: You are logged in as ${activeUser.name} (${activeUser.role}). Only SuperAdmins can alter team member roles.`);
      return;
    }
    try {
      setActionLoading(true);
      const updateData: { role: Role; department?: string } = { role: newRole };
      if (newRole === "SUPER_ADMIN") {
        updateData.department = "All Engineering Squads (Global)";
      }
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user role");
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role: newRole, department: updateData.department || u.department }
            : u
        )
      );
      if (activeUser?.id === userId) {
        setActiveUser((prev) =>
          prev
            ? { ...prev, role: newRole, department: updateData.department || prev.department }
            : null
        );
      }
      alert(`✓ Role updated to ${newRole} for ${updated.name || "team member"}!`);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: You are logged in as ${activeUser.name} (${activeUser.role}). Only SuperAdmins can delete user accounts.`);
      return;
    }
    if (!confirm(`Are you sure you want to remove team member "${userName}"?`)) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }
      if (activeUser?.id === userId) {
        handleLogout();
      }
      await refreshAllData();
      alert(`✓ Team member "${userName}" deleted.`);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Profile Handlers (Self-Service)
  const handleOpenEditProfile = (userToEdit?: User) => {
    const target = userToEdit || activeUser;
    if (!target) return;
    setProfileName(target.name);
    setProfileEmail(target.email);
    setProfileDepartment(target.department || "");
    setProfileAvatar(target.avatar || "");
    setAuthTab("profile");
    setIsAuthModalOpen(true);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeUser) return;
    if (!profileName.trim()) {
      alert("Name cannot be empty.");
      return;
    }
    try {
      setProfileSaving(true);
      const res = await fetch(`${API_BASE}/api/users/${activeUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          email: profileEmail.trim() || undefined,
          avatar: profileAvatar.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }
      const updatedUser: User = await res.json();
      setActiveUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)));
      if (typeof window !== "undefined") {
        localStorage.setItem("workmate_active_user_id", updatedUser.id);
      }
      alert(`✓ Profile updated successfully!`);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image file size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Load AI Shift Briefing
  const fetchShiftSummary = async () => {
    try {
      setAiAnalyzing(true);
      const res = await fetch(`${API_BASE}/api/ai/shift-summary`, { method: "POST" });
      const data = await res.json();
      setShiftSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard" && !shiftSummary) {
      void fetchShiftSummary();
    }
  }, [activeTab, shiftSummary]);

  // Load Ticket Detail
  const openTicketDetail = async (issueId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/issues/${issueId}`);
      if (res.ok) setSelectedIssue(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Create Ticket (with AI Auto-Recognition of Application & Dept)
  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) return;

    if (!activeUser || !users.some((u) => u.id === activeUser.id)) {
      alert("⚠️ No active team member session found. Please select or register your profile first.");
      setAuthTab("switch");
      setIsAuthModalOpen(true);
      return;
    }

    if (!ticketForm.title.trim()) {
      alert("Please provide an incident title or symptom.");
      return;
    }

    if (ticketForm.title.trim().length < 3) {
      alert("Incident title must be at least 3 characters.");
      return;
    }

    if (!ticketForm.description.trim()) {
      alert("Please provide description or error logs.");
      return;
    }

    if (ticketForm.description.trim().length < 3) {
      alert("Description must be at least 3 characters.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ticketForm.title.trim(),
          description: ticketForm.description.trim(),
          category: ticketForm.category,
          priority: ticketForm.priority,
          reporterId: activeUser.id,
          assigneeId: ticketForm.assigneeId || undefined,
          serviceAssetId: ticketForm.serviceAssetId || undefined,
          department: ticketForm.department || undefined,
          location: ticketForm.location.trim() || undefined,
          affectedUrl: ticketForm.affectedUrl.trim() || undefined,
          runAiTriage: ticketForm.runAiTriage,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        let message = errJson.error || "Failed to create ticket";
        if (errJson.details?.fieldErrors) {
          const fieldMsgs = Object.entries(errJson.details.fieldErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join("; ");
          message += ` (${fieldMsgs})`;
        }
        throw new Error(message);
      }

      setIsNewTicketOpen(false);
      setTicketForm({
        title: "",
        description: "",
        category: "SOFTWARE",
        priority: "HIGH",
        serviceAssetId: "",
        department: "",
        location: "",
        affectedUrl: "",
        assigneeId: "",
        runAiTriage: true,
      });
      await refreshAllData();
    } catch (err: any) {
      const isConnRefused = err?.message?.includes("fetch") || err?.name === "TypeError";
      const userMessage = isConnRefused
        ? `Unable to connect to WorkMate API server at ${API_BASE}. Please ensure the backend is running on port 4000 (run: 'pnpm dev' or 'pnpm dev:api').`
        : (err.message || "Failed to create ticket");
      alert(`⚠️ Incident Submission Notice: ${userMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Create User / Register & Define Role (SuperAdmin Authority Only)
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Authority Required: You are logged in as ${activeUser.name} (${activeUser.role}). Only SuperAdmins have authority to create new user accounts.`);
      return;
    }
    if (!userForm.name.trim() || !userForm.email.trim()) {
      alert("Please enter both full name and a valid email address.");
      return;
    }

    try {
      setActionLoading(true);
      const assignedDept =
        userForm.role === "SUPER_ADMIN"
          ? "All Engineering Squads (Global)"
          : userForm.department;

      const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password.trim() || undefined,
          role: userForm.role,
          department: assignedDept,
          avatar: userForm.avatar.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team member");
      }

      setIsAuthModalOpen(false);
      setIsNewUserOpen(false);
      setUserForm({
        name: "",
        email: "",
        password: "",
        role: "SUPER_ADMIN",
        department: "All Engineering Squads (Global)",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      });
      await refreshAllData();
      handleLoginAs(data);
      alert(`✓ Team member "${data.name}" created with role "${data.role}"!\nYou are now logged in as ${data.name}.`);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Project Modal in Create Mode (SuperAdmin Authority)
  const handleOpenCreateService = () => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: You are logged in as ${activeUser.name} (${activeUser.role}). Only SuperAdmins can add new projects.`);
      return;
    }
    setEditingService(null);
    setServiceForm({
      name: "",
      slug: "",
      type: "WEB_APP",
      department: "Frontend & Mobile Engineering",
      environment: "PRODUCTION",
      slaTargetMins: 30,
      urlOrLocation: "",
      description: "",
    });
    setIsNewServiceOpen(true);
  };

  // Open Project Modal in Edit/Rename Mode (SuperAdmin Authority)
  const handleOpenEditService = (s: ServiceAsset) => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: You are logged in as ${activeUser.name} (${activeUser.role}). Only SuperAdmins can rename or edit projects.`);
      return;
    }
    setEditingService(s);
    setServiceForm({
      name: s.name,
      slug: s.slug,
      type: s.type,
      department: s.department,
      environment: s.environment,
      slaTargetMins: s.slaTargetMins,
      urlOrLocation: s.urlOrLocation || "",
      description: s.description || "",
    });
    setIsNewServiceOpen(true);
  };

  // Save Project (Handles both Add New and Rename / Edit)
  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.slug.trim()) {
      alert("Please enter project name and slug identifier.");
      return;
    }

    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: Only SuperAdmins have authority to manage projects.`);
      return;
    }

    try {
      setActionLoading(true);
      const isEdit = Boolean(editingService);
      const url = isEdit
        ? `${API_BASE}/api/services/${editingService!.id}`
        : `${API_BASE}/api/services`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to ${isEdit ? "update" : "register"} project`);
      }

      setIsNewServiceOpen(false);
      setEditingService(null);
      setServiceForm({
        name: "",
        slug: "",
        type: "WEB_APP",
        department: "Frontend & Mobile Engineering",
        environment: "PRODUCTION",
        slaTargetMins: 30,
        urlOrLocation: "",
        description: "",
      });
      await refreshAllData();
      alert(isEdit ? `✓ Project "${serviceForm.name}" updated successfully!` : `✓ Project "${serviceForm.name}" registered in catalog!`);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Project (SuperAdmin Authority)
  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: Only SuperAdmins can delete projects.`);
      return;
    }

    const confirmed = window.confirm(
      `⚠️ Are you sure you want to permanently delete project "${serviceName}"?\n\nAny tickets previously associated with this project will be preserved safely with their project reference set to unlinked.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/services/${serviceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete project");
      }

      if (ticketForm.serviceAssetId === serviceId) {
        setTicketForm((prev) => ({ ...prev, serviceAssetId: "" }));
      }

      await refreshAllData();
      alert(`✓ Project "${serviceName}" deleted successfully.`);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Purge All Testing Tickets (SuperAdmin Authority)
  const handlePurgeAllTickets = async () => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert(`🔒 SuperAdmin Access Required: Only SuperAdmins can purge testing tickets.`);
      return;
    }

    const count = issues.length;
    const confirmed = window.confirm(
      `⚠️ PERMANENT PURGE OF ALL TICKETS:\n\nAre you sure you want to delete all ${count} ticket(s) from the database?\n\nThis will purge all test tickets, comments, and unlinked tasks permanently.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/issues`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to purge tickets");
      }

      setSelectedIssue(null);
      await refreshAllData();
      alert(`✓ All test tickets have been completely purged! The ticket queue is now clean.`);
    } catch (err: any) {
      alert("❌ " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (issueId: string, status: IssueStatus) => {
    if (!activeUser) {
      alert("⚠️ Authentication required.");
      return;
    }
    if (activeUser.role === "USER") {
      alert("🔒 Access Denied: End users / reporters cannot alter technical workflow status.");
      return;
    }
    if (status === "CLOSED" && activeUser.role === "ENGINEER") {
      alert("🔒 Access Denied: Engineers cannot close tickets directly. Manager verification is required.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedIssue?.id === issueId) setSelectedIssue(updated);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Re-assign Ticket
  const handleAssignTicket = async (issueId: string, assigneeId: string) => {
    if (!activeUser) {
      alert("⚠️ Authentication required.");
      return;
    }
    if (activeUser.role !== "SUPER_ADMIN" && activeUser.role !== "ADMIN" && activeUser.role !== "MANAGER") {
      alert(`🔒 Access Denied: ${activeUser.role}s cannot reassign tickets to other specialists. Only Squad Leads (Manager) and SuperAdmins have reassignment authority.`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assigneeId || null, status: assigneeId ? "ASSIGNED" : "OPEN" }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedIssue?.id === issueId) setSelectedIssue(updated);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !newCommentText.trim()) return;

    if (!activeUser) {
      alert("⚠️ Please log in or register a team member first to post updates.");
      setAuthTab("switch");
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/api/issues/${selectedIssue.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newCommentText.trim(),
          authorId: activeUser.id,
          isAiGenerated: false,
        }),
      });
      if (res.ok) {
        setNewCommentText("");
        await openTicketDetail(selectedIssue.id);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // AI Re-Triage
  const handleRunAiTriageOnIssue = async (issueId: string) => {
    try {
      setAiAnalyzing(true);
      const res = await fetch(`${API_BASE}/api/issues/${issueId}/ai-triage`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setSelectedIssue(updated);
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Toggle Task
  const handleToggleTask = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    try {
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Task
  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    if (!activeUser) {
      alert("⚠️ Please log in or create a team member first to assign work orders.");
      setAuthTab("register");
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          priority: Number(taskForm.priority),
          ownerId: activeUser.id,
          dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
          issueId: taskForm.issueId || undefined,
        }),
      });
      setIsNewTaskOpen(false);
      setTaskForm({ title: "", description: "", priority: 2, category: "Maintenance", issueId: "", dueDate: "" });
      await refreshAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // AI Sandbox Run
  const handleRunSandboxTriage = async () => {
    if (!sandboxTitle.trim() || !sandboxDesc.trim()) return;
    try {
      setAiAnalyzing(true);
      const res = await fetch(`${API_BASE}/api/ai/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sandboxTitle,
          description: sandboxDesc,
          location: sandboxLocation,
        }),
      });
      setSandboxResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const isSuperAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN";

  // Filtered Issues (Strictly scopes tickets: SuperAdmin sees all fleet; particular users see ONLY their own tickets)
  const filteredIssues = issues.filter((iss) => {
    // 1. Text & Asset Search
    const matchesSearch =
      iss.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iss.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (iss.location && iss.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (iss.serviceAsset?.name && iss.serviceAsset.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Standard Filters
    const matchesStatus = statusFilter === "ALL" || iss.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || iss.priority === priorityFilter;
    const matchesCategory = categoryFilter === "ALL" || iss.category === categoryFilter;
    const matchesDepartment = departmentFilter === "ALL" || iss.department === departmentFilter;

    // 3. User & Role Scoping
    let matchesRoleScope = true;

    if (activeUser) {
      if (!isSuperAdmin) {
        // Particular user login (e.g., Aashutosh, Ravi, or any regular user/engineer):
        // STRICTLY show only tickets assigned to this user OR reported by this user!
        if (roleScopeFilter === "MY_ASSIGNED") {
          matchesRoleScope = iss.assigneeId === activeUser.id;
        } else if (roleScopeFilter === "MY_REPORTED") {
          matchesRoleScope = iss.reporterId === activeUser.id;
        } else {
          // Default: Only tickets where user is assignee or reporter
          matchesRoleScope = iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id;
        }
      } else {
        // SuperAdmin / Admin:
        if (roleScopeFilter === "MY_ASSIGNED") {
          matchesRoleScope = iss.assigneeId === activeUser.id;
        } else if (roleScopeFilter === "MY_REPORTED") {
          matchesRoleScope = iss.reporterId === activeUser.id;
        } else {
          // Default: All tickets across the organization
          matchesRoleScope = true;
        }
      }
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesCategory &&
      matchesDepartment &&
      matchesRoleScope
    );
  });

  // Filtered Tasks (Supports Enterprise Role Scoping: Non-superadmin only sees their own work)
  const filteredTasks = tasks.filter((task) => {
    if (!activeUser) return true;
    if (isSuperAdmin) return true;
    const isOwner = task.ownerId === activeUser.id;
    const isLinkedToMyIssue = Boolean(
      task.issueId &&
      issues.some(
        (iss) =>
          iss.id === task.issueId &&
          (iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id)
      )
    );
    return isOwner || isLinkedToMyIssue;
  });

  const myIssues = issues.filter(
    (i) => activeUser && (i.assigneeId === activeUser.id || i.reporterId === activeUser.id)
  );
  const myActiveIssuesCount = myIssues.filter(
    (i) => i.status !== "RESOLVED" && i.status !== "CLOSED"
  ).length;
  const myOpenIssuesCount = myIssues.filter(
    (i) => i.status === "OPEN" || i.status === "ASSIGNED" || i.status === "IN_PROGRESS"
  ).length;
  const myResolvedIssuesCount = myIssues.filter(
    (i) => i.status === "RESOLVED" || i.status === "CLOSED"
  ).length;

  return (
    <div className="app-container">
      {/* Top Enterprise Navigation Header */}
      <header className="header-bar">
        <div className="brand-section">
          <div className="brand-logo-badge">⚡</div>
          <div>
            <div className="brand-title">WorkMate AI · Jira & ServiceNow Operations</div>
            <div className="brand-subtitle">
              <span>Enterprise Service Management & Fleet Command</span>
              <span className="status-indicator">
                <span className="status-dot"></span>
                Neon Postgres Connected
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          {/* Operational Primary Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              style={{ height: "32px", padding: "0 10px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" }}
              onClick={() => setIsNewTicketOpen(true)}
            >
              + Log Ticket
            </button>

            {/* Add User Button (Only SuperAdmin has user creation authority) */}
            {(!activeUser || activeUser.role === "SUPER_ADMIN" || users.length === 0) && (
              <button
                className="btn btn-ai"
                onClick={() => {
                  setAuthTab("register");
                  setIsAuthModalOpen(true);
                }}
                title="Register a new team member and define role (SuperAdmin authority)"
                style={{
                  height: "32px",
                  padding: "0 9px",
                  fontSize: "11px",
                  fontWeight: "600",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                👑 + Add User
              </button>
            )}
          </div>

          {/* Clean Vertical Divider */}
          <div style={{ width: "1px", height: "18px", background: "rgba(255, 255, 255, 0.12)", margin: "0 1px", flexShrink: 0 }} />

          {/* User Session & Identity Group */}
          {activeUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              {/* Active User Pill & Compact Role Switcher */}
              <div className="user-switcher" title="Active Logged In Session">
                {activeUser.avatar ? (
                  <img
                    src={activeUser.avatar}
                    alt={activeUser.name}
                    className="user-avatar"
                    onClick={() => handleOpenEditProfile()}
                    title="Click to edit your photo & profile"
                    style={{ cursor: "pointer" }}
                  />
                ) : (
                  <div
                    className="user-avatar"
                    style={{ background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "11px", fontWeight: "700" }}
                    onClick={() => handleOpenEditProfile()}
                    title="Click to edit your photo & profile"
                  >
                    {activeUser.name.charAt(0)}
                  </div>
                )}
                <div className="user-info">
                  <span className="user-name">{activeUser.name}</span>
                  <span
                    className="user-role-badge"
                    style={{ maxWidth: "125px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={activeUser.department || "Operations"}
                  >
                    {activeUser.department || "Operations"}
                  </span>
                </div>
                <select
                  className="user-select"
                  value={activeUser.id}
                  onChange={(e) => {
                    const found = users.find((u) => u.id === e.target.value);
                    if (found) handleLoginAs(found);
                  }}
                  title="Quick switch active user session"
                  style={{
                    maxWidth: "84px",
                    background:
                      activeUser.role === "SUPER_ADMIN"
                        ? "rgba(168, 85, 247, 0.2)"
                        : activeUser.role === "MANAGER"
                        ? "rgba(99, 102, 241, 0.2)"
                        : activeUser.role === "ENGINEER"
                        ? "rgba(6, 182, 212, 0.2)"
                        : "rgba(255, 255, 255, 0.08)",
                    color:
                      activeUser.role === "SUPER_ADMIN"
                        ? "#c084fc"
                        : activeUser.role === "MANAGER"
                        ? "#818cf8"
                        : activeUser.role === "ENGINEER"
                        ? "#22d3ee"
                        : "#94a3b8",
                  }}
                >
                  {users.map((u) => {
                    const icon = u.role === "SUPER_ADMIN" ? "👑 " : u.role === "MANAGER" ? "👔 " : u.role === "ENGINEER" ? "🛠️ " : "👤 ";
                    const roleLabel = u.role === "SUPER_ADMIN" ? "ADMIN" : u.role;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.id === activeUser.id ? `(${roleLabel})` : `${icon}(${u.role}) ${u.name}`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Edit Profile Button */}
              <button
                className="btn btn-secondary"
                style={{ height: "32px", padding: "0 9px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", whiteSpace: "nowrap" }}
                onClick={() => handleOpenEditProfile()}
                title="Edit your profile picture & name"
              >
                <span>✏️</span> Profile
              </button>

              {/* Switch Account Button */}
              <button
                className="btn btn-secondary"
                style={{ height: "32px", padding: "0 9px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                onClick={() => { setAuthTab("switch"); setIsAuthModalOpen(true); }}
                title="Switch between existing accounts"
              >
                <span>🔄</span> Switch
              </button>

              {/* Logout Button */}
              <button
                className="btn btn-danger"
                style={{ height: "32px", padding: "0 9px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#fb7185", whiteSpace: "nowrap" }}
                onClick={handleLogout}
                title="Log out of current session"
              >
                <span>🚪</span> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              <button
                className="btn btn-secondary"
                style={{ height: "32px", padding: "0 12px", fontSize: "11.5px", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px" }}
                onClick={() => { setAuthTab("switch"); setIsAuthModalOpen(true); }}
              >
                <span>🔑</span> Log In
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Global Error Banner */}
      {errorMessage && (
        <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "12px", padding: "14px 20px", color: "#fb7185", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>⚠️ {errorMessage}</span>
          <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: "12px" }} onClick={refreshAllData}>Retry</button>
        </div>
      )}

      {/* Logged Out Status Banner */}
      {!activeUser && (
        <div className="logged-out-banner" style={{ margin: "20px 0", padding: "20px 24px" }}>
          <div>
            <div style={{ fontSize: "17px", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔐</span> Corporate Authentication Required
            </div>
            <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px" }}>
              WorkMate AI guarantees complete ticket confidentiality. Enter your corporate email to sign in or select your profile.
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn btn-primary"
              style={{ padding: "8px 18px", fontSize: "13px", fontWeight: "700" }}
              onClick={() => { setAuthTab("login"); setIsAuthModalOpen(true); }}
            >
              🔑 Sign In with Work Email
            </button>
            {users.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ padding: "8px 14px", fontSize: "12px" }}
                onClick={() => { setAuthTab("switch"); setIsAuthModalOpen(true); }}
              >
                👥 Choose Account ({users.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Session Switch Notification Banner */}
      {switchNotification && (
        <div style={{
          background: switchNotification.role === "SUPER_ADMIN" 
            ? "linear-gradient(90deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))"
            : switchNotification.role === "MANAGER"
            ? "linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))"
            : switchNotification.role === "ENGINEER"
            ? "linear-gradient(90deg, rgba(6, 182, 212, 0.2), rgba(52, 211, 153, 0.2))"
            : "linear-gradient(90deg, rgba(100, 116, 139, 0.2), rgba(71, 85, 105, 0.2))",
          border: `1px solid ${
            switchNotification.role === "SUPER_ADMIN" ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.15)"
          }`,
          borderRadius: "12px",
          padding: "12px 20px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>
              {switchNotification.role === "SUPER_ADMIN" ? "👑" : switchNotification.role === "MANAGER" ? "👔" : switchNotification.role === "ENGINEER" ? "🛠️" : "👤"}
            </span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Account Switched to {switchNotification.name}</span>
                <span className="badge badge-assigned" style={{ fontSize: "10px" }}>{switchNotification.role}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "2px" }}>
                {switchNotification.role === "SUPER_ADMIN" 
                  ? "✓ Clearance: Global SuperAdmin · All tabs, Team Directory & Role Mapping, Service Catalog, and Ticket Assignment unlocked."
                  : switchNotification.role === "MANAGER"
                  ? `✓ Clearance: Squad Lead (${switchNotification.department || "Engineering"}) · Work order dispatch & squad reassignment active. SuperAdmin team directory locked (403).`
                  : switchNotification.role === "ENGINEER"
                  ? `✓ Clearance: Software Engineer (${switchNotification.department || "Software"}) · Scoped to software incidents and squad queue. Directory management & ticket reassignment locked.`
                  : `✓ Clearance: End-User Reporter · Personal ticket submissions only. Workflow status and admin modules locked.`}
              </div>
            </div>
          </div>
          <button 
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}
            onClick={() => setSwitchNotification(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Enterprise Tabs Navigation */}
      <nav className="nav-tabs">
        <button className={`nav-tab-btn ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
          <span>📊</span> Command Dashboard
        </button>
        <button className={`nav-tab-btn ${activeTab === "tickets" ? "active" : ""}`} onClick={() => setActiveTab("tickets")}>
          <span>🎫</span> Ticketing Tool (Jira View)
          <span className="tab-badge">{isSuperAdmin ? issues.length : filteredIssues.length}</span>
        </button>
        <button className={`nav-tab-btn ${activeTab === "services" ? "active" : ""}`} onClick={() => setActiveTab("services")}>
          <span>🌐</span> Applications & Websites ({services.length})
        </button>
        <button 
          className={`nav-tab-btn ${activeTab === "team" ? "active" : ""}`} 
          onClick={() => setActiveTab("team")}
          style={{ opacity: activeUser && !isSuperAdmin && users.length > 0 ? 0.75 : 1 }}
        >
          <span>{activeUser && !isSuperAdmin && users.length > 0 ? "🔒" : "👥"}</span> Team & Roles {activeUser && !isSuperAdmin && users.length > 0 ? "(Restricted)" : "(SuperAdmin)"}
          {activeUser && !isSuperAdmin && users.length > 0 && (
            <span style={{ fontSize: "9px", background: "rgba(244,63,94,0.2)", color: "#fb7185", padding: "1px 5px", borderRadius: "4px", marginLeft: "4px" }}>403</span>
          )}
          <span className="tab-badge">{users.length}</span>
        </button>
        <button className={`nav-tab-btn ${activeTab === "tasks" ? "active" : ""}`} onClick={() => setActiveTab("tasks")}>
          <span>📋</span> Work Orders ({filteredTasks.length})
        </button>
        <button className={`nav-tab-btn ${activeTab === "ai" ? "active" : ""}`} onClick={() => setActiveTab("ai")}>
          <span>✨</span> AI Triage Hub
        </button>
      </nav>

      {/* TAB 1: OPERATIONS COMMAND DASHBOARD */}
      {activeTab === "dashboard" && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">{isSuperAdmin ? "Active Fleet Incidents" : `My Active Incidents (${activeUser?.name || "User"})`}</span>
                <span className="kpi-icon-pill">🎫</span>
              </div>
              <div className="kpi-value" style={{ color: "#38bdf8" }}>
                {isSuperAdmin ? (stats?.overview.activeIssues ?? 0) : myActiveIssuesCount}
              </div>
              <div className="kpi-footer">
                {isSuperAdmin ? (
                  <><span>{stats?.overview.openIssues ?? 0} unassigned queue</span> · <span>{stats?.overview.inProgressIssues ?? 0} in remediation</span></>
                ) : (
                  <><span>{myOpenIssuesCount} pending / in remediation</span> · <span>{myResolvedIssuesCount} resolved</span></>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Critical & Urgent Alerts</span>
                <span className="kpi-icon-pill" style={{ background: "rgba(244, 63, 94, 0.15)" }}>🚨</span>
              </div>
              <div className="kpi-value" style={{ color: "#fb7185" }}>
                {(stats?.overview.urgentIssues ?? 0) + (stats?.overview.highIssues ?? 0)}
              </div>
              <div className="kpi-footer">
                <span>{stats?.overview.urgentIssues ?? 0} urgent priority</span> · <span>{stats?.overview.highIssues ?? 0} high priority</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">SLA Compliance Rate</span>
                <span className="kpi-icon-pill">🎯</span>
              </div>
              <div className="kpi-value" style={{ color: "#34d399" }}>
                88%
              </div>
              <div className="kpi-footer">
                <span>1 ticket breached SLA</span> · <span>4 tickets within target</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Task Completion Velocity</span>
                <span className="kpi-icon-pill">⚡</span>
              </div>
              <div className="kpi-value" style={{ color: "#a855f7" }}>
                {stats?.overview.taskCompletionRate ?? 0}%
              </div>
              <div className="kpi-footer">
                <span>{stats?.overview.doneTasks ?? 0} of {stats?.overview.totalTasks ?? 0} work orders closed</span>
              </div>
            </div>
          </div>

          {/* AI Executive Shift Briefing */}
          <div className="ai-briefing-panel">
            <div className="ai-briefing-header">
              <span className="ai-badge">
                <span>✨</span> WorkMate AI Copilot · Executive Shift Briefing
              </span>
              <button className="btn btn-ai" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={fetchShiftSummary} disabled={aiAnalyzing}>
                {aiAnalyzing ? "Generating..." : "⚡ Re-analyze Operations"}
              </button>
            </div>

            <div className="ai-headline">{shiftSummary?.headline || "Synthesizing cross-department telemetry..."}</div>
            <p className="ai-summary-text">{shiftSummary?.operationalSummary || "Monitoring software websites, cloud APIs, physical facilities, and network links."}</p>

            <div className="ai-bullet-list">
              {shiftSummary?.recommendedFocus?.map((focus, idx) => (
                <div key={idx} className="ai-bullet-item">
                  <span style={{ color: "#c084fc", fontWeight: "bold" }}>0{idx + 1}.</span>
                  <span>{focus}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown & Monitored Services */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Critical Monitored Services & Apps</span>
                <span style={{ fontSize: "12px", color: "var(--accent-cyan)", cursor: "pointer" }} onClick={() => setActiveTab("services")}>View all ➔</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {services.slice(0, 5).map((serv) => (
                  <div key={serv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700" }}>{serv.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{serv.type} · Dept: {serv.department}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`badge ${serv.healthStatus === "OPERATIONAL" ? "badge-resolved" : serv.healthStatus === "DEGRADED" ? "badge-progress" : "badge-urgent"}`} style={{ fontSize: "10px" }}>
                        {serv.healthStatus}
                      </span>
                      {serv.activeIncidents ? (
                        <span className="badge badge-urgent" style={{ fontSize: "10px" }}>{serv.activeIncidents} active</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Department Workload Distribution</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Active Incidents</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  "Backend & Core APIs",
                  "Frontend & Mobile Engineering",
                  "DevOps & Cloud SRE",
                  "Database & Platform Infrastructure",
                  "QA & Reliability Engineering",
                ].map((dept) => {
                  const count = issues.filter((i) => i.department === dept && i.status !== "RESOLVED" && i.status !== "CLOSED").length;
                  return (
                    <div key={dept}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ fontWeight: "600" }}>{dept}</span>
                        <span style={{ color: "var(--text-muted)" }}>{count} ticket(s)</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, (count / (issues.length || 1)) * 100)}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                            borderRadius: "999px",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TICKETING TOOL (JIRA KANBAN & TABLE VIEW) */}
      {activeTab === "tickets" && (
        <div>
          <div className="control-bar">
            <div className="search-filter-group">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search tickets, websites, apps, or symptoms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select className="filter-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <option value="ALL">All Engineering Teams</option>
                <option value="Backend & Core APIs">Backend & Core APIs</option>
                <option value="Frontend & Mobile Engineering">Frontend & Mobile Engineering</option>
                <option value="DevOps & Cloud SRE">DevOps & Cloud SRE</option>
                <option value="Database & Platform Infrastructure">Database & Platform Infrastructure</option>
                <option value="QA & Reliability Engineering">QA & Reliability Engineering</option>
              </select>

              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open (Unassigned)</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div className="view-switch">
                <button className={`view-btn ${viewMode === "kanban" ? "active" : ""}`} onClick={() => setViewMode("kanban")}>
                  Kanban
                </button>
                <button className={`view-btn ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode("table")}>
                  Table
                </button>
              </div>

              {activeUser?.role === "SUPER_ADMIN" && issues.length > 0 && (
                <button
                  className="btn btn-danger"
                  style={{
                    background: "rgba(244, 63, 94, 0.15)",
                    color: "#fb7185",
                    border: "1px solid rgba(244, 63, 94, 0.35)",
                    padding: "8px 12px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  onClick={handlePurgeAllTickets}
                  title="SuperAdmin: Permanently purge all testing tickets from database"
                >
                  <span>🗑️</span> Purge Test Tickets ({issues.length})
                </button>
              )}

              <button className="btn btn-primary" onClick={() => setIsNewTicketOpen(true)}>
                + Log Incident
              </button>
            </div>
          </div>

          {/* Active Role Scoping Notice & Quick Toggles */}
          {activeUser ? (
            <div style={{
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              borderRadius: "12px",
              padding: "10px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                {isSuperAdmin ? (
                  <span>👑 <strong>SuperAdmin Global Queue:</strong> Showing all organization incident tickets across all engineering squads.</span>
                ) : (
                  <span>👤 <strong>{activeUser.name}&apos;s Workspace:</strong> Showing only tickets assigned to you or reported by you.</span>
                )}
                <span className="badge badge-assigned" style={{ fontSize: "11px" }}>
                  {filteredIssues.length} visible {isSuperAdmin ? `of ${issues.length} total` : "assigned / reported"}
                </span>
              </div>

              {/* View Scope Quick Pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {isSuperAdmin ? (
                  <>
                    <button
                      className={`btn ${roleScopeFilter === "ALL_TICKETS" || roleScopeFilter === "MY_ROLE_DEFAULT" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setRoleScopeFilter("ALL_TICKETS")}
                      title="View all organization tickets across the entire fleet"
                    >
                      🌐 All Org ({issues.length})
                    </button>
                    <button
                      className={`btn ${roleScopeFilter === "MY_ASSIGNED" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setRoleScopeFilter("MY_ASSIGNED")}
                      title="Only tickets assigned directly to you"
                    >
                      🎯 Assigned to Me ({issues.filter((i) => i.assigneeId === activeUser.id).length})
                    </button>
                    <button
                      className={`btn ${roleScopeFilter === "MY_REPORTED" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setRoleScopeFilter("MY_REPORTED")}
                      title="Tickets reported by you"
                    >
                      📝 Reported by Me ({issues.filter((i) => i.reporterId === activeUser.id).length})
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`btn ${roleScopeFilter === "MY_ROLE_DEFAULT" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setRoleScopeFilter("MY_ROLE_DEFAULT")}
                      title="All your assigned and reported work"
                    >
                      ⚡ All My Tickets ({myIssues.length})
                    </button>
                    <button
                      className={`btn ${roleScopeFilter === "MY_ASSIGNED" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setRoleScopeFilter("MY_ASSIGNED")}
                      title="Only tickets assigned directly to you"
                    >
                      🎯 Assigned to Me ({issues.filter((i) => i.assigneeId === activeUser.id).length})
                    </button>
                    <button
                      className={`btn ${roleScopeFilter === "MY_REPORTED" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setRoleScopeFilter("MY_REPORTED")}
                      title="Tickets reported by you"
                    >
                      📝 Reported by Me ({issues.filter((i) => i.reporterId === activeUser.id).length})
                    </button>
                    <span
                      style={{ fontSize: "11px", color: "var(--text-dim)", padding: "4px 8px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      title="Other team members' tickets are hidden (Restricted to SuperAdmin)"
                    >
                      🔒 Other Tickets Hidden (SuperAdmin Only)
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Clean Ticket Queue Banner when 0 Tickets */}
          {issues.length === 0 && (
            <div style={{
              margin: "0 0 20px 0",
              padding: "36px 24px",
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08))",
              border: "1px dashed rgba(16, 185, 129, 0.4)",
              borderRadius: "14px",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#fff", marginBottom: "6px" }}>
                Ticketing Queue is Completely Clean (0 Testing Tickets)
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "560px", margin: "0 auto 16px" }}>
                All test tickets have been purged from the system. You have a fresh, production-ready queue. Click below to log real incident tickets linked to your dynamic projects.
              </p>
              <button className="btn btn-primary" onClick={() => setIsNewTicketOpen(true)}>
                + Log Incident Ticket
              </button>
            </div>
          )}

          {/* Kanban Board */}
          {viewMode === "kanban" ? (
            <div className="kanban-board">
              {(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] as IssueStatus[]).map((statusCol) => {
                const colTickets = filteredIssues.filter((iss) => iss.status === statusCol);
                const colLabels: Record<string, { title: string; color: string }> = {
                  OPEN: { title: "Unassigned Queue", color: "#60a5fa" },
                  ASSIGNED: { title: "Assigned / Dispatched", color: "#c084fc" },
                  IN_PROGRESS: { title: "In Remediation", color: "#fcd34d" },
                  RESOLVED: { title: "Resolved / Closed", color: "#34d399" },
                };

                return (
                  <div key={statusCol} className="kanban-col">
                    <div className="kanban-col-header">
                      <div className="col-title" style={{ color: colLabels[statusCol].color }}>
                        <span>●</span> {colLabels[statusCol].title}
                      </div>
                      <span className="col-count">{colTickets.length}</span>
                    </div>

                    <div className="ticket-list">
                      {colTickets.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "28px 12px", color: "var(--text-dim)", fontSize: "12px" }}>
                          No tickets in {statusCol.toLowerCase().replace("_", " ")}
                        </div>
                      ) : (
                        colTickets.map((iss) => (
                          <div key={iss.id} className="ticket-card" onClick={() => openTicketDetail(iss.id)}>
                            <div className="ticket-top">
                              <span className="ticket-id">#TIK-{String(iss.ticketNumber).padStart(3, "0")}</span>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {iss.slaBreached && <span className="badge badge-urgent" style={{ fontSize: "9px" }}>SLA BREACHED</span>}
                                <span className={`badge badge-${iss.priority.toLowerCase()}`}>{iss.priority}</span>
                              </div>
                            </div>

                            <div className="ticket-title">{iss.title}</div>

                            {/* Recognized Service / App */}
                            {iss.serviceAsset && (
                              <div style={{ fontSize: "11px", color: "var(--accent-cyan)", marginBottom: "6px", fontWeight: "600" }}>
                                🌐 {iss.serviceAsset.name} ({iss.serviceAsset.type})
                              </div>
                            )}

                            <div className="ticket-desc">{iss.description}</div>

                            {/* AI Copilot Badge */}
                            {iss.aiSummary && (
                              <div className="ticket-ai-summary">
                                <strong>✨ AI:</strong> {iss.aiSummary}
                              </div>
                            )}

                            <div className="ticket-footer">
                              <div className="tag-group">
                                <span className="badge badge-cat">{iss.department || iss.category}</span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {iss.assignee ? (
                                  <div title={`Assigned: ${iss.assignee.name} (${iss.assignee.role})`}>
                                    {iss.assignee.avatar ? (
                                      <img src={iss.assignee.avatar} alt={iss.assignee.name} style={{ width: "24px", height: "24px", borderRadius: "50%" }} />
                                    ) : (
                                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#4f46e5", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {iss.assignee.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "10px", color: "#f87171", background: "rgba(239, 68, 68, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>Unassigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Priority</th>
                    <th>Target App / Service</th>
                    <th>Department</th>
                    <th>Incident Title</th>
                    <th>Assignee</th>
                    <th>SLA Status</th>
                    <th>AI Diagnostic</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((iss) => (
                    <tr key={iss.id} onClick={() => openTicketDetail(iss.id)}>
                      <td style={{ fontFamily: "JetBrains Mono", fontWeight: "600", color: "var(--accent-cyan)" }}>
                        #TIK-{String(iss.ticketNumber).padStart(3, "0")}
                      </td>
                      <td><span className={`badge badge-${iss.priority.toLowerCase()}`}>{iss.priority}</span></td>
                      <td>
                        <span style={{ fontWeight: "700", color: "#e2e8f0" }}>{iss.serviceAsset?.name || "General Service"}</span>
                      </td>
                      <td><span className="badge badge-cat">{iss.department || "Operations"}</span></td>
                      <td style={{ fontWeight: "600", maxWidth: "240px" }}>{iss.title}</td>
                      <td>
                        {iss.assignee ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {iss.assignee.avatar && <img src={iss.assignee.avatar} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%" }} />}
                            <span>{iss.assignee.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#fb7185", fontSize: "11px" }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        {iss.slaBreached ? (
                          <span className="badge badge-urgent" style={{ fontSize: "10px" }}>BREACHED</span>
                        ) : (
                          <span className="badge badge-resolved" style={{ fontSize: "10px" }}>ON TRACK</span>
                        )}
                      </td>
                      <td style={{ maxWidth: "260px", color: "#d8b4fe", fontSize: "11px" }}>
                        {iss.aiSummary ? `✨ ${iss.aiSummary.slice(0, 50)}...` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: APPLICATIONS & MONITORED WEBSITES */}
      {activeTab === "services" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "800" }}>Application & Project Service Catalog</h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Dynamic catalog of registered web portals, mobile apps, microservices, and databases. SuperAdmin can add, rename, and delete projects.
              </p>
            </div>
            {activeUser?.role === "SUPER_ADMIN" ? (
              <button className="btn btn-primary" onClick={handleOpenCreateService}>
                👑 + Add New Project / Service
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.25)", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", color: "#fb7185" }}>
                <span>🔒</span> Catalog Modification Restricted to SuperAdmin
              </div>
            )}
          </div>

          {services.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px dashed rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>📦</div>
              <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#fff", marginBottom: "6px" }}>No Projects Registered Yet</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 16px" }}>
                Add your enterprise projects dynamically so team members can select them when logging incident tickets and tracking SLAs.
              </p>
              {activeUser?.role === "SUPER_ADMIN" && (
                <button className="btn btn-primary" onClick={handleOpenCreateService}>
                  👑 + Register First Project
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
              {services.map((serv) => (
                <div key={serv.id} className="kpi-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div className="kpi-header">
                      <span className="kpi-title">{serv.type}</span>
                      <span className={`badge ${serv.healthStatus === "OPERATIONAL" ? "badge-resolved" : serv.healthStatus === "DEGRADED" ? "badge-progress" : "badge-urgent"}`}>
                        {serv.healthStatus}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "20px" }}>{getServiceIcon(serv.slug || serv.type)}</span>
                      <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", margin: 0 }}>{serv.name}</h3>
                    </div>

                    <div style={{ fontSize: "12px", color: "var(--accent-cyan)", marginBottom: "10px", fontFamily: "JetBrains Mono" }}>
                      {serv.urlOrLocation || serv.slug}
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "14px" }}>
                      {serv.description || "No description configured."}
                    </p>

                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-dim)" }}>
                      <span>Dept: <strong style={{ color: "#fff" }}>{serv.department}</strong></span>
                      <span>Target SLA: <strong style={{ color: "#fff" }}>{serv.slaTargetMins}m</strong></span>
                    </div>
                  </div>

                  {/* SuperAdmin Management Actions: Rename / Edit & Delete */}
                  {activeUser?.role === "SUPER_ADMIN" && (
                    <div style={{
                      marginTop: "16px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "8px",
                    }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}
                        onClick={() => handleOpenEditService(serv)}
                        title="Rename or edit project details"
                      >
                        <span>✏️</span> Rename / Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          background: "rgba(244, 63, 94, 0.15)",
                          color: "#fb7185",
                          border: "1px solid rgba(244, 63, 94, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                        onClick={() => handleDeleteService(serv.id, serv.name)}
                        title="Delete project from catalog"
                      >
                        <span>🗑️</span> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEAM & ROLES (SUPERADMIN MANAGEMENT) */}
      {activeTab === "team" && (
        <div>
          {activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0 ? (
            /* 403 Forbidden Access Denied Gate */
            <div style={{
              background: "linear-gradient(135deg, rgba(30, 27, 75, 0.7), rgba(15, 23, 42, 0.9))",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "16px",
              padding: "48px 32px",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              maxWidth: "720px",
              margin: "30px auto",
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(244, 63, 94, 0.15)",
                border: "2px solid rgba(244, 63, 94, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "38px",
                margin: "0 auto 20px",
              }}>
                🔒
              </div>
              <div style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: "20px",
                background: "rgba(244, 63, 94, 0.2)",
                color: "#fb7185",
                fontWeight: "800",
                fontSize: "12px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "14px",
                border: "1px solid rgba(244, 63, 94, 0.3)",
              }}>
                403 Forbidden · SuperAdmin Clearance Required
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "12px" }}>
                Restricted Administration Zone
              </h2>
              <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", maxWidth: "580px", margin: "0 auto 24px" }}>
                You are currently signed in as <strong style={{ color: "#fff" }}>{activeUser.name}</strong> with clearance level <span style={{ color: "#38bdf8", fontWeight: "700" }}>{activeUser.role}</span> in <strong style={{ color: "#e2e8f0" }}>{activeUser.department || "Operations"}</strong>.
                Viewing internal organization rosters, altering permission roles, and revoking accounts are strictly restricted to <strong>SuperAdmin</strong> operators.
              </p>

              <div style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px", marginBottom: "28px", textAlign: "left", fontSize: "12px", color: "#94a3b8" }}>
                <div style={{ fontWeight: "700", color: "#e2e8f0", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🛡️</span> Role-Based Access Control (RBAC) Enforcement Policy:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>👑 <strong>SUPER_ADMIN</strong>: Global admin, user management & catalog</div>
                  <div>👔 <strong>MANAGER</strong>: Squad lead, triage approvals & reassignment</div>
                  <div>🛠️ <strong>ENGINEER</strong>: On-call incident remediation & code fixes</div>
                  <div>👤 <strong>USER</strong>: Incident reporting & personal ticket tracking</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="btn btn-ai"
                  style={{ padding: "10px 22px", fontSize: "13px" }}
                  onClick={() => { setAuthTab("switch"); setIsAuthModalOpen(true); }}
                >
                  🔄 Switch to SuperAdmin Account
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "10px 22px", fontSize: "13px" }}
                  onClick={() => setActiveTab("tickets")}
                >
                  🎫 Return to My Tickets
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800" }}>Team Directory & Role Mapping</h2>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Manage team members, define roles (SuperAdmin, Admin, Manager, Engineer), and switch active sessions.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => { setAuthTab("register"); setIsAuthModalOpen(true); }}>
                  👑 + Create Team Member
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px" }}>
                {users.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border-subtle)", borderRadius: "16px", gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
                    <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>No Team Members Yet</h3>
                    <p style={{ color: "var(--text-dim)", maxWidth: "450px", margin: "0 auto 20px", fontSize: "13px" }}>
                      All users have been cleared. Click below to create your team members with custom roles and engineering squads!
                    </p>
                    <button className="btn btn-primary" onClick={() => { setAuthTab("register"); setIsAuthModalOpen(true); }}>
                      + Create First Team Member & Role
                    </button>
                  </div>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className="kpi-card" style={{ borderColor: activeUser?.id === u.id ? "var(--accent-primary)" : undefined }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.1)" }} />
                        ) : (
                          <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "15px", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                            {activeUser?.id === u.id && (
                              <span style={{ fontSize: "10px", background: "var(--accent-primary)", padding: "2px 6px", borderRadius: "8px", fontWeight: "700" }}>YOU</span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <span className={`badge ${u.role === "SUPER_ADMIN" ? "badge-urgent" : u.role === "MANAGER" ? "badge-assigned" : "badge-medium"}`}>
                          {u.role === "SUPER_ADMIN" ? "👑 SUPER_ADMIN" : u.role}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>{u.department || "Operations"}</span>
                      </div>

                      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)" }}>
                        <span>Active Tickets: <strong style={{ color: "#fff" }}>{u._count?.assignedIssues ?? 0}</strong></span>
                        <span>Tasks: <strong style={{ color: "#fff" }}>{u._count?.tasks ?? 0}</strong></span>
                      </div>

                      {/* Inline Role Definition & Management */}
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>Role:</span>
                          <select
                            className="form-select"
                            style={{ padding: "4px 8px", fontSize: "12px", width: "auto" }}
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value as Role)}
                            title="Change user's permission role dynamically"
                          >
                            <option value="SUPER_ADMIN">👑 SuperAdmin</option>
                            <option value="MANAGER">👔 Manager</option>
                            <option value="ENGINEER">🛠️ Software Engineer</option>
                            <option value="ADMIN">🛡️ Operations Admin</option>
                            <option value="USER">👤 Reporter</option>
                          </select>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => handleLoginAs(u)}
                            title="Switch active session to this user"
                          >
                            {activeUser?.id === u.id ? "✓ Active" : "Log In →"}
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "4px 8px", fontSize: "11px", color: "#fb7185", background: "rgba(244, 63, 94, 0.15)" }}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete user"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 5: FIELD TASKS */}
      {activeTab === "tasks" && (
        <div className="task-section-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
                {isSuperAdmin ? "Operational Work Orders" : `${activeUser?.name || "User"}'s Work Orders`} ({filteredTasks.length})
              </h2>
              {activeUser?.role !== "USER" ? (
                <button className="btn btn-primary" onClick={() => setIsNewTaskOpen(true)}>+ Add Task</button>
              ) : (
                <span style={{ fontSize: "12px", color: "var(--text-dim)", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "6px" }}>
                  🔒 Tasks managed by Engineering
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredTasks.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)", color: "var(--text-muted)" }}>
                  <span>📋 No work orders assigned to you or linked to your tickets.</span>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div key={task.id} className="task-card-row">
                    <label className="task-checkbox-label">
                      <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={task.status === "DONE"}
                        onChange={() => handleToggleTask(task)}
                      />
                      <div className="task-content-block">
                        <div className={`task-row-title ${task.status === "DONE" ? "completed" : ""}`}>
                          {task.title}
                        </div>
                        <div className="task-row-meta">
                          {task.category && <span className="badge badge-cat" style={{ fontSize: "10px" }}>{task.category}</span>}
                          {task.issue && (
                            <span style={{ color: "var(--accent-cyan)", fontSize: "11px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); openTicketDetail(task.issue!.id); }}>
                              Linked to #TIK-{String(task.issue.ticketNumber).padStart(3, "0")}
                            </span>
                          )}
                          {task.dueDate && (
                            <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                              ⏰ Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`badge ${task.status === "DONE" ? "badge-resolved" : task.status === "IN_PROGRESS" ? "badge-progress" : "badge-open"}`}>
                        {task.status}
                      </span>
                      {task.owner && <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{task.owner.name}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sandbox-card">
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "14px" }}>Quick Dispatch Task</h3>
            {activeUser?.role === "USER" ? (
              <div style={{ textAlign: "center", padding: "28px 16px", background: "rgba(244, 63, 94, 0.08)", borderRadius: "12px", border: "1px solid rgba(244, 63, 94, 0.25)" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔒</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Work Order Dispatch Restricted</div>
                <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "16px" }}>
                  Reporters and end-users cannot dispatch technical work orders. Please submit an Incident Ticket instead.
                </p>
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setIsNewTicketOpen(true)}>
                  + Log Incident Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTask}>
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Test failover webhook on Billing Gateway"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Link to Incident Ticket</label>
                  <select
                    className="form-select"
                    value={taskForm.issueId}
                    onChange={(e) => setTaskForm({ ...taskForm, issueId: e.target.value })}
                  >
                    <option value="">No linked ticket (Standalone task)</option>
                    {(isSuperAdmin ? issues : myIssues).map((i) => (
                      <option key={i.id} value={i.id}>
                        #TIK-{String(i.ticketNumber).padStart(3, "0")}: {i.title.slice(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>

                <button className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }} type="submit" disabled={actionLoading}>
                  {actionLoading ? "Dispatching..." : "Dispatch Work Order"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AI INTELLIGENCE HUB */}
      {activeTab === "ai" && (
        <div>
          <div className="ai-briefing-panel" style={{ marginBottom: "24px" }}>
            <span className="ai-badge" style={{ marginBottom: "8px" }}>
              <span>🧠</span> Autonomous Application & Incident Recognition
            </span>
            <div className="ai-headline">How WorkMate AI Automatically Recognizes Your Websites and Apps</div>
            <p className="ai-summary-text">
              In real enterprise software operations, developers and automated APM trackers submit incident reports with URLs, stacktraces, or error codes. WorkMate AI analyzes the submission against the <strong>Service & Application Catalog</strong>, matches it to the exact registered microservice (e.g. <em>Billing Gateway</em> or <em>Web Portal</em>), tags the responsible Engineering Team, and assigns the on-call specialist!
            </p>
          </div>

          <div className="ai-sandbox-grid">
            <div className="sandbox-card">
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>⚡ Real-time Service & Incident Triage Sandbox</h3>

              <div className="form-group">
                <label className="form-label">Incident Symptom / Error Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={sandboxTitle}
                  onChange={(e) => setSandboxTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cluster / Location / URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={sandboxLocation}
                  onChange={(e) => setSandboxLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stacktrace / Detailed Error Logs</label>
                <textarea
                  className="form-textarea"
                  value={sandboxDesc}
                  onChange={(e) => setSandboxDesc(e.target.value)}
                />
              </div>

              <button className="btn btn-ai" style={{ width: "100%" }} onClick={handleRunSandboxTriage} disabled={aiAnalyzing}>
                {aiAnalyzing ? "Running Neural Diagnosis..." : "✨ Run Autonomous AI Diagnosis"}
              </button>
            </div>

            <div className="sandbox-card" style={{ borderColor: sandboxResult ? "rgba(168, 85, 247, 0.4)" : "var(--border-subtle)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>🎯 AI Diagnostic & Routing Output</h3>

              {!sandboxResult ? (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-dim)" }}>
                  Click "Run Autonomous AI Diagnosis" to analyze symptoms.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span className={`badge badge-${sandboxResult.predictedPriority.toLowerCase()}`}>
                      Priority: {sandboxResult.predictedPriority}
                    </span>
                    <span className="badge badge-cat">
                      Category: {sandboxResult.predictedCategory}
                    </span>
                    {sandboxResult.detectedDepartment && (
                      <span className="badge badge-assigned">
                        Dept: {sandboxResult.detectedDepartment}
                      </span>
                    )}
                  </div>

                  {sandboxResult.detectedServiceName && (
                    <div style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.3)", padding: "10px 14px", borderRadius: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-cyan)", textTransform: "uppercase" }}>Auto-Recognized Application</div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff" }}>🌐 {sandboxResult.detectedServiceName}</div>
                      <div style={{ fontSize: "12px", color: "#cbd5e1" }}>Target SLA: {sandboxResult.slaTargetMinutes || 30} minutes</div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Executive Summary</div>
                    <div style={{ fontSize: "13px", color: "#f1f5f9", lineHeight: "1.5" }}>{sandboxResult.summary}</div>
                  </div>

                  <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.25)", padding: "10px 12px", borderRadius: "10px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#e9d5ff", textTransform: "uppercase", marginBottom: "4px" }}>Root Cause Hypothesis</div>
                    <div style={{ fontSize: "13px", color: "#f8fafc" }}>{sandboxResult.rootCause}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Standard Operating Procedure (SOP) Checklist</div>
                    <div style={{ whiteSpace: "pre-line", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.6", background: "rgba(0,0,0,0.2)", padding: "10px 12px", borderRadius: "8px" }}>
                      {sandboxResult.suggestedAction}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TICKET DETAIL & REMEDIATION */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className="ticket-id" style={{ fontSize: "14px" }}>#TIK-{String(selectedIssue.ticketNumber).padStart(3, "0")}</span>
                <span className={`badge badge-${selectedIssue.priority.toLowerCase()}`}>{selectedIssue.priority}</span>
                <span className={`badge badge-${selectedIssue.status.toLowerCase()}`}>{selectedIssue.status}</span>
                {selectedIssue.slaBreached && <span className="badge badge-urgent">SLA BREACHED</span>}
                <span className="badge badge-cat">{selectedIssue.department || selectedIssue.category}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedIssue(null)}>✕</button>
            </div>

            <h2 className="modal-title" style={{ marginBottom: "6px" }}>{selectedIssue.title}</h2>

            {selectedIssue.serviceAsset && (
              <div style={{ fontSize: "13px", color: "var(--accent-cyan)", marginBottom: "12px", fontWeight: "700" }}>
                🌐 Affected Service: {selectedIssue.serviceAsset.name} ({selectedIssue.serviceAsset.type}) · SLA Target: {selectedIssue.serviceAsset.slaTargetMins}m
              </div>
            )}

            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "16px" }}>
              Reported by {selectedIssue.reporter?.name || "Operator"} · {selectedIssue.location ? `📍 ${selectedIssue.location}` : "No location"} · {new Date(selectedIssue.createdAt).toLocaleString()}
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: "10px", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
              {selectedIssue.description}
            </div>

            {/* AI Copilot Box */}
            <div style={{ background: "linear-gradient(135deg, rgba(30, 27, 75, 0.4), rgba(15, 23, 42, 0.6))", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "14px", padding: "16px 20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#e9d5ff", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>✨</span> WorkMate AI Incident Triage & SOP
                </span>
                <button className="btn btn-ai" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => handleRunAiTriageOnIssue(selectedIssue.id)} disabled={aiAnalyzing}>
                  {aiAnalyzing ? "Triaging..." : "⚡ Re-Triage"}
                </button>
              </div>

              {selectedIssue.aiSummary && <div style={{ fontSize: "13px", color: "#f1f5f9", marginBottom: "10px" }}>{selectedIssue.aiSummary}</div>}
              {selectedIssue.aiRootCause && <div style={{ fontSize: "12px", color: "#d8b4fe", marginBottom: "10px" }}><strong>Suspected Root Cause:</strong> {selectedIssue.aiRootCause}</div>}
              {selectedIssue.aiSuggestedAction && (
                <div style={{ whiteSpace: "pre-line", fontSize: "12px", color: "#cbd5e1", background: "rgba(0,0,0,0.25)", padding: "10px 12px", borderRadius: "8px" }}>
                  <strong>Recommended Remediation Steps:</strong>
                  {"\n" + selectedIssue.aiSuggestedAction}
                </div>
              )}
            </div>

            {/* Status & Assignment with RBAC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Workflow Status</label>
                  {activeUser?.role === "USER" && (
                    <span style={{ fontSize: "10px", color: "#fb7185", fontWeight: "700" }}>🔒 READ-ONLY</span>
                  )}
                  {activeUser?.role === "ENGINEER" && (
                    <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700" }}>🛠️ ENGINEER</span>
                  )}
                  {(activeUser?.role === "MANAGER" || activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN") && (
                    <span style={{ fontSize: "10px", color: "#34d399", fontWeight: "700" }}>✓ FULL CONTROL</span>
                  )}
                </div>
                <select
                  className="form-select"
                  value={selectedIssue.status}
                  disabled={activeUser?.role === "USER"}
                  onChange={(e) => handleUpdateStatus(selectedIssue.id, e.target.value as IssueStatus)}
                  title={activeUser?.role === "USER" ? "Reporters cannot alter technical workflow status" : "Update ticket workflow state"}
                  style={{ opacity: activeUser?.role === "USER" ? 0.6 : 1, cursor: activeUser?.role === "USER" ? "not-allowed" : "pointer" }}
                >
                  <option value="OPEN">Open (Unassigned)</option>
                  <option value="ASSIGNED">Assigned to Lead</option>
                  <option value="IN_PROGRESS">In Remediation</option>
                  <option value="RESOLVED">Resolved</option>
                  <option 
                    value="CLOSED" 
                    disabled={activeUser?.role === "ENGINEER"}
                  >
                    Closed & Verified {activeUser?.role === "ENGINEER" ? "(Manager Approval Required)" : ""}
                  </option>
                </select>
                {activeUser?.role === "USER" && (
                  <div style={{ fontSize: "11px", color: "#fb7185", marginTop: "4px" }}>
                    🔒 Workflow status can only be advanced by Assigned Engineers or Squad Leads.
                  </div>
                )}
                {activeUser?.role === "ENGINEER" && (
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    ℹ️ Marking as "Closed & Verified" requires Manager/SuperAdmin sign-off.
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="form-label" style={{ margin: 0 }}>Assigned Specialist</label>
                  {activeUser?.role !== "SUPER_ADMIN" && activeUser?.role !== "ADMIN" && activeUser?.role !== "MANAGER" ? (
                    <span style={{ fontSize: "10px", color: "#fb7185", fontWeight: "700" }}>🔒 LOCKED</span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#34d399", fontWeight: "700" }}>✓ LEAD / ADMIN</span>
                  )}
                </div>
                <select
                  className="form-select"
                  value={selectedIssue.assigneeId || ""}
                  disabled={activeUser?.role !== "SUPER_ADMIN" && activeUser?.role !== "ADMIN" && activeUser?.role !== "MANAGER"}
                  onChange={(e) => handleAssignTicket(selectedIssue.id, e.target.value)}
                  style={{
                    opacity: activeUser?.role !== "SUPER_ADMIN" && activeUser?.role !== "ADMIN" && activeUser?.role !== "MANAGER" ? 0.6 : 1,
                    cursor: activeUser?.role !== "SUPER_ADMIN" && activeUser?.role !== "ADMIN" && activeUser?.role !== "MANAGER" ? "not-allowed" : "pointer",
                  }}
                  title={activeUser?.role !== "SUPER_ADMIN" && activeUser?.role !== "ADMIN" && activeUser?.role !== "MANAGER" ? "Specialist reassignment requires Manager or SuperAdmin clearance" : "Reassign ticket specialist"}
                >
                  <option value="">Unassigned (Department Pool)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role} - {u.department})
                    </option>
                  ))}
                </select>
                {activeUser?.role !== "SUPER_ADMIN" && activeUser?.role !== "ADMIN" && activeUser?.role !== "MANAGER" && (
                  <div style={{ fontSize: "11px", color: "#fb7185", marginTop: "4px" }}>
                    🔒 Specialist reassignment requires Squad Lead (Manager) or SuperAdmin clearance.
                  </div>
                )}
              </div>
            </div>

            {/* Comments Thread */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>
                Collaboration & Updates ({selectedIssue.comments?.length || 0})
              </h3>

              <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {selectedIssue.comments?.map((c) => (
                  <div key={c.id} style={{ background: c.isAiGenerated ? "rgba(168, 85, 247, 0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${c.isAiGenerated ? "rgba(168, 85, 247, 0.25)" : "var(--border-subtle)"}`, borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px", color: "var(--text-dim)" }}>
                      <span style={{ fontWeight: "700", color: c.isAiGenerated ? "#c084fc" : "#fff" }}>
                        {c.isAiGenerated ? "🤖 WorkMate AI Advisory" : c.author?.name || "Engineer"}
                      </span>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#e2e8f0", whiteSpace: "pre-line" }}>{c.content}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Post technical update or remediation notes..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button className="btn btn-primary" type="submit" disabled={actionLoading}>Post</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG INCIDENT TICKET (WITH REAL SCENARIO APP SELECTION) */}
      {isNewTicketOpen && (
        <div className="modal-overlay" onClick={() => setIsNewTicketOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "780px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">🎫 Log New Incident / Ticket</h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Select an affected project/application or let WorkMate AI auto-triage from your stacktrace.
                </p>
              </div>
              <button className="close-btn" onClick={() => setIsNewTicketOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateTicket}>
              {/* 1. DYNAMIC PROJECT SELECTOR INTERFACE */}
              <div className="form-group" style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <label className="form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🖥️ Target Application / Monitored Project *</span>
                    <span style={{ fontSize: "11px", color: "var(--accent-cyan)", fontWeight: "600" }}>
                      ({services.length} Dynamic Projects)
                    </span>
                  </label>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {activeUser?.role === "SUPER_ADMIN" && (
                      <button
                        type="button"
                        onClick={handleOpenCreateService}
                        className="btn btn-secondary"
                        style={{ padding: "3px 10px", fontSize: "11px", borderColor: "rgba(168, 85, 247, 0.5)", color: "#c084fc", fontWeight: "700" }}
                        title="Add a new project directly from ticket screen"
                      >
                        👑 + Add Project
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setProjectSelectMode("cards")}
                      className={`btn ${projectSelectMode === "cards" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "3px 10px", fontSize: "11px" }}
                    >
                      🎴 Visual Project Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectSelectMode("dropdown")}
                      className={`btn ${projectSelectMode === "dropdown" ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "3px 10px", fontSize: "11px" }}
                    >
                      📋 Quick Dropdown
                    </button>
                  </div>
                </div>

                {/* INTERFACE OPTION 1: VISUAL PROJECT CARDS */}
                {projectSelectMode === "cards" ? (
                  <div className="project-card-grid">
                    {/* Auto-Detect with AI Card */}
                    <div
                      className={`project-card ${!ticketForm.serviceAssetId ? "selected" : ""}`}
                      onClick={() => handleSelectServiceForTicket("")}
                    >
                      {!ticketForm.serviceAssetId && <span className="check-pill">✓ AUTO-DETECT</span>}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "18px" }}>🤖</span>
                        <strong style={{ fontSize: "13px", color: "#fff" }}>AI Auto-Detect</strong>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.3" }}>
                        Neural recognition from error logs, URLs & stacktrace
                      </div>
                      <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                        <span className="badge badge-assigned" style={{ fontSize: "9px" }}>✨ Auto-SLA & Squad</span>
                      </div>
                    </div>

                    {/* Dynamic Applications & Projects from Database */}
                    {services.map((s) => {
                      const isSelected = ticketForm.serviceAssetId === s.id;
                      const icon = getServiceIcon(s.slug || s.type);
                      return (
                        <div
                          key={s.id}
                          className={`project-card ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectServiceForTicket(s.id)}
                          style={{ position: "relative" }}
                        >
                          {isSelected && <span className="check-pill">✓ SELECTED</span>}

                          {/* SuperAdmin Quick Edit Button */}
                          {activeUser?.role === "SUPER_ADMIN" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditService(s);
                              }}
                              title="Rename / Edit this project"
                              style={{
                                position: "absolute",
                                top: "8px",
                                right: isSelected ? "88px" : "8px",
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.18)",
                                borderRadius: "4px",
                                color: "#cbd5e1",
                                cursor: "pointer",
                                fontSize: "11px",
                                padding: "2px 6px",
                                zIndex: 2,
                              }}
                            >
                              ✏️
                            </button>
                          )}

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", paddingRight: activeUser?.role === "SUPER_ADMIN" ? "24px" : "0px" }}>
                            <span style={{ fontSize: "18px" }}>{icon}</span>
                            <strong style={{ fontSize: "13px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {s.name}
                            </strong>
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "6px" }}>
                            {s.department}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px" }}>
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: s.healthStatus === "OPERATIONAL" ? "rgba(52, 211, 153, 0.2)" : "rgba(251, 191, 36, 0.2)",
                                color: s.healthStatus === "OPERATIONAL" ? "#34d399" : "#fbbf24",
                                fontWeight: "700",
                              }}
                            >
                              ● {s.healthStatus}
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--accent-cyan)", fontWeight: "600" }}>
                              ⚡ {s.slaTargetMins}m SLA
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Project Card if SuperAdmin */}
                    {activeUser?.role === "SUPER_ADMIN" && (
                      <div
                        className="project-card"
                        onClick={handleOpenCreateService}
                        style={{
                          borderStyle: "dashed",
                          borderColor: "rgba(168, 85, 247, 0.45)",
                          background: "rgba(168, 85, 247, 0.06)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: "90px",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: "18px", marginBottom: "2px" }}>👑 ➕</span>
                        <strong style={{ fontSize: "12px", color: "#c084fc" }}>+ Add New Project</strong>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>SuperAdmin Authority</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* INTERFACE OPTION 2: STREAMLINED DROPDOWN */
                  <div>
                    <select
                      className="form-select"
                      value={ticketForm.serviceAssetId}
                      onChange={(e) => handleSelectServiceForTicket(e.target.value)}
                      style={{ fontSize: "13px", padding: "10px 12px" }}
                    >
                      <option value="">✨ Auto-Recognize with WorkMate AI (From Title & Error Logs)</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {getServiceIcon(s.slug || s.type)} {s.name} — {s.department} ({s.slaTargetMins}m SLA Target)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Active Project Confirmation Indicator */}
                {ticketForm.serviceAssetId ? (
                  (() => {
                    const activeService = services.find((s) => s.id === ticketForm.serviceAssetId);
                    if (!activeService) return null;
                    return (
                      <div style={{
                        marginTop: "10px",
                        padding: "8px 14px",
                        background: "linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.1))",
                        border: "1px solid rgba(99, 102, 241, 0.35)",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{getServiceIcon(activeService.slug || activeService.type)}</span>
                          <strong style={{ color: "#fff" }}>Target: {activeService.name}</strong>
                          <span className="badge badge-assigned" style={{ fontSize: "10px" }}>{activeService.department}</span>
                          <span style={{ color: "#38bdf8", fontSize: "11px", fontWeight: "700" }}>⚡ {activeService.slaTargetMins}m Target SLA</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectServiceForTicket("")}
                          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}
                        >
                          Clear (Switch to Auto-Detect)
                        </button>
                      </div>
                    );
                  })()
                ) : null}
              </div>

              {/* 2. INCIDENT TITLE & DETAILS */}
              <div className="form-group">
                <label className="form-label">Incident Title / Symptom</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    ticketForm.serviceAssetId
                      ? `e.g. Incident observed on ${services.find((s) => s.id === ticketForm.serviceAssetId)?.name || "selected application"}...`
                      : "e.g. 504 Gateway Timeout during checkout on /api/v1/billing"
                  }
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Responsible Engineering Squad</label>
                  <select
                    className="form-select"
                    value={ticketForm.department}
                    onChange={(e) => setTicketForm({ ...ticketForm, department: e.target.value })}
                  >
                    <option value="">✨ Auto-Route with WorkMate AI</option>
                    <option value="Backend & Core APIs">Backend & Core APIs</option>
                    <option value="Frontend & Mobile Engineering">Frontend & Mobile Engineering</option>
                    <option value="DevOps & Cloud SRE">DevOps & Cloud SRE</option>
                    <option value="Database & Platform Infrastructure">Database & Platform Infrastructure</option>
                    <option value="QA & Reliability Engineering">QA & Reliability Engineering</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority Assessment</label>
                  <select
                    className="form-select"
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as IssuePriority })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Immediate SLA)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Assign Lead / Specialist</label>
                  <select
                    className="form-select"
                    value={ticketForm.assigneeId}
                    onChange={(e) => setTicketForm({ ...ticketForm, assigneeId: e.target.value })}
                  >
                    <option value="">✨ Auto-Assign Lead with AI</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - {u.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Affected Endpoint / URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. https://api.workmate.ai/v1/billing or /analytics"
                    value={ticketForm.affectedUrl}
                    onChange={(e) => setTicketForm({ ...ticketForm, affectedUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Symptoms, Error Logs & Stacktrace</label>
                <textarea
                  className="form-textarea"
                  placeholder="Paste stacktrace, affected URL endpoint, HTTP status code, or observed error symptoms..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0 20px" }}>
                <input
                  type="checkbox"
                  id="autoAiCheck"
                  checked={ticketForm.runAiTriage}
                  onChange={(e) => setTicketForm({ ...ticketForm, runAiTriage: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)" }}
                />
                <label htmlFor="autoAiCheck" style={{ fontSize: "13px", color: "#e9d5ff", cursor: "pointer" }}>
                  ✨ WorkMate AI Auto-Pilot: Recognize application, set SLA deadline, and generate technical remediation checklist
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button className="btn btn-secondary" type="button" onClick={() => setIsNewTicketOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Submit Incident"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ENTERPRISE AUTHENTICATION & LOGIN PORTAL */}
      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => activeUser && setIsAuthModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {!activeUser ? "🔐 Sign In to WorkMate AI" : "⚡ Account & Identity Hub"}
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {!activeUser
                    ? "Enter your registered corporate email to access your role-based ticketing desk."
                    : `Logged in as ${activeUser.name} (${activeUser.role}). Switch accounts or edit your profile.`}
                </p>
              </div>
              {activeUser && (
                <button
                  className="close-btn"
                  onClick={() => setIsAuthModalOpen(false)}
                  title="Close modal"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Modal Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${authTab === "login" ? "active" : ""}`}
                onClick={() => setAuthTab("login")}
              >
                🔑 Sign In with Email
              </button>
              <button
                className={`auth-tab ${authTab === "switch" ? "active" : ""}`}
                onClick={() => setAuthTab("switch")}
              >
                👥 Team Directory ({users.length})
              </button>
              {(!activeUser || activeUser.role === "SUPER_ADMIN" || users.length === 0) && (
                <button
                  className={`auth-tab ${authTab === "register" ? "active" : ""}`}
                  onClick={() => setAuthTab("register")}
                >
                  👑 + Register Member
                </button>
              )}
              {activeUser && (
                <button
                  className={`auth-tab ${authTab === "profile" ? "active" : ""}`}
                  onClick={() => handleOpenEditProfile()}
                >
                  ✏️ My Profile
                </button>
              )}
            </div>

            {/* TAB 0: EMAIL + PASSWORD SIGN IN (PRODUCTION AUTHENTICATION) */}
            {authTab === "login" && (
              <div>
                <form onSubmit={handleEmailLogin} style={{ marginBottom: "20px" }}>
                  <div className="form-group" style={{ marginBottom: "14px" }}>
                    <label className="form-label" style={{ fontSize: "13px", fontWeight: "700" }}>
                      Work Email Address *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="email"
                        className="form-input"
                        style={{ paddingLeft: "38px", fontSize: "14px", height: "46px" }}
                        placeholder="e.g. gankitoshgupta52@gmail.com, gaashutoshgupta52@gmail.com..."
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginError) setLoginError("");
                        }}
                        required
                        autoFocus
                      />
                      <span style={{ position: "absolute", left: "13px", top: "13px", fontSize: "17px" }}>✉️</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className="form-label" style={{ fontSize: "13px", fontWeight: "700", marginBottom: 0 }}>
                        Account Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent-cyan)",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: 0,
                        }}
                      >
                        {showLoginPassword ? "🙈 Hide" : "👁️ Show"}
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        className="form-input"
                        style={{ paddingLeft: "38px", paddingRight: "38px", fontSize: "14px", height: "46px" }}
                        placeholder="Enter your account password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginError) setLoginError("");
                        }}
                        required
                      />
                      <span style={{ position: "absolute", left: "13px", top: "13px", fontSize: "17px" }}>🔒</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                        🔑 Default password for testing accounts: <code style={{ color: "var(--accent-cyan)", background: "rgba(56, 189, 248, 0.12)", padding: "1px 6px", borderRadius: "4px" }}>WorkMate@123</code>
                      </p>
                      <button
                        type="button"
                        onClick={() => setLoginPassword("WorkMate@123")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent-primary)",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        Fill Default
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div style={{
                      background: "rgba(244, 63, 94, 0.12)",
                      border: "1px solid rgba(244, 63, 94, 0.35)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "#fb7185",
                      fontSize: "12.5px",
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      <span>⚠️</span>
                      <span>{loginError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: "100%", height: "44px", fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    disabled={loginLoading}
                  >
                    {loginLoading ? "Authenticating with Neon Postgres..." : "Sign In to WorkMate AI →"}
                  </button>
                </form>

                {/* Quick Pick from Registered Accounts */}
                {users.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Or Click a Registered Account:
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--accent-cyan)" }}>
                        {users.length} Active Accounts
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto", paddingRight: "4px" }}>
                      {users.map((u) => {
                        const isCurrent = activeUser?.id === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleLoginAs(u)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "9px 14px",
                              background: isCurrent ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.03)",
                              border: `1px solid ${isCurrent ? "var(--accent-primary)" : "var(--border-subtle)"}`,
                              borderRadius: "10px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700" }}>
                                  {u.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>
                                  {u.name}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{u.email}</div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className={`badge ${u.role === "SUPER_ADMIN" ? "badge-urgent" : u.role === "MANAGER" ? "badge-assigned" : "badge-medium"}`} style={{ fontSize: "10px" }}>
                                {u.role === "SUPER_ADMIN" ? "👑 SUPER_ADMIN" : u.role}
                              </span>
                              <span style={{ fontSize: "12px", color: "var(--accent-primary)" }}>Log In →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: EXISTING ACCOUNTS */}
            {authTab === "switch" && (
              <div>
                {users.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border-subtle)" }}>
                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>👤</div>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>No accounts found in database</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "18px" }}>
                      Get started by registering your first user account and defining their role.
                    </p>
                    <button className="btn btn-primary" onClick={() => setAuthTab("register")}>
                      + Register First Team Member
                    </button>
                  </div>
                ) : (
                  <div className="auth-user-grid">
                    {users.map((u) => {
                      const isCurrent = activeUser?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          className="auth-user-card"
                          style={{
                            borderColor: isCurrent ? "var(--accent-primary)" : "var(--border-subtle)",
                            background: isCurrent ? "rgba(99, 102, 241, 0.08)" : undefined,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                                {u.name.charAt(0)}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "14px", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                                {isCurrent && <span style={{ fontSize: "10px", background: "var(--accent-primary)", padding: "2px 6px", borderRadius: "10px" }}>CURRENT</span>}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {u.email}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <span className={`badge ${u.role === "SUPER_ADMIN" ? "badge-urgent" : u.role === "MANAGER" ? "badge-assigned" : "badge-medium"}`}>
                              {u.role === "SUPER_ADMIN" ? "👑 SUPER_ADMIN" : u.role}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              {u.department || "Operations"}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, padding: "8px", fontSize: "12px" }}
                              onClick={() => handleLoginAs(u)}
                            >
                              {isCurrent ? "✓ Active Session" : `Log In as ${u.name.split(" ")[0]} →`}
                            </button>
                            {(!activeUser || activeUser.role === "SUPER_ADMIN") && (
                              <button
                                className="btn btn-danger"
                                style={{ padding: "8px 12px", fontSize: "12px", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Delete user (SuperAdmin only)"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: REGISTER NEW MEMBER */}
            {authTab === "register" && (
              <form onSubmit={handleCreateUser}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ankit Sharma"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Work Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="e.g. ankit@company.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Initial Account Password</span>
                    <span style={{ color: "var(--accent-cyan)", fontSize: "11px" }}>Default: WorkMate@123</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Leave blank to use default (WorkMate@123) or enter min 6 characters"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  />
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    The user will use this password to sign into the Web Portal and Mobile App.
                  </div>
                </div>

                {/* Role Definition Cards */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Permission Role & Capabilities *</span>
                    <span style={{ color: "var(--accent-cyan)", fontSize: "11px" }}>Selected: {userForm.role}</span>
                  </label>

                  <div className="role-card-grid">
                    {[
                      {
                        role: "SUPER_ADMIN",
                        icon: "👑",
                        title: "SuperAdmin / VP",
                        desc: "Full unrestricted platform control, microservice catalog, delete & manage users.",
                      },
                      {
                        role: "MANAGER",
                        icon: "👔",
                        title: "Engineering Manager",
                        desc: "Tech Lead oversight, dispatch work orders, triage approvals, workload rebalancing.",
                      },
                      {
                        role: "ENGINEER",
                        icon: "🛠️",
                        title: "Software Engineer",
                        desc: "Claim on-call incidents, run AI diagnostics, submit PRs, resolve error tickets.",
                      },
                      {
                        role: "ADMIN",
                        icon: "🛡️",
                        title: "Platform Admin",
                        desc: "Manage SLA thresholds, service health statuses, queue routing configurations.",
                      },
                      {
                        role: "USER",
                        icon: "👤",
                        title: "Reporter / Developer",
                        desc: "Submit bug tickets, track status, post comments, follow incident progress.",
                      },
                    ].map((r) => (
                      <div
                        key={r.role}
                        className={`role-card ${userForm.role === r.role ? "selected" : ""}`}
                        onClick={() => {
                          const isSuperAdmin = r.role === "SUPER_ADMIN";
                          setUserForm({
                            ...userForm,
                            role: r.role as Role,
                            department: isSuperAdmin
                              ? "All Engineering Squads (Global)"
                              : userForm.department === "All Engineering Squads (Global)"
                              ? "Backend & Core APIs"
                              : userForm.department,
                          });
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "16px" }}>{r.icon}</span>
                          <span style={{ fontSize: "13px", fontWeight: "800" }}>{r.title}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                          {r.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Engineering Squad / Department</span>
                      {userForm.role === "SUPER_ADMIN" && (
                        <span style={{ color: "var(--accent-cyan)", fontSize: "11px", fontWeight: "700" }}>
                          👑 Locked: All Squads (SuperAdmin)
                        </span>
                      )}
                    </label>
                    <select
                      className="form-select"
                      value={userForm.role === "SUPER_ADMIN" ? "All Engineering Squads (Global)" : userForm.department}
                      onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                      disabled={userForm.role === "SUPER_ADMIN"}
                      style={{
                        opacity: userForm.role === "SUPER_ADMIN" ? 0.6 : 1,
                        cursor: userForm.role === "SUPER_ADMIN" ? "not-allowed" : "pointer",
                        background: userForm.role === "SUPER_ADMIN" ? "rgba(255,255,255,0.04)" : undefined,
                      }}
                    >
                      {userForm.role === "SUPER_ADMIN" && (
                        <option value="All Engineering Squads (Global)">
                          🌐 All Engineering Squads (Global / Cross-Functional)
                        </option>
                      )}
                      <option value="Backend & Core APIs">Backend & Core APIs</option>
                      <option value="Frontend & Mobile Engineering">Frontend & Mobile Engineering</option>
                      <option value="DevOps & Cloud SRE">DevOps & Cloud SRE</option>
                      <option value="Database & Platform Infrastructure">Database & Platform Infrastructure</option>
                      <option value="QA & Reliability Engineering">QA & Reliability Engineering</option>
                      <option value="Information Security & SecOps">Information Security & SecOps</option>
                    </select>
                    {userForm.role === "SUPER_ADMIN" && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                        SuperAdmins automatically oversee all engineering squads across the entire platform.
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Profile Avatar</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Optional custom image URL"
                      value={userForm.avatar}
                      onChange={(e) => setUserForm({ ...userForm, avatar: e.target.value })}
                    />
                    <div className="avatar-preset-picker">
                      <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Presets:</span>
                      {AVATAR_PRESETS.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="avatar preset"
                          className={`avatar-preset-img ${userForm.avatar === url ? "selected" : ""}`}
                          onClick={() => setUserForm({ ...userForm, avatar: url })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                  {activeUser && (
                    <button className="btn btn-secondary" type="button" onClick={() => setIsAuthModalOpen(false)}>
                      Cancel
                    </button>
                  )}
                  <button className="btn btn-primary" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "✨ Create Account & Sign In"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: SELF-SERVICE PROFILE & AVATAR EDITOR */}
            {authTab === "profile" && activeUser && (
              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px", background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ position: "relative" }}>
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt="Profile preview"
                        style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid #38bdf8", boxShadow: "0 0 16px rgba(56, 189, 248, 0.3)" }}
                      />
                    ) : (
                      <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "800", color: "#fff" }}>
                        {profileName ? profileName.charAt(0).toUpperCase() : activeUser.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>
                      {profileName || activeUser.name}
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Role: <strong style={{ color: "#38bdf8" }}>{activeUser.role}</strong> · {profileDepartment || activeUser.department || "Operations"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <label className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>📁</span> Upload Image File
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFileUpload} />
                      </label>
                      {profileAvatar && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: "6px 10px", fontSize: "11px" }}
                          onClick={() => setProfileAvatar("")}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Aashutosh Kumar"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Corporate Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="e.g. aashutosh@enterprise.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Department / Engineering Squad</span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        🔒 Locked (SuperAdmin Managed)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={profileDepartment}
                      disabled
                      readOnly
                      style={{
                        opacity: 0.65,
                        cursor: "not-allowed",
                        background: "rgba(255,255,255,0.03)",
                        borderColor: "rgba(255,255,255,0.08)",
                        color: "var(--text-muted)",
                      }}
                      title="Department & Squad assignments can only be changed by a SuperAdmin"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Profile Picture URL (or Pick a Preset Below)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />

                  <div style={{ marginTop: "10px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                      Quick Select Professional Preset Avatars:
                    </span>
                    <div className="avatar-preset-picker">
                      {AVATAR_PRESETS.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt="avatar preset"
                          className={`avatar-preset-img ${profileAvatar === url ? "selected" : ""}`}
                          onClick={() => setProfileAvatar(url)}
                          title="Click to select this avatar"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setIsAuthModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={profileSaving}>
                    {profileSaving ? "Saving..." : "✓ Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: SUPERADMIN REGISTER / EDIT SERVICE & APP */}
      {isNewServiceOpen && (
        <div className="modal-overlay" onClick={() => { setIsNewServiceOpen(false); setEditingService(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingService ? `✏️ Rename & Edit Project: ${editingService.name}` : "👑 Register New Application / Project"}
              </h2>
              <button className="close-btn" onClick={() => { setIsNewServiceOpen(false); setEditingService(null); }}>✕</button>
            </div>

            <form onSubmit={handleSaveService}>
              <div className="form-group">
                <label className="form-label">Project / Application Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Analytics Real-time Streaming API"
                  value={serviceForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setServiceForm((prev) => ({
                      ...prev,
                      name: newName,
                      slug: !editingService && (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
                        ? newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                        : prev.slug,
                    }));
                  }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Project Slug / System Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. analytics-stream-api"
                    value={serviceForm.slug}
                    onChange={(e) => setServiceForm({ ...serviceForm, slug: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Type</label>
                  <select
                    className="form-select"
                    value={serviceForm.type}
                    onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value as any })}
                  >
                    <option value="WEB_APP">Web Application / Portal (Next.js/React)</option>
                    <option value="API_SERVICE">Backend Microservice / REST / GraphQL</option>
                    <option value="MOBILE_APP">Mobile Client (iOS/Android React Native)</option>
                    <option value="CLOUD_INFRA">Cloud Infrastructure / Kubernetes EKS</option>
                    <option value="DATABASE">PostgreSQL / Redis Storage Cluster</option>
                    <option value="HARDWARE">Physical Server / Network Rack</option>
                    <option value="FACILITY">Data Center / Office Facility</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Responsible Engineering Team</label>
                  <select
                    className="form-select"
                    value={serviceForm.department}
                    onChange={(e) => setServiceForm({ ...serviceForm, department: e.target.value })}
                  >
                    <option value="Backend & Core APIs">Backend & Core APIs</option>
                    <option value="Frontend & Mobile Engineering">Frontend & Mobile Engineering</option>
                    <option value="DevOps & Cloud SRE">DevOps & Cloud SRE</option>
                    <option value="Database & Platform Infrastructure">Database & Platform Infrastructure</option>
                    <option value="QA & Reliability Engineering">QA & Reliability Engineering</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target SLA Resolution Time</label>
                  <select
                    className="form-select"
                    value={serviceForm.slaTargetMins}
                    onChange={(e) => setServiceForm({ ...serviceForm, slaTargetMins: Number(e.target.value) })}
                  >
                    <option value={15}>15 Minutes (Mission Critical)</option>
                    <option value={30}>30 Minutes (High Priority)</option>
                    <option value={60}>60 Minutes (Standard)</option>
                    <option value={120}>120 Minutes (Extended)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">URL / Hostname / Cloud Endpoint</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. https://stream.workmate.ai or Building 4 NOC"
                  value={serviceForm.urlOrLocation}
                  onChange={(e) => setServiceForm({ ...serviceForm, urlOrLocation: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Architecture Notes</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: "70px" }}
                  placeholder="Operational responsibilities, failover policies, or deployment notes..."
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                {editingService ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ background: "rgba(244, 63, 94, 0.15)", color: "#fb7185", border: "1px solid rgba(244, 63, 94, 0.3)" }}
                    onClick={() => {
                      const id = editingService.id;
                      const name = editingService.name;
                      setIsNewServiceOpen(false);
                      setEditingService(null);
                      void handleDeleteService(id, name);
                    }}
                  >
                    🗑️ Delete Project
                  </button>
                ) : <div />}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => { setIsNewServiceOpen(false); setEditingService(null); }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Saving..." : editingService ? "✓ Save Project Changes" : "Create Project"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DISPATCH WORK ORDER TASK */}
      {isNewTaskOpen && (
        <div className="modal-overlay" onClick={() => setIsNewTaskOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Work Order Task</h2>
              <button className="close-btn" onClick={() => setIsNewTaskOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Work Order Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Verify Stripe fallback routing on payment cluster"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    className="form-select"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: Number(e.target.value) })}
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                    <option value={4}>Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Link to Incident Ticket</label>
                <select
                  className="form-select"
                  value={taskForm.issueId}
                  onChange={(e) => setTaskForm({ ...taskForm, issueId: e.target.value })}
                >
                  <option value="">No linked ticket (Standalone task)</option>
                  {(isSuperAdmin ? issues : myIssues).map((i) => (
                    <option key={i.id} value={i.id}>
                      #TIK-{String(i.ticketNumber).padStart(3, "0")}: {i.title.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button className="btn btn-secondary" type="button" onClick={() => setIsNewTaskOpen(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={actionLoading}>Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
