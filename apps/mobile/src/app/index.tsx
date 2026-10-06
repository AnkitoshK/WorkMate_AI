import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchUsers,
  fetchIssues,
  fetchTasks,
  createIssue,
  updateIssue,
  createTask,
  toggleTaskStatus,
  addComment,
  registerUser,
  updateUser,
  getApiUrl,
  saveCustomApiUrl,
  testApiHealth,
  MobileUser,
  MobileIssue,
  MobileTask,
  Role,
} from "../lib/api";
import { storage, setActiveUserSession, clearActiveUserSession } from "../lib/storage";

const STORAGE_KEY = "workmate_mobile_active_user_id";

const MOBILE_AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
];

export default function WorkMateMobileApp() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"issues" | "tasks" | "report">("issues");

  // Core Data
  const [users, setUsers] = useState<MobileUser[]>([]);
  const [activeUser, setActiveUser] = useState<MobileUser | null>(null);
  const [issues, setIssues] = useState<MobileIssue[]>([]);
  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "switch" | "register" | "profile">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<MobileIssue | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiUrl());
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: string; ok?: boolean }>({ testing: false });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<"MY_WORK" | "ALL_ORG" | "ASSIGNED">("MY_WORK");

  // Form: Report Incident
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportCategory, setReportCategory] = useState("SOFTWARE");
  const [reportPriority, setReportPriority] = useState("HIGH");
  const [reportLocation, setReportLocation] = useState("");
  const [reportDepartment, setReportDepartment] = useState("Backend & Core APIs");
  const [runAiTriage, setRunAiTriage] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form: New Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("Code Fix");
  const [taskPriority, setTaskPriority] = useState(2);
  const [taskIssueId, setTaskIssueId] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Form: Registration
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("ENGINEER");
  const [regDept, setRegDept] = useState("Frontend & Mobile Engineering");
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Form: Edit Profile (Self-Service)
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDept, setProfileDept] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Detail Comment
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const handleOpenEditProfile = (u?: MobileUser) => {
    const target = u || activeUser;
    if (!target) return;
    setProfileName(target.name);
    setProfileEmail(target.email);
    setProfileDept(target.department || "");
    setProfileAvatar(target.avatar || "");
    setAuthTab("profile");
    setIsAuthModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!activeUser) return;
    if (!profileName.trim()) {
      alert("Name cannot be empty.");
      return;
    }
    try {
      setProfileSubmitting(true);
      const updated = await updateUser(activeUser.id, {
        name: profileName.trim(),
        email: profileEmail.trim() || undefined,
        avatar: profileAvatar.trim() || undefined,
      });

      setActiveUser(updated);
      setActiveUserSession(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      alert("✓ Profile updated successfully!");
      setIsAuthModalOpen(false);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  // 1. Initial Data Fetch
  const loadData = useCallback(async () => {
    try {
      setErrorMsg("");
      const [uList, iList, tList] = await Promise.all([
        fetchUsers(),
        fetchIssues(),
        fetchTasks(),
      ]);

      setUsers(uList);
      setIssues(iList);
      setTasks(tList);

      // Session Restoration
      const savedId = storage.getItem(STORAGE_KEY);
      if (savedId && uList.length > 0) {
        const found = uList.find((u) => u.id === savedId);
        if (found) {
          setActiveUser(found);
          setActiveUserSession(found);
          setIsAuthModalOpen(false);
        } else {
          setActiveUser(null);
          setAuthTab("login");
          setIsAuthModalOpen(true);
        }
      } else if (!activeUser && uList.length > 0) {
        setAuthTab("login");
        setIsAuthModalOpen(true);
      }
    } catch (err: any) {
      const activeEndpoint = getApiUrl();
      const rawMsg = err?.message || "Connection refused";
      if (rawMsg.includes("127.0.0.1") || rawMsg.includes("localhost") || rawMsg.includes("ConnectException")) {
        setErrorMsg(
          `Physical phones cannot reach 'localhost'. Tap 'Server IP' to connect via your computer's Wi-Fi IP (detected: ${activeEndpoint})`
        );
      } else if (rawMsg.includes("Failed to fetch") || rawMsg.includes("Network request failed") || rawMsg.includes("Connection refused")) {
        setErrorMsg(
          `Backend server offline or unreachable at ${activeEndpoint}. Run 'pnpm dev' or 'pnpm dev:api' to start it.`
        );
      } else {
        setErrorMsg(`${rawMsg} (Server: ${activeEndpoint})`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true, result: "Connecting to " + serverUrlInput + "..." });
    const res = await testApiHealth(serverUrlInput);
    setTestStatus({ testing: false, result: res.message, ok: res.ok });
  };

  const handleSaveServerUrl = () => {
    saveCustomApiUrl(serverUrlInput);
    setIsServerModalOpen(false);
    loadData();
  };

  const handleResetServerUrl = () => {
    saveCustomApiUrl(""); // Clear manual override so it uses dynamic auto-detection
    const defaultUrl = getApiUrl();
    setServerUrlInput(defaultUrl);
    setTestStatus({ testing: false, result: `Reset to auto-detected endpoint: ${defaultUrl}`, ok: true });
    loadData();
  };

  // 2. Authentication Actions
  const handleLoginAs = (user: MobileUser) => {
    setActiveUser(user);
    storage.setItem(STORAGE_KEY, user.id);
    setActiveUserSession(user);
    setLoginError("");
    setLoginEmail("");
    setLoginPassword("");
    setIsAuthModalOpen(false);
  };

  const handleEmailLogin = async () => {
    if (!loginEmail.trim()) {
      setLoginError("Please enter your corporate email.");
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError("Please enter your account password.");
      return;
    }
    try {
      setLoginLoading(true);
      setLoginError("");
      const res = await fetch(`${getApiUrl()}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed. Verify email and password.");
      }
      handleLoginAs(data.user);
      setLoginPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    storage.removeItem(STORAGE_KEY);
    clearActiveUserSession();
    setActiveUser(null);
    setLoginError("");
    setLoginEmail("");
    setLoginPassword("");
    setAuthTab("login");
    setIsAuthModalOpen(true);
  };

  const handleRegister = async () => {
    if (activeUser && activeUser.role !== "SUPER_ADMIN" && users.length > 0) {
      alert("🔒 SuperAdmin Authority Required: Only SuperAdmins can register new users and assign roles.");
      return;
    }
    if (!regName.trim() || !regEmail.trim()) {
      alert("Please provide both name and email.");
      return;
    }
    try {
      setRegSubmitting(true);
      const newUser = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim() || undefined,
        role: regRole,
        department: regDept,
      });
      setUsers((prev) => [...prev, newUser]);
      handleLoginAs(newUser);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
    } catch (err: any) {
      alert("Registration failed: " + err.message);
    } finally {
      setRegSubmitting(false);
    }
  };

  // 3. Security & Role Scoping
  const isSuperAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN";

  // Filtered Issues (Zero data leak: Regular users strictly see their own tickets)
  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      // Search matching
      const matchesSearch =
        iss.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        iss.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (iss.location && iss.location.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === "ALL" || iss.status === statusFilter;

      // Role & User Scope Security
      let matchesScope = true;
      if (activeUser) {
        if (!isSuperAdmin) {
          // Regular user / Engineer (e.g. Aashutosh): STRICTLY own work
          if (scopeFilter === "ASSIGNED") {
            matchesScope = iss.assigneeId === activeUser.id;
          } else {
            // Default: Assigned to me OR Reported by me
            matchesScope = iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id;
          }
        } else {
          // SuperAdmin: Can view All Org or toggle to personal
          if (scopeFilter === "ASSIGNED") {
            matchesScope = iss.assigneeId === activeUser.id;
          } else if (scopeFilter === "MY_WORK") {
            matchesScope = iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id;
          } else {
            matchesScope = true; // ALL_ORG
          }
        }
      }

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [issues, searchQuery, statusFilter, scopeFilter, activeUser, isSuperAdmin]);

  // Filtered Tasks (Only user's owned tasks or tasks linked to their tickets)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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
  }, [tasks, issues, activeUser, isSuperAdmin]);

  const myTicketsCount = useMemo(() => {
    if (!activeUser) return 0;
    return issues.filter((i) => i.assigneeId === activeUser.id || i.reporterId === activeUser.id).length;
  }, [issues, activeUser]);

  // 4. Ticket Lifecycle Handlers
  const handleToggleTask = async (task: MobileTask) => {
    try {
      await toggleTaskStatus(task.id, task.status);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: t.status === "DONE" ? "TODO" : "DONE" } : t))
      );
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleCreateReport = async () => {
    if (!reportTitle.trim() || !reportDesc.trim()) {
      alert("Please provide both title and description.");
      return;
    }
    if (!activeUser) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      const newIssue = await createIssue({
        title: reportTitle.trim(),
        description: reportDesc.trim(),
        category: reportCategory,
        priority: reportPriority,
        location: reportLocation.trim() || undefined,
        department: reportDepartment,
        reporterId: activeUser.id,
        runAiTriage,
      });

      setIssues((prev) => [newIssue, ...prev]);
      setReportTitle("");
      setReportDesc("");
      setReportLocation("");
      setActiveTab("issues");
      alert(`✓ Incident #${newIssue.ticketNumber} logged and analyzed by AI Copilot!`);
    } catch (err: any) {
      alert(err.message || "Failed to submit incident report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, nextStatus: string) => {
    try {
      const updated = await updateIssue(issueId, { status: nextStatus });
      setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: updated.status } : i)));
      if (selectedIssue?.id === issueId) {
        setSelectedIssue((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleAddComment = async () => {
    if (!selectedIssue || !newComment.trim() || !activeUser) return;
    try {
      setCommentSubmitting(true);
      const comment = await addComment(selectedIssue.id, activeUser.id, newComment.trim());
      setSelectedIssue((prev) => (prev ? { ...prev, comments: [...(prev.comments || []), comment] } : null));
      setNewComment("");
    } catch (err: any) {
      alert("Failed to post comment: " + err.message);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !activeUser) return;
    try {
      setTaskSubmitting(true);
      const newTask = await createTask({
        title: taskTitle.trim(),
        category: taskCategory,
        priority: Number(taskPriority),
        ownerId: activeUser.id,
        issueId: taskIssueId || undefined,
      });
      setTasks((prev) => [newTask, ...prev]);
      setTaskTitle("");
      setIsNewTaskModalOpen(false);
    } catch (err: any) {
      alert("Failed to dispatch task: " + err.message);
    } finally {
      setTaskSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Enterprise Mobile Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.brandIcon}>⚡</Text>
            <View>
              <Text style={styles.headerBrand}>WorkMate AI Mobile</Text>
              <TouchableOpacity
                style={styles.connectionStatusPill}
                onPress={() => {
                  setServerUrlInput(getApiUrl());
                  setTestStatus({ testing: false });
                  setIsServerModalOpen(true);
                }}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: errorMsg ? "#ef4444" : "#10b981" },
                  ]}
                />
                <Text style={styles.connectionStatusText}>
                  {errorMsg ? "Server Offline (Tap to config)" : getApiUrl().replace("http://", "")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* User Session & Role Pill */}
          {activeUser ? (
            <TouchableOpacity style={styles.userProfilePill} onPress={() => handleOpenEditProfile()}>
              <View style={styles.avatarCircle}>
                {activeUser.avatar ? (
                  <Image source={{ uri: activeUser.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{activeUser.name.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>
              <View>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {activeUser.name.split(" ")[0]}
                </Text>
                <Text
                  style={[
                    styles.roleBadge,
                    isSuperAdmin ? styles.roleSuperAdmin : styles.roleEngineer,
                  ]}
                >
                  {activeUser.role}
                </Text>
              </View>
              <Text style={styles.switchIcon}>✏️</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginBtn} onPress={() => setIsAuthModalOpen(true)}>
              <Text style={styles.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Security & Scope Banner */}
        <View style={styles.scopeBanner}>
          <Text style={styles.scopeBannerText}>
            {isSuperAdmin
              ? "👑 SuperAdmin View: Accessing all enterprise squad queues"
              : activeUser
              ? `🔒 Secure Workspace: Scoped strictly to ${activeUser.name}`
              : "🔐 Sign In Required"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {activeUser ? (
              <>
                <TouchableOpacity onPress={() => handleOpenEditProfile()}>
                  <Text style={{ fontSize: 10, color: "#38bdf8", fontWeight: "700" }}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAuthTab("switch"); setIsAuthModalOpen(true); }}>
                  <Text style={{ fontSize: 10, color: "#a5b4fc", fontWeight: "700" }}>Switch</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout}>
                  <Text style={styles.logoutLink}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => { setAuthTab("login"); setIsAuthModalOpen(true); }}>
                <Text style={{ fontSize: 11, color: "#38bdf8", fontWeight: "800" }}>Sign In →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Primary Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "issues" && styles.tabBtnActive]}
            onPress={() => setActiveTab("issues")}
          >
            <Text style={[styles.tabText, activeTab === "issues" && styles.tabTextActive]}>
              🎫 Tickets ({filteredIssues.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "tasks" && styles.tabBtnActive]}
            onPress={() => setActiveTab("tasks")}
          >
            <Text style={[styles.tabText, activeTab === "tasks" && styles.tabTextActive]}>
              📋 Work Orders ({filteredTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "report" && styles.tabBtnActive]}
            onPress={() => setActiveTab("report")}
          >
            <Text style={[styles.tabText, activeTab === "report" && styles.tabTextActive]}>
              + Log Incident
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 6 }}>
            <TouchableOpacity
              onPress={() => {
                setServerUrlInput(getApiUrl());
                setTestStatus({ testing: false });
                setIsServerModalOpen(true);
              }}
              style={styles.configBtn}
            >
              <Text style={styles.configBtnText}>⚙️ Server IP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Syncing encrypted telemetry...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
          {/* TAB 1: TICKETS VIEW */}
          {activeTab === "issues" && (
            <View style={styles.tabContent}>
              {/* Search & Quick Filter Pills */}
              <View style={styles.filterSection}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="🔍 Search tickets, root cause, symptoms..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {/* Scope filter pills */}
                <View style={styles.pillsRow}>
                  {isSuperAdmin ? (
                    <>
                      <TouchableOpacity
                        style={[styles.pill, scopeFilter === "ALL_ORG" && styles.pillActive]}
                        onPress={() => setScopeFilter("ALL_ORG")}
                      >
                        <Text style={[styles.pillText, scopeFilter === "ALL_ORG" && styles.pillTextActive]}>
                          🌐 All Org ({issues.length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pill, scopeFilter === "MY_WORK" && styles.pillActive]}
                        onPress={() => setScopeFilter("MY_WORK")}
                      >
                        <Text style={[styles.pillText, scopeFilter === "MY_WORK" && styles.pillTextActive]}>
                          ⚡ My Work ({myTicketsCount})
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.pill, scopeFilter === "MY_WORK" && styles.pillActive]}
                        onPress={() => setScopeFilter("MY_WORK")}
                      >
                        <Text style={[styles.pillText, scopeFilter === "MY_WORK" && styles.pillTextActive]}>
                          👤 My Tickets ({myTicketsCount})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pill, scopeFilter === "ASSIGNED" && styles.pillActive]}
                        onPress={() => setScopeFilter("ASSIGNED")}
                      >
                        <Text style={[styles.pillText, scopeFilter === "ASSIGNED" && styles.pillTextActive]}>
                          🎯 Assigned to Me ({issues.filter((i) => i.assigneeId === activeUser?.id).length})
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Status Pills */}
                  {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.pill, statusFilter === st && styles.pillActive]}
                      onPress={() => setStatusFilter(st)}
                    >
                      <Text style={[styles.pillText, statusFilter === st && styles.pillTextActive]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ticket Cards List */}
              {filteredIssues.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🎫</Text>
                  <Text style={styles.emptyTitle}>No matching tickets</Text>
                  <Text style={styles.emptySubtitle}>
                    {isSuperAdmin
                      ? "The organization ticket queue is empty."
                      : "You have no incident tickets assigned or reported."}
                  </Text>
                </View>
              ) : (
                filteredIssues.map((iss) => (
                  <TouchableOpacity
                    key={iss.id}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => setSelectedIssue(iss)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.ticketId}>#TIK-{String(iss.ticketNumber).padStart(3, "0")}</Text>
                        <Text
                          style={[
                            styles.priorityBadge,
                            iss.priority === "URGENT" && styles.badgeUrgent,
                            iss.priority === "HIGH" && styles.badgeHigh,
                          ]}
                        >
                          {iss.priority}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.statusBadge,
                          iss.status === "RESOLVED" && styles.statusResolved,
                          iss.status === "IN_PROGRESS" && styles.statusProgress,
                        ]}
                      >
                        {iss.status}
                      </Text>
                    </View>

                    <Text style={styles.issueTitle}>{iss.title}</Text>
                    <Text style={styles.issueDesc} numberOfLines={2}>
                      {iss.description}
                    </Text>

                    {/* AI Copilot Action Box */}
                    {iss.aiSummary ? (
                      <View style={styles.aiBox}>
                        <Text style={styles.aiTag}>✨ AI Action Plan:</Text>
                        <Text style={styles.aiText} numberOfLines={2}>
                          {iss.aiSuggestedAction || iss.aiSummary}
                        </Text>
                      </View>
                    ) : null}

                    {/* Footer Meta Row */}
                    <View style={styles.cardFooter}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.catPill}>{iss.category}</Text>
                        {iss.department ? <Text style={styles.deptPill}>{iss.department}</Text> : null}
                      </View>
                      <Text style={styles.assigneeText}>
                        {iss.assignee ? `👤 ${iss.assignee.name}` : "Unassigned"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* TAB 2: TASKS (WORK ORDERS) */}
          {activeTab === "tasks" && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  {isSuperAdmin ? "Enterprise Work Orders" : `${activeUser?.name || "My"} Work Orders`}
                </Text>
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setIsNewTaskModalOpen(true)}
                >
                  <Text style={styles.addSmallBtnText}>+ Add Task</Text>
                </TouchableOpacity>
              </View>

              {filteredTasks.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No work orders assigned</Text>
                  <Text style={styles.emptySubtitle}>All assigned engineering tasks are completed.</Text>
                </View>
              ) : (
                filteredTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.card}
                    onPress={() => handleToggleTask(task)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.priorityBadge}>PRIORITY {task.priority}</Text>
                      <Text style={[styles.statusBadge, task.status === "DONE" && styles.statusResolved]}>
                        {task.status}
                      </Text>
                    </View>

                    <Text style={[styles.taskTitle, task.status === "DONE" && styles.taskDoneTitle]}>
                      {task.status === "DONE" ? "✓ " : "○ "}
                      {task.title}
                    </Text>

                    <View style={styles.cardFooter}>
                      {task.category ? <Text style={styles.catPill}>{task.category}</Text> : <View />}
                      {task.issue ? (
                        <Text style={styles.linkedTicket}>
                          #TIK-{String(task.issue.ticketNumber).padStart(3, "0")}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* TAB 3: REPORT INCIDENT */}
          {activeTab === "report" && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Field Incident Report</Text>
              <Text style={styles.formSubtitle}>
                Autonomous triage will categorize, diagnose, and calculate SLA deadlines.
              </Text>

              <Text style={styles.inputLabel}>Incident Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 504 Gateway Timeout on /api/v1/checkout"
                placeholderTextColor="#64748b"
                value={reportTitle}
                onChangeText={setReportTitle}
              />

              <Text style={styles.inputLabel}>Symptoms & Technical Observations *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Paste logs, stack traces, latency numbers, or user symptoms..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                value={reportDesc}
                onChangeText={setReportDesc}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <TextInput
                    style={styles.textInput}
                    value={reportCategory}
                    onChangeText={setReportCategory}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Priority (LOW/MED/HIGH/URGENT)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={reportPriority}
                    onChangeText={setReportPriority}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Department Squad</Text>
              <TextInput
                style={styles.textInput}
                value={reportDepartment}
                onChangeText={setReportDepartment}
              />

              <Text style={styles.inputLabel}>Location / Host Cluster</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. AWS us-east-2 Production Cluster"
                placeholderTextColor="#64748b"
                value={reportLocation}
                onChangeText={setReportLocation}
              />

              {/* AI Triage Toggle */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRunAiTriage(!runAiTriage)}
              >
                <View style={[styles.checkboxBox, runAiTriage && styles.checkboxBoxActive]}>
                  {runAiTriage ? <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxText}>✨ Run Autonomous Google Gemini AI Triage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateReport}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? "Analyzing & Dispatching..." : "✨ Submit Incident Ticket"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL 1: AUTHENTICATION & ACCOUNT SWITCHER */}
      <Modal visible={isAuthModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {!activeUser ? "🔐 Sign In to WorkMate AI" : "⚡ Security Identity Hub"}
              </Text>
              {activeUser ? (
                <TouchableOpacity onPress={() => setIsAuthModalOpen(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.modalSubtitle}>
              {!activeUser
                ? "Enter your registered corporate email to access assigned tickets and tasks."
                : `Logged in as ${activeUser.name} (${activeUser.role}). Switch identity or update profile.`}
            </Text>

            {/* Auth Switcher Tabs */}
            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTabBtn, authTab === "login" && styles.authTabActive]}
                onPress={() => setAuthTab("login")}
              >
                <Text style={[styles.authTabText, authTab === "login" && styles.authTabTextActive]}>
                  🔑 Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTabBtn, authTab === "switch" && styles.authTabActive]}
                onPress={() => setAuthTab("switch")}
              >
                <Text style={[styles.authTabText, authTab === "switch" && styles.authTabTextActive]}>
                  👥 Team ({users.length})
                </Text>
              </TouchableOpacity>
              {(!activeUser || activeUser.role === "SUPER_ADMIN" || users.length === 0) ? (
                <TouchableOpacity
                  style={[styles.authTabBtn, authTab === "register" && styles.authTabActive]}
                  onPress={() => setAuthTab("register")}
                >
                  <Text style={[styles.authTabText, authTab === "register" && styles.authTabTextActive]}>
                    👑 + New
                  </Text>
                </TouchableOpacity>
              ) : null}
              {activeUser ? (
                <TouchableOpacity
                  style={[styles.authTabBtn, authTab === "profile" && styles.authTabActive]}
                  onPress={() => handleOpenEditProfile()}
                >
                  <Text style={[styles.authTabText, authTab === "profile" && styles.authTabTextActive]}>
                    ✏️ Profile
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {authTab === "login" ? (
              <View style={{ paddingVertical: 12 }}>
                <Text style={styles.inputLabel}>Corporate Work Email</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: 13, paddingVertical: 9 }]}
                  placeholder="e.g. gankitoshgupta52@gmail.com..."
                  placeholderTextColor="#64748b"
                  value={loginEmail}
                  onChangeText={(val) => {
                    setLoginEmail(val);
                    if (loginError) setLoginError("");
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 4 }}>
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Account Password</Text>
                  <TouchableOpacity onPress={() => setShowLoginPassword((p) => !p)}>
                    <Text style={{ fontSize: 11, color: "#38bdf8", fontWeight: "700" }}>
                      {showLoginPassword ? "🙈 Hide" : "👁️ Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.textInput, { fontSize: 13, paddingVertical: 9 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#64748b"
                  value={loginPassword}
                  onChangeText={(val) => {
                    setLoginPassword(val);
                    if (loginError) setLoginError("");
                  }}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                />

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                    Default: <Text style={{ color: "#38bdf8", fontWeight: "700" }}>WorkMate@123</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setLoginPassword("WorkMate@123")}>
                    <Text style={{ fontSize: 10, color: "#818cf8", fontWeight: "700", textDecorationLine: "underline" }}>
                      Fill Default
                    </Text>
                  </TouchableOpacity>
                </View>

                {loginError ? (
                  <View style={{ backgroundColor: "rgba(244, 63, 94, 0.15)", borderColor: "rgba(244, 63, 94, 0.35)", borderWidth: 1, borderRadius: 8, padding: 10, marginVertical: 8 }}>
                    <Text style={{ color: "#fb7185", fontSize: 12 }}>⚠️ {loginError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitBtn, { marginTop: 6 }]}
                  onPress={handleEmailLogin}
                  disabled={loginLoading}
                >
                  <Text style={styles.submitBtnText}>
                    {loginLoading ? "Authenticating..." : "Sign In to WorkMate AI →"}
                  </Text>
                </TouchableOpacity>

                {users.length > 0 ? (
                  <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingTop: 10 }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: "700", marginBottom: 6, textTransform: "uppercase" }}>
                      Or 1-Tap Sign In with Team Account:
                    </Text>
                    <ScrollView style={{ maxHeight: 160 }}>
                      {users.map((u) => (
                        <TouchableOpacity
                          key={u.id}
                          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}
                          onPress={() => handleLoginAs(u)}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#4f46e5", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{u.name.slice(0, 1)}</Text>
                            </View>
                            <View>
                              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{u.name}</Text>
                              <Text style={{ color: "#64748b", fontSize: 10 }}>{u.email}</Text>
                            </View>
                          </View>
                          <Text style={{ color: "#38bdf8", fontSize: 11, fontWeight: "700" }}>Sign In →</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : authTab === "switch" ? (
              <ScrollView style={{ maxHeight: 360 }}>
                {users.map((u) => {
                  const isCurrent = activeUser?.id === u.id;
                  const isSuper = u.role === "SUPER_ADMIN" || u.role === "ADMIN";
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.userOptionCard, isCurrent && styles.userOptionCardActive]}
                      onPress={() => handleLoginAs(u)}
                    >
                      <View style={styles.avatarCircleLg}>
                        {u.avatar ? (
                          <Image source={{ uri: u.avatar }} style={styles.avatarImageLg} />
                        ) : (
                          <Text style={styles.avatarTextLg}>{u.name.slice(0, 2).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.userOptionName}>{u.name}</Text>
                          {isCurrent ? <Text style={styles.currentBadge}>ACTIVE</Text> : null}
                        </View>
                        <Text style={styles.userOptionEmail}>{u.email}</Text>
                        <Text style={styles.userOptionDept}>
                          {u.department || "General Engineering Squad"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.roleTag,
                          isSuper ? styles.roleTagSuper : styles.roleTagEngineer,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleTagText,
                            isSuper ? styles.roleTagTextSuper : styles.roleTagTextEngineer,
                          ]}
                        >
                          {u.role}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : authTab === "register" ? (
              <ScrollView style={{ maxHeight: 360 }}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Maya Lin"
                  placeholderTextColor="#64748b"
                  value={regName}
                  onChangeText={setRegName}
                />

                <Text style={styles.inputLabel}>Corporate Email *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="maya@enterprise.com"
                  placeholderTextColor="#64748b"
                  value={regEmail}
                  onChangeText={setRegEmail}
                />

                <Text style={styles.inputLabel}>Initial Account Password (Default: WorkMate@123)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Leave empty for WorkMate@123 or min 6 chars"
                  placeholderTextColor="#64748b"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                />

                <Text style={styles.inputLabel}>Role</Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                  {(["ENGINEER", "MANAGER", "USER", "SUPER_ADMIN"] as Role[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleSelectBtn, regRole === r && styles.roleSelectBtnActive]}
                      onPress={() => setRegRole(r)}
                    >
                      <Text
                        style={[
                          styles.roleSelectText,
                          regRole === r && styles.roleSelectTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Department / Squad</Text>
                <TextInput
                  style={styles.textInput}
                  value={regDept}
                  onChangeText={setRegDept}
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRegister}
                  disabled={regSubmitting}
                >
                  <Text style={styles.submitBtnText}>
                    {regSubmitting ? "Creating..." : "Create & Sign In"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {/* Profile Editor */}
                <View style={styles.mobileAvatarRow}>
                  <View style={styles.profileAvatarPreviewCircle}>
                    {profileAvatar ? (
                      <Image source={{ uri: profileAvatar }} style={styles.profileAvatarPreviewImage} />
                    ) : (
                      <Text style={styles.profileAvatarPreviewText}>
                        {profileName ? profileName.slice(0, 2).toUpperCase() : "??"}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profilePreviewName}>{profileName || "Your Name"}</Text>
                    <Text style={styles.profilePreviewRole}>
                      Role: {activeUser?.role} · {profileDept || "Engineering"}
                    </Text>
                    {profileAvatar ? (
                      <TouchableOpacity onPress={() => setProfileAvatar("")}>
                        <Text style={{ color: "#fb7185", fontSize: 11, marginTop: 4 }}>Remove Photo</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Preset Avatars */}
                <Text style={styles.inputLabel}>Choose from Preset Pictures</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginBottom: 12 }}>
                  {MOBILE_AVATAR_PRESETS.map((presetUrl, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setProfileAvatar(presetUrl)}
                      style={[
                        styles.mobilePresetThumbnail,
                        profileAvatar === presetUrl && styles.mobilePresetThumbnailActive,
                      ]}
                    >
                      <Image source={{ uri: presetUrl }} style={styles.presetImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Profile Picture URL */}
                <Text style={styles.inputLabel}>Or Enter Photo URL</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#64748b"
                  value={profileAvatar}
                  onChangeText={setProfileAvatar}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Aashutosh Kumar"
                  placeholderTextColor="#64748b"
                  value={profileName}
                  onChangeText={setProfileName}
                />

                <Text style={styles.inputLabel}>Corporate Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. aashutosh@enterprise.com"
                  placeholderTextColor="#64748b"
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Department / Squad (🔒 SuperAdmin Managed)</Text>
                <TextInput
                  style={[styles.textInput, { opacity: 0.6, backgroundColor: "rgba(255,255,255,0.04)" }]}
                  placeholder="e.g. Software & Cloud Ops"
                  placeholderTextColor="#64748b"
                  value={profileDept}
                  editable={false}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: "#0284c7", marginTop: 14 }]}
                  onPress={handleSaveProfile}
                  disabled={profileSubmitting}
                >
                  <Text style={styles.submitBtnText}>
                    {profileSubmitting ? "Saving Changes..." : "✓ Save Profile Changes"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: TICKET DETAIL & WORKFLOW MODAL */}
      <Modal visible={Boolean(selectedIssue)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "88%" }]}>
            {selectedIssue ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.ticketIdLg}>
                      #TIK-{String(selectedIssue.ticketNumber).padStart(3, "0")}
                    </Text>
                    <Text
                      style={[
                        styles.priorityBadge,
                        selectedIssue.priority === "URGENT" && styles.badgeUrgent,
                        selectedIssue.priority === "HIGH" && styles.badgeHigh,
                      ]}
                    >
                      {selectedIssue.priority}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedIssue(null)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ marginTop: 10 }}>
                  <Text style={styles.detailTitle}>{selectedIssue.title}</Text>
                  <Text style={styles.detailDesc}>{selectedIssue.description}</Text>

                  {/* AI Copilot Intelligence Card */}
                  <View style={styles.aiDetailCard}>
                    <Text style={styles.aiDetailHeader}>✨ WorkMate AI Autonomous Triage</Text>
                    {selectedIssue.aiRootCause ? (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={styles.aiFieldLabel}>Inferred Root Cause:</Text>
                        <Text style={styles.aiFieldValue}>{selectedIssue.aiRootCause}</Text>
                      </View>
                    ) : null}
                    {selectedIssue.aiSuggestedAction ? (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={styles.aiFieldLabel}>Remediation Recommendation:</Text>
                        <Text style={styles.aiFieldValue}>{selectedIssue.aiSuggestedAction}</Text>
                      </View>
                    ) : null}
                    {selectedIssue.aiConfidence ? (
                      <Text style={styles.aiConfidenceText}>
                        Diagnosis Confidence: {(selectedIssue.aiConfidence * 100).toFixed(0)}%
                      </Text>
                    ) : null}
                  </View>

                  {/* Workflow Status Actions */}
                  <Text style={styles.sectionHeading}>Lifecycle Status Workflow</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
                    {(["OPEN", "IN_PROGRESS", "RESOLVED"] as string[]).map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusActionBtn,
                          selectedIssue.status === st && styles.statusActionBtnActive,
                        ]}
                        onPress={() => handleUpdateStatus(selectedIssue.id, st)}
                      >
                        <Text
                          style={[
                            styles.statusActionText,
                            selectedIssue.status === st && styles.statusActionTextActive,
                          ]}
                        >
                          {st === "IN_PROGRESS" ? "In Progress" : st === "RESOLVED" ? "Resolve" : "Open"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Comments Thread */}
                  <Text style={styles.sectionHeading}>Activity & Remediation Audit</Text>
                  {(selectedIssue.comments || []).map((c) => (
                    <View key={c.id} style={styles.commentItem}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                        <Text style={styles.commentAuthor}>{c.author.name}</Text>
                        <Text style={styles.commentTime}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <Text style={styles.commentContent}>{c.content}</Text>
                    </View>
                  ))}

                  {/* Post Comment Input */}
                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add remediation update or note..."
                      placeholderTextColor="#64748b"
                      value={newComment}
                      onChangeText={setNewComment}
                    />
                    <TouchableOpacity
                      style={styles.commentSendBtn}
                      onPress={handleAddComment}
                      disabled={commentSubmitting}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700" }}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: QUICK DISPATCH TASK */}
      <Modal visible={isNewTaskModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ Dispatch Work Order</Text>
              <TouchableOpacity onPress={() => setIsNewTaskModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Patch payment webhook exception handler"
              placeholderTextColor="#64748b"
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.textInput}
              value={taskCategory}
              onChangeText={setTaskCategory}
            />

            <Text style={styles.inputLabel}>Link to Incident Ticket (Optional)</Text>
            <ScrollView horizontal style={{ flexDirection: "row", marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.ticketSelectPill, taskIssueId === "" && styles.ticketSelectPillActive]}
                onPress={() => setTaskIssueId("")}
              >
                <Text style={styles.ticketSelectText}>Standalone</Text>
              </TouchableOpacity>
              {(isSuperAdmin ? issues : filteredIssues).map((iss) => (
                <TouchableOpacity
                  key={iss.id}
                  style={[
                    styles.ticketSelectPill,
                    taskIssueId === iss.id && styles.ticketSelectPillActive,
                  ]}
                  onPress={() => setTaskIssueId(iss.id)}
                >
                  <Text style={styles.ticketSelectText}>
                    #TIK-{String(iss.ticketNumber).padStart(3, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateTask}
              disabled={taskSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {taskSubmitting ? "Dispatching..." : "Dispatch Work Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: SERVER CONNECTION & IP SETTINGS */}
      <Modal visible={isServerModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "88%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>⚙️ Backend API Server Connection</Text>
                <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Connect your mobile phone to your development PC
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsServerModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 12 }}>
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerTitle}>💡 Why can't phones connect to 'localhost'?</Text>
                <Text style={styles.infoBannerText}>
                  On Android, 'localhost' (127.0.0.1) points to the phone itself. To connect to your computer running the API server, use your computer's Wi-Fi LAN IP address.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Backend API Endpoint URL *</Text>
              <TextInput
                style={styles.textInput}
                placeholder={getApiUrl()}
                placeholderTextColor="#64748b"
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: "#1e293b", borderColor: "#334155", borderWidth: 1 }]}
                  onPress={handleResetServerUrl}
                >
                  <Text style={{ color: "#38bdf8", fontSize: 11, fontWeight: "600" }}>
                    ↺ Reset to Auto-Detected IP
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: "#0284c7" }]}
                  onPress={handleTestConnection}
                  disabled={testStatus.testing}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {testStatus.testing ? "Pinging..." : "⚡ Test Ping"}
                  </Text>
                </TouchableOpacity>
              </View>

              {testStatus.result ? (
                <View
                  style={[
                    styles.testResultBox,
                    {
                      backgroundColor: testStatus.ok ? "#064e3b" : "#450a0a",
                      borderColor: testStatus.ok ? "#10b981" : "#ef4444",
                    },
                  ]}
                >
                  <Text style={{ color: testStatus.ok ? "#6ee7b7" : "#fca5a5", fontSize: 12, fontWeight: "600" }}>
                    {testStatus.ok ? "✓ " : "✕ "}
                    {testStatus.result}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, { marginTop: 14 }]}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.submitBtnText}>Save & Reconnect</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070b14",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#0d1424",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandIcon: {
    fontSize: 22,
  },
  headerBrand: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 10,
    color: "#64748b",
  },
  userProfilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  userNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  roleBadge: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  roleSuperAdmin: {
    color: "#c084fc",
  },
  roleEngineer: {
    color: "#38bdf8",
  },
  switchIcon: {
    fontSize: 14,
    color: "#94a3b8",
    marginLeft: 2,
  },
  loginBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  scopeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  scopeBannerText: {
    fontSize: 10,
    color: "#cbd5e1",
    fontWeight: "600",
    flex: 1,
  },
  logoutLink: {
    fontSize: 10,
    color: "#fb7185",
    fontWeight: "700",
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 3,
    borderRadius: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: "#1e293b",
  },
  tabText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  contentScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  pillActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  pillText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#0d1424",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: "800",
    color: "#38bdf8",
  },
  priorityBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeUrgent: {
    color: "#fb7185",
    backgroundColor: "rgba(244, 63, 94, 0.2)",
  },
  badgeHigh: {
    color: "#f97316",
    backgroundColor: "rgba(249, 115, 22, 0.2)",
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94a3b8",
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusProgress: {
    color: "#fcd34d",
    backgroundColor: "rgba(252, 211, 77, 0.2)",
  },
  statusResolved: {
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.2)",
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  issueDesc: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 16,
    marginBottom: 8,
  },
  aiBox: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  aiTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#c084fc",
    marginBottom: 2,
  },
  aiText: {
    fontSize: 11,
    color: "#e2e8f0",
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catPill: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  deptPill: {
    fontSize: 9,
    color: "#94a3b8",
  },
  assigneeText: {
    fontSize: 10,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 6,
  },
  taskDoneTitle: {
    textDecorationLine: "line-through",
    color: "#64748b",
  },
  linkedTicket: {
    fontSize: 10,
    color: "#38bdf8",
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  addSmallBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  addSmallBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 16,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  formCard: {
    padding: 16,
    backgroundColor: "#0d1424",
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#cbd5e1",
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 10,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  checkboxText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#c084fc",
  },
  submitBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0e1628",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 14,
  },
  modalClose: {
    fontSize: 18,
    color: "#94a3b8",
    padding: 4,
  },
  authTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  authTabActive: {
    backgroundColor: "#1e293b",
  },
  authTabText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  authTabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  userOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 8,
  },
  userOptionCardActive: {
    borderColor: "#6366f1",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  avatarCircleLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTextLg: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  userOptionName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  currentBadge: {
    fontSize: 8,
    fontWeight: "800",
    color: "#34d399",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  userOptionEmail: {
    fontSize: 11,
    color: "#94a3b8",
  },
  userOptionDept: {
    fontSize: 10,
    color: "#64748b",
  },
  roleTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  roleTagSuper: {
    backgroundColor: "rgba(192, 132, 252, 0.15)",
  },
  roleTagEngineer: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: "800",
  },
  roleTagTextSuper: {
    color: "#c084fc",
  },
  roleTagTextEngineer: {
    color: "#38bdf8",
  },
  roleSelectBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  roleSelectBtnActive: {
    backgroundColor: "#6366f1",
  },
  roleSelectText: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
  },
  roleSelectTextActive: {
    color: "#ffffff",
  },
  ticketIdLg: {
    fontSize: 16,
    fontWeight: "800",
    color: "#38bdf8",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  detailDesc: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 12,
  },
  aiDetailCard: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  aiDetailHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: "#c084fc",
    marginBottom: 8,
  },
  aiFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  aiFieldValue: {
    fontSize: 12,
    color: "#e2e8f0",
  },
  aiConfidenceText: {
    fontSize: 10,
    color: "#34d399",
    fontWeight: "700",
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  statusActionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusActionBtnActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  statusActionText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
  },
  statusActionTextActive: {
    color: "#ffffff",
  },
  commentItem: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  commentTime: {
    fontSize: 10,
    color: "#64748b",
  },
  commentContent: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  commentInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  commentSendBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketSelectPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 6,
  },
  ticketSelectPillActive: {
    backgroundColor: "#6366f1",
  },
  ticketSelectText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    padding: 10,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 11,
    color: "#fb7185",
    lineHeight: 16,
  },
  retryBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.2)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  retryText: {
    fontSize: 11,
    color: "#fb7185",
    fontWeight: "700",
  },
  configBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  configBtnText: {
    fontSize: 11,
    color: "#e2e8f0",
    fontWeight: "600",
  },
  connectionStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionStatusText: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "600",
  },
  infoBanner: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.2)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infoBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38bdf8",
    marginBottom: 3,
  },
  infoBannerText: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 15,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  testResultBox: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarImageLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  mobileAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  profileAvatarPreviewCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#38bdf8",
  },
  profileAvatarPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileAvatarPreviewText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  profilePreviewName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  profilePreviewRole: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  mobilePresetThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  mobilePresetThumbnailActive: {
    borderColor: "#38bdf8",
  },
  presetImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
