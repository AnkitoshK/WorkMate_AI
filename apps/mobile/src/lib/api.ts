import Constants from "expo-constants";
import { Platform } from "react-native";
import { storage } from "./storage";

/**
 * Dynamically resolves the API Server URL:
 * 1. Web browser environment: Always prioritizes window.location.hostname so localhost:3000 connects to localhost:4000.
 * 2. Manually saved custom endpoint by user (clearing old stale hardcoded IPs).
 * 3. On Physical Mobile Devices in Expo Go: dynamically extracts the computer's current LAN IP from Constants.expoConfig?.hostUri.
 * 4. Explicit environment variable EXPO_PUBLIC_API_URL (if not the stale default).
 * 5. Android Emulator loopback fallback (10.0.2.2:4000).
 * 6. Default fallback: http://localhost:4000.
 */
export function getApiUrl(): string {
  // 1. Web browser environment: ALWAYS use the active web hostname (e.g. localhost or current PC LAN IP)
  if (Platform.OS === "web" || (typeof window !== "undefined" && window.location)) {
    const hostname = (typeof window !== "undefined" && window.location?.hostname) || "localhost";
    return `http://${hostname}:4000`;
  }

  // 2. Manually saved custom endpoint by user
  const custom = storage.getItem("workmate_api_endpoint");
  if (custom && custom.trim()) {
    const trimmed = custom.trim().replace(/\/$/, "");
    // Ignore obsolete stale hardcoded IP from previous sessions
    if (trimmed !== "http://192.168.137.200:4000") {
      return trimmed;
    }
  }

  // 3. Physical Android / iOS device running Expo Go:
  // Metro bundler dynamically knows the computer's current Wi-Fi IP every morning!
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:4000`;
    }
  }

  // 4. Explicit environment variable (if set and not the stale IP)
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/$/, "");
    if (envUrl !== "http://192.168.137.200:4000") {
      return envUrl;
    }
  }

  // 5. Android Emulator loopback
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  // 6. Universal default fallback
  return "http://localhost:4000";
}

export function saveCustomApiUrl(url: string): void {
  if (url && url.trim()) {
    storage.setItem("workmate_api_endpoint", url.trim().replace(/\/$/, ""));
  } else {
    storage.removeItem("workmate_api_endpoint");
  }
}

export async function testApiHealth(targetUrl?: string): Promise<{ ok: boolean; message: string; url: string }> {
  const base = targetUrl ? targetUrl.replace(/\/$/, "") : getApiUrl();
  try {
    const res = await fetch(`${base}/health`, { method: "GET" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, message: `Connected to ${data.service || "WorkMate API"} v${data.version || "1.0"}`, url: base };
    }
    return { ok: false, message: `HTTP status ${res.status}: ${res.statusText}`, url: base };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to connect", url: base };
  }
}

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "ENGINEER" | "USER";

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string | null;
  avatar?: string | null;
  _count?: { assignedIssues?: number; tasks?: number };
}

export interface MobileTask {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: number;
  category?: string | null;
  dueDate?: string | null;
  ownerId: string;
  owner?: { id: string; name: string } | null;
  issueId?: string | null;
  issue?: { id: string; ticketNumber: number; title: string; status: string; priority: string } | null;
}

export interface MobileComment {
  id: string;
  content: string;
  isAiGenerated: boolean;
  createdAt: string;
  author: { id: string; name: string; role: Role; avatar?: string | null };
}

export interface MobileIssue {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: string;
  department?: string | null;
  location?: string | null;
  aiSummary?: string | null;
  aiSuggestedAction?: string | null;
  aiRootCause?: string | null;
  aiConfidence?: number | null;
  slaDeadline?: string | null;
  slaBreached?: boolean;
  reporterId: string;
  assigneeId?: string | null;
  reporter?: { id: string; name: string; email: string; role: Role; avatar?: string | null; department?: string | null } | null;
  assignee?: { id: string; name: string; email: string; role: Role; avatar?: string | null; department?: string | null } | null;
  comments?: MobileComment[];
  tasks?: MobileTask[];
  createdAt: string;
}

// 1. Fetch Users
export async function fetchUsers(): Promise<MobileUser[]> {
  const res = await fetch(`${getApiUrl()}/api/users`);
  if (!res.ok) throw new Error("Failed to load users from API");
  return res.json();
}

// 2. Register New User
export async function registerUser(data: {
  name: string;
  email: string;
  password?: string;
  role: Role;
  department?: string;
  avatar?: string;
}): Promise<MobileUser> {
  const res = await fetch(`${getApiUrl()}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to register user");
  }
  return res.json();
}

// 3. Fetch Tasks
export async function fetchTasks(): Promise<MobileTask[]> {
  const res = await fetch(`${getApiUrl()}/api/tasks`);
  if (!res.ok) throw new Error("Failed to load tasks from API");
  return res.json();
}

// 4. Create Task
export async function createTask(data: {
  title: string;
  category?: string;
  priority?: number;
  ownerId: string;
  issueId?: string;
}): Promise<MobileTask> {
  const res = await fetch(`${getApiUrl()}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create task");
  }
  return res.json();
}

// 5. Toggle Task Status
export async function toggleTaskStatus(id: string, currentStatus: string): Promise<MobileTask> {
  const nextStatus = currentStatus === "DONE" ? "TODO" : "DONE";
  const res = await fetch(`${getApiUrl()}/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: nextStatus }),
  });
  if (!res.ok) throw new Error("Failed to update task status");
  return res.json();
}

// 6. Fetch Issues
export async function fetchIssues(): Promise<MobileIssue[]> {
  const res = await fetch(`${getApiUrl()}/api/issues`);
  if (!res.ok) throw new Error("Failed to load issues from API");
  return res.json();
}

// 7. Fetch Single Issue Detail
export async function fetchIssueById(id: string): Promise<MobileIssue> {
  const res = await fetch(`${getApiUrl()}/api/issues/${id}`);
  if (!res.ok) throw new Error("Failed to load issue details");
  return res.json();
}

// 8. Create Issue with AI Triage
export async function createIssue(data: {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  department?: string;
  location?: string;
  reporterId: string;
  assigneeId?: string;
  runAiTriage?: boolean;
}): Promise<MobileIssue> {
  const res = await fetch(`${getApiUrl()}/api/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create issue");
  }
  return res.json();
}

// 9. Update Issue (e.g. Status change)
export async function updateIssue(id: string, data: Partial<{ status: string; priority: string; assigneeId: string }>): Promise<MobileIssue> {
  const res = await fetch(`${getApiUrl()}/api/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update issue");
  }
  return res.json();
}

// 10. Add Comment to Issue
export async function addComment(issueId: string, authorId: string, content: string): Promise<MobileComment> {
  const res = await fetch(`${getApiUrl()}/api/issues/${issueId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authorId, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to post comment");
  }
  return res.json();
}

// 11. Update User Profile
export async function updateUser(
  id: string,
  data: Partial<{ name: string; email: string; department: string; avatar: string; role: Role }>
): Promise<MobileUser> {
  const res = await fetch(`${getApiUrl()}/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }
  return res.json();
}
