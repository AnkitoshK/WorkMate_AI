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

  // Auth / Welcome View State
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Modals for authenticated users
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"profile" | "switch">("profile");
  const [selectedIssue, setSelectedIssue] = useState<MobileIssue | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiUrl());
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: string; ok?: boolean }>({ testing: false });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<"MY_WORK" | "ALL_ORG" | "ASSIGNED">("MY_WORK");

  // Form: Create Ticket
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportCategory, setReportCategory] = useState("SOFTWARE");
  const [reportPriority, setReportPriority] = useState("HIGH");
  const [reportLocation, setReportLocation] = useState("");
  const [reportDepartment, setReportDepartment] = useState("Engineering");
  const [runAiTriage, setRunAiTriage] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form: New Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("General");
  const [taskPriority, setTaskPriority] = useState(2);
  const [taskIssueId, setTaskIssueId] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Form: Registration
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("ENGINEER");
  const [regDept, setRegDept] = useState("Engineering");
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Form: Edit Profile
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDept, setProfileDept] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Comments
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // 1. Initial Data Fetch & Session Restoration
  const loadData = useCallback(async () => {
    try {
      const [uList, iList, tList] = await Promise.all([
        fetchUsers(),
        fetchIssues(),
        fetchTasks(),
      ]);

      setErrorMsg("");
      setUsers(uList);
      setIssues(iList);
      setTasks(tList);

      const savedId = storage.getItem(STORAGE_KEY);
      if (savedId && uList.length > 0) {
        const found = uList.find((u) => u.id === savedId);
        if (found) {
          setActiveUser(found);
          setActiveUserSession(found);
        } else {
          setActiveUser(null);
        }
      }
    } catch (err: any) {
      const activeEndpoint = getApiUrl();
      const rawMsg = err?.message || "Connection error";
      if (rawMsg.includes("127.0.0.1") || rawMsg.includes("localhost") || rawMsg.includes("ConnectException")) {
        setErrorMsg("Phone cannot reach 'localhost'. Tap Connection Settings to set your computer's Wi-Fi IP.");
      } else if (rawMsg.includes("Failed to fetch") || rawMsg.includes("Network request failed") || rawMsg.includes("Connection refused")) {
        setErrorMsg(`API server offline at ${activeEndpoint}. Make sure the backend server is running.`);
      } else {
        setErrorMsg(`${rawMsg}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  // 2. Authentication Handlers
  const handleLoginAs = (user: MobileUser) => {
    setActiveUser(user);
    storage.setItem(STORAGE_KEY, user.id);
    setActiveUserSession(user);
    setLoginError("");
    setLoginEmail("");
    setLoginPassword("");
    setIsProfileModalOpen(false);
  };

  const handleEmailLogin = async () => {
    if (!loginEmail.trim()) {
      setLoginError("Please enter your email address.");
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError("Please enter your password.");
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
        throw new Error(data.error || "Invalid email or password. Please try again.");
      }
      handleLoginAs(data.user);
      setLoginPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Unable to sign in.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    storage.removeItem(STORAGE_KEY);
    clearActiveUserSession();
    setActiveUser(null);
    setIsProfileModalOpen(false);
    setLoginError("");
    setLoginEmail("");
    setLoginPassword("");
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim()) {
      alert("Please enter both your name and email address.");
      return;
    }
    try {
      setRegSubmitting(true);
      const newUser = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim() || "WorkMate@123",
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

  const handleOpenEditProfile = (u?: MobileUser) => {
    const target = u || activeUser;
    if (!target) return;
    setProfileName(target.name);
    setProfileEmail(target.email);
    setProfileDept(target.department || "");
    setProfileAvatar(target.avatar || "");
    setProfileModalTab("profile");
    setIsProfileModalOpen(true);
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
        department: profileDept.trim() || undefined,
        avatar: profileAvatar.trim() || undefined,
      });

      setActiveUser(updated);
      setActiveUserSession(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      alert("Profile updated successfully!");
      setIsProfileModalOpen(false);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Connection settings handlers
  const handleTestConnection = async () => {
    setTestStatus({ testing: true, result: "Connecting..." });
    const res = await testApiHealth(serverUrlInput);
    setTestStatus({ testing: false, result: res.message, ok: res.ok });
  };

  const handleSaveServerUrl = () => {
    saveCustomApiUrl(serverUrlInput);
    setIsServerModalOpen(false);
    loadData();
  };

  const handleResetServerUrl = () => {
    saveCustomApiUrl("");
    const defaultUrl = getApiUrl();
    setServerUrlInput(defaultUrl);
    setTestStatus({ testing: false, result: `Reset to detected URL: ${defaultUrl}`, ok: true });
    loadData();
  };

  // Role permissions & Scoping
  const isSuperAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN";

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        iss.title.toLowerCase().includes(q) ||
        iss.description.toLowerCase().includes(q) ||
        (iss.location && iss.location.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "ALL" || iss.status === statusFilter;

      let matchesScope = true;
      if (activeUser) {
        if (!isSuperAdmin) {
          if (scopeFilter === "ASSIGNED") {
            matchesScope = iss.assigneeId === activeUser.id;
          } else {
            matchesScope = iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id;
          }
        } else {
          if (scopeFilter === "ASSIGNED") {
            matchesScope = iss.assigneeId === activeUser.id;
          } else if (scopeFilter === "MY_WORK") {
            matchesScope = iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id;
          } else {
            matchesScope = true;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [issues, searchQuery, statusFilter, scopeFilter, activeUser, isSuperAdmin]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!activeUser || isSuperAdmin) return true;
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

  // Operations
  const handleToggleTask = async (task: MobileTask) => {
    try {
      const nextStatus = task.status === "DONE" ? "TODO" : "DONE";
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      await toggleTaskStatus(task.id, task.status);
    } catch (err: any) {
      alert("Failed to update task: " + err.message);
      loadData();
    }
  };

  const handleCreateReport = async () => {
    if (!reportTitle.trim() || !reportDesc.trim()) {
      alert("Please provide both a title and description.");
      return;
    }
    if (!activeUser) return;

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
      alert(`Ticket #${newIssue.ticketNumber} created successfully!`);
    } catch (err: any) {
      alert(err.message || "Failed to create ticket.");
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
      alert("Failed to add comment: " + err.message);
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
      alert("Failed to create task: " + err.message);
    } finally {
      setTaskSubmitting(false);
    }
  };

  // ==========================================
  // VIEW A: LOGGED-OUT WELCOME & SIGN IN VIEW
  // ==========================================
  if (!activeUser && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          {/* Brand Header */}
          <View style={styles.authHeader}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandIcon}>⚡</Text>
            </View>
            <Text style={styles.authTitle}>WorkMate</Text>
            <Text style={styles.authSubtitle}>
              Smart incident tracking and team task management
            </Text>
          </View>

          {/* Mode Switcher: Sign In vs Create Account */}
          <View style={styles.segmentedToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, authMode === "login" && styles.toggleBtnActive]}
              onPress={() => setAuthMode("login")}
            >
              <Text style={[styles.toggleBtnText, authMode === "login" && styles.toggleBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, authMode === "register" && styles.toggleBtnActive]}
              onPress={() => setAuthMode("register")}
            >
              <Text style={[styles.toggleBtnText, authMode === "register" && styles.toggleBtnTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {authMode === "login" ? (
            <View style={styles.authFormCard}>
              <Text style={styles.formSectionTitle}>Account Sign In</Text>

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="name@company.com"
                placeholderTextColor="#64748b"
                value={loginEmail}
                onChangeText={(val) => {
                  setLoginEmail(val);
                  if (loginError) setLoginError("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={() => setShowLoginPassword((p) => !p)}>
                  <Text style={styles.linkTextSmall}>
                    {showLoginPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter password"
                placeholderTextColor="#64748b"
                value={loginPassword}
                onChangeText={(val) => {
                  setLoginPassword(val);
                  if (loginError) setLoginError("");
                }}
                secureTextEntry={!showLoginPassword}
                autoCapitalize="none"
              />

              <View style={styles.helperRow}>
                <Text style={styles.helperText}>Default demo password: WorkMate@123</Text>
                <TouchableOpacity onPress={() => setLoginPassword("WorkMate@123")}>
                  <Text style={styles.linkTextSmall}>Auto-fill</Text>
                </TouchableOpacity>
              </View>

              {loginError ? (
                <View style={styles.errorAlert}>
                  <Text style={styles.errorAlertText}>{loginError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleEmailLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Quick Demo Switcher */}
              {users.length > 0 ? (
                <View style={styles.quickAccessSection}>
                  <Text style={styles.quickAccessTitle}>Or test with a demo profile:</Text>
                  <ScrollView style={{ maxHeight: 210 }}>
                    {users.map((u) => {
                      const isSuper = u.role === "SUPER_ADMIN" || u.role === "ADMIN";
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={styles.demoUserItem}
                          onPress={() => handleLoginAs(u)}
                        >
                          <View style={styles.demoUserLeft}>
                            <View style={styles.userAvatarSm}>
                              <Text style={styles.userAvatarTextSm}>{u.name.slice(0, 1)}</Text>
                            </View>
                            <View>
                              <Text style={styles.demoUserName}>{u.name}</Text>
                              <Text style={styles.demoUserRole}>
                                {isSuper ? "Admin" : "Engineer"} · {u.department || "General"}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.demoUserAction}>Select →</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.authFormCard}>
              <Text style={styles.formSectionTitle}>Create New Account</Text>

              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Alex Johnson"
                placeholderTextColor="#64748b"
                value={regName}
                onChangeText={setRegName}
              />

              <Text style={styles.inputLabel}>Work Email *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="alex@company.com"
                placeholderTextColor="#64748b"
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>Password (Default: WorkMate@123)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Min. 6 characters"
                placeholderTextColor="#64748b"
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.chipRow}>
                {(["ENGINEER", "MANAGER", "USER", "SUPER_ADMIN"] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, regRole === r && styles.chipActive]}
                    onPress={() => setRegRole(r)}
                  >
                    <Text style={[styles.chipText, regRole === r && styles.chipTextActive]}>
                      {r === "SUPER_ADMIN" ? "Admin" : r.charAt(0) + r.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Department</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Engineering, Support, Operations"
                placeholderTextColor="#64748b"
                value={regDept}
                onChangeText={setRegDept}
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRegister}
                disabled={regSubmitting}
              >
                {regSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Connection settings link */}
          <TouchableOpacity
            style={styles.footerLinkBtn}
            onPress={() => {
              setServerUrlInput(getApiUrl());
              setTestStatus({ testing: false });
              setIsServerModalOpen(true);
            }}
          >
            <Text style={styles.footerLinkText}>⚙️ Server Connection Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Loading Screen
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading WorkMate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // VIEW B: MAIN LOGGED-IN DASHBOARD
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sleek App Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.brandTitle}>WorkMate</Text>
              <TouchableOpacity
                style={styles.statusDotButton}
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
              </TouchableOpacity>
            </View>
            <Text style={styles.userGreeting}>
              Welcome, <Text style={{ color: "#f8fafc", fontWeight: "700" }}>{activeUser?.name.split(" ")[0]}</Text>
            </Text>
          </View>

          {/* Profile & Switcher avatar button */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => handleOpenEditProfile()}
          >
            <View style={styles.avatarCircle}>
              {activeUser?.avatar ? (
                <Image source={{ uri: activeUser.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {activeUser ? activeUser.name.slice(0, 2).toUpperCase() : "??"}
                </Text>
              )}
            </View>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>
                {isSuperAdmin ? "Admin" : activeUser?.role ? activeUser.role.charAt(0) + activeUser.role.slice(1).toLowerCase() : "User"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Global Connection Warning (if any) */}
        {errorMsg ? (
          <TouchableOpacity
            style={styles.offlineWarningBanner}
            onPress={() => {
              setServerUrlInput(getApiUrl());
              setTestStatus({ testing: false });
              setIsServerModalOpen(true);
            }}
          >
            <Text style={styles.offlineWarningText}>⚠️ Server connection issue. Tap to configure.</Text>
          </TouchableOpacity>
        ) : null}

        {/* Segmented Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === "issues" && styles.mainTabBtnActive]}
            onPress={() => setActiveTab("issues")}
          >
            <Text style={[styles.mainTabText, activeTab === "issues" && styles.mainTabTextActive]}>
              Tickets ({filteredIssues.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === "tasks" && styles.mainTabBtnActive]}
            onPress={() => setActiveTab("tasks")}
          >
            <Text style={[styles.mainTabText, activeTab === "tasks" && styles.mainTabTextActive]}>
              Tasks ({filteredTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === "report" && styles.mainTabBtnActive]}
            onPress={() => setActiveTab("report")}
          >
            <Text style={[styles.mainTabText, activeTab === "report" && styles.mainTabTextActive]}>
              + New Ticket
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* ============================== */}
        {/* TAB 1: TICKETS VIEW            */}
        {/* ============================== */}
        {activeTab === "issues" && (
          <View style={styles.tabContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder="Search tickets by title, details..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Scope & Status Filter Chips */}
            <View style={styles.filtersScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                {isSuperAdmin ? (
                  <>
                    <TouchableOpacity
                      style={[styles.filterChip, scopeFilter === "ALL_ORG" && styles.filterChipActive]}
                      onPress={() => setScopeFilter("ALL_ORG")}
                    >
                      <Text style={[styles.filterChipText, scopeFilter === "ALL_ORG" && styles.filterChipTextActive]}>
                        All Tickets ({issues.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, scopeFilter === "MY_WORK" && styles.filterChipActive]}
                      onPress={() => setScopeFilter("MY_WORK")}
                    >
                      <Text style={[styles.filterChipText, scopeFilter === "MY_WORK" && styles.filterChipTextActive]}>
                        My Tickets ({myTicketsCount})
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.filterChip, scopeFilter === "MY_WORK" && styles.filterChipActive]}
                      onPress={() => setScopeFilter("MY_WORK")}
                    >
                      <Text style={[styles.filterChipText, scopeFilter === "MY_WORK" && styles.filterChipTextActive]}>
                        My Tickets ({myTicketsCount})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, scopeFilter === "ASSIGNED" && styles.filterChipActive]}
                      onPress={() => setScopeFilter("ASSIGNED")}
                    >
                      <Text style={[styles.filterChipText, scopeFilter === "ASSIGNED" && styles.filterChipTextActive]}>
                        Assigned to Me ({issues.filter((i) => i.assigneeId === activeUser?.id).length})
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.filterDivider} />

                {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterChip, statusFilter === st && styles.filterChipActive]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text style={[styles.filterChipText, statusFilter === st && styles.filterChipTextActive]}>
                      {st === "ALL" ? "All Status" : st === "IN_PROGRESS" ? "In Progress" : st.charAt(0) + st.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tickets List */}
            {filteredIssues.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No tickets found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || statusFilter !== "ALL"
                    ? "Try adjusting your search or filters."
                    : "No tickets have been reported in this view yet."}
                </Text>
              </View>
            ) : (
              filteredIssues.map((iss) => (
                <TouchableOpacity
                  key={iss.id}
                  style={styles.ticketCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedIssue(iss)}
                >
                  {/* Card Header Row */}
                  <View style={styles.ticketCardHeader}>
                    <View style={styles.ticketIdRow}>
                      <Text style={styles.ticketNumber}>#{iss.ticketNumber}</Text>
                      <Text style={styles.categoryBadge}>{iss.category}</Text>
                    </View>

                    <View style={styles.badgeGroup}>
                      <View
                        style={[
                          styles.statusBadge,
                          iss.status === "RESOLVED" && styles.statusBadgeResolved,
                          iss.status === "IN_PROGRESS" && styles.statusBadgeProgress,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            iss.status === "RESOLVED" && styles.statusBadgeTextResolved,
                            iss.status === "IN_PROGRESS" && styles.statusBadgeTextProgress,
                          ]}
                        >
                          {iss.status === "IN_PROGRESS" ? "In Progress" : iss.status === "RESOLVED" ? "Resolved" : "Open"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.ticketTitle}>{iss.title}</Text>
                  <Text style={styles.ticketDescription} numberOfLines={2}>
                    {iss.description}
                  </Text>

                  {/* AI Assistance Preview (Clean & Subtle) */}
                  {iss.aiSummary || iss.aiSuggestedAction ? (
                    <View style={styles.aiInsightRow}>
                      <Text style={styles.aiInsightIcon}>✨</Text>
                      <Text style={styles.aiInsightText} numberOfLines={1}>
                        AI Insight: {iss.aiSuggestedAction || iss.aiSummary}
                      </Text>
                    </View>
                  ) : null}

                  {/* Footer Row */}
                  <View style={styles.ticketCardFooter}>
                    <View style={styles.assigneeRow}>
                      <View style={styles.miniAvatar}>
                        <Text style={styles.miniAvatarText}>
                          {iss.assignee ? iss.assignee.name.slice(0, 1) : "?"}
                        </Text>
                      </View>
                      <Text style={styles.assigneeName}>
                        {iss.assignee ? iss.assignee.name : "Unassigned"}
                      </Text>
                    </View>

                    <View style={styles.priorityIndicator}>
                      <View
                        style={[
                          styles.priorityDot,
                          iss.priority === "URGENT" && { backgroundColor: "#ef4444" },
                          iss.priority === "HIGH" && { backgroundColor: "#f97316" },
                          iss.priority === "MEDIUM" && { backgroundColor: "#3b82f6" },
                          iss.priority === "LOW" && { backgroundColor: "#64748b" },
                        ]}
                      />
                      <Text style={styles.priorityLabel}>{iss.priority}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ============================== */}
        {/* TAB 2: TASKS VIEW              */}
        {/* ============================== */}
        {activeTab === "tasks" && (
          <View style={styles.tabContent}>
            <View style={styles.tasksHeaderRow}>
              <Text style={styles.sectionHeading}>
                {isSuperAdmin ? "Team Tasks" : "My Tasks"}
              </Text>
              <TouchableOpacity
                style={styles.actionBtnSmall}
                onPress={() => setIsNewTaskModalOpen(true)}
              >
                <Text style={styles.actionBtnSmallText}>+ New Task</Text>
              </TouchableOpacity>
            </View>

            {filteredTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyTitle}>All tasks completed</Text>
                <Text style={styles.emptySubtitle}>Tap &apos;+ New Task&apos; to add items to your work list.</Text>
              </View>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === "DONE";
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskCard, isDone && styles.taskCardDone]}
                    onPress={() => handleToggleTask(task)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.taskCheckRow}>
                      <View style={[styles.taskCheckbox, isDone && styles.taskCheckboxDone]}>
                        {isDone ? <Text style={styles.checkmarkIcon}>✓</Text> : null}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                          {task.title}
                        </Text>

                        <View style={styles.taskMetaRow}>
                          {task.category ? (
                            <Text style={styles.taskMetaBadge}>{task.category}</Text>
                          ) : null}
                          {task.issue ? (
                            <Text style={styles.taskLinkedTicket}>
                              Ticket #{task.issue.ticketNumber}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ============================== */}
        {/* TAB 3: CREATE TICKET FORM      */}
        {/* ============================== */}
        {activeTab === "report" && (
          <View style={styles.tabContent}>
            <View style={styles.formContainer}>
              <Text style={styles.formMainTitle}>Create New Ticket</Text>
              <Text style={styles.formSubTitle}>
                Report an issue for your team to investigate and resolve.
              </Text>

              <Text style={styles.inputLabel}>Issue Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Payment service timeout error"
                placeholderTextColor="#64748b"
                value={reportTitle}
                onChangeText={setReportTitle}
              />

              <Text style={styles.inputLabel}>Description & Symptoms *</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Describe what went wrong, error messages, or steps to reproduce..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={4}
                value={reportDesc}
                onChangeText={setReportDesc}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.chipRow}>
                {["SOFTWARE", "HARDWARE", "NETWORK", "FACILITY", "SAFETY", "OTHER"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, reportCategory === cat && styles.chipActive]}
                    onPress={() => setReportCategory(cat)}
                  >
                    <Text style={[styles.chipText, reportCategory === cat && styles.chipTextActive]}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.chipRow}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((pr) => (
                  <TouchableOpacity
                    key={pr}
                    style={[styles.chip, reportPriority === pr && styles.chipActive]}
                    onPress={() => setReportPriority(pr)}
                  >
                    <Text style={[styles.chipText, reportPriority === pr && styles.chipTextActive]}>
                      {pr.charAt(0) + pr.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Department</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Engineering, Support, IT Ops"
                placeholderTextColor="#64748b"
                value={reportDepartment}
                onChangeText={setReportDepartment}
              />

              <Text style={styles.inputLabel}>Location / Environment (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Web App, Cloud Cluster, Office Room 3"
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxTitle}>✨ Run AI Diagnosis</Text>
                  <Text style={styles.checkboxSubtitle}>
                    Automatically suggest root cause and recommended action steps.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleCreateReport}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Submit Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ======================================= */}
      {/* MODAL 1: TICKET DETAIL & WORKFLOW SHEET */}
      {/* ======================================= */}
      <Modal visible={Boolean(selectedIssue)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "90%" }]}>
            {selectedIssue ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.modalTitle}>
                      Ticket #{selectedIssue.ticketNumber}
                    </Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{selectedIssue.category}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedIssue(null)}>
                    <Text style={styles.modalCloseIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailTitle}>{selectedIssue.title}</Text>
                  <Text style={styles.detailDesc}>{selectedIssue.description}</Text>

                  {/* AI Triage Insight Box */}
                  {selectedIssue.aiSummary || selectedIssue.aiRootCause || selectedIssue.aiSuggestedAction ? (
                    <View style={styles.aiInsightBox}>
                      <View style={styles.aiInsightHeader}>
                        <Text style={styles.aiInsightTitle}>✨ AI Assistant Diagnosis</Text>
                        {selectedIssue.aiConfidence ? (
                          <Text style={styles.aiConfidenceBadge}>
                            {(selectedIssue.aiConfidence * 100).toFixed(0)}% Confidence
                          </Text>
                        ) : null}
                      </View>

                      {selectedIssue.aiRootCause ? (
                        <View style={{ marginBottom: 8 }}>
                          <Text style={styles.aiLabel}>Potential Root Cause:</Text>
                          <Text style={styles.aiValue}>{selectedIssue.aiRootCause}</Text>
                        </View>
                      ) : null}

                      {selectedIssue.aiSuggestedAction ? (
                        <View>
                          <Text style={styles.aiLabel}>Recommended Action Steps:</Text>
                          <Text style={styles.aiValue}>{selectedIssue.aiSuggestedAction}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Status Workflow Action Buttons */}
                  <Text style={styles.modalSectionHeading}>Update Status</Text>
                  <View style={styles.statusButtonGroup}>
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
                          {st === "IN_PROGRESS" ? "In Progress" : st === "RESOLVED" ? "Resolved" : "Open"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Comments Section */}
                  <Text style={styles.modalSectionHeading}>Activity & Notes</Text>
                  {(selectedIssue.comments || []).length === 0 ? (
                    <Text style={styles.emptyCommentsText}>No notes added yet.</Text>
                  ) : (
                    (selectedIssue.comments || []).map((c) => (
                      <View key={c.id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>{c.author.name}</Text>
                          <Text style={styles.commentTime}>
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </View>
                        <Text style={styles.commentBody}>{c.content}</Text>
                      </View>
                    ))
                  )}

                  {/* Add Comment Input */}
                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add an update or note..."
                      placeholderTextColor="#64748b"
                      value={newComment}
                      onChangeText={setNewComment}
                    />
                    <TouchableOpacity
                      style={styles.commentSendBtn}
                      onPress={handleAddComment}
                      disabled={commentSubmitting}
                    >
                      <Text style={styles.commentSendBtnText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ======================================= */}
      {/* MODAL 2: USER PROFILE & TEAM MENU SHEET */}
      {/* ======================================= */}
      <Modal visible={isProfileModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "88%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account & Team</Text>
              <TouchableOpacity onPress={() => setIsProfileModalOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sub-tabs */}
            <View style={styles.segmentedToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, profileModalTab === "profile" && styles.toggleBtnActive]}
                onPress={() => setProfileModalTab("profile")}
              >
                <Text style={[styles.toggleBtnText, profileModalTab === "profile" && styles.toggleBtnTextActive]}>
                  My Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, profileModalTab === "switch" && styles.toggleBtnActive]}
                onPress={() => setProfileModalTab("switch")}
              >
                <Text style={[styles.toggleBtnText, profileModalTab === "switch" && styles.toggleBtnTextActive]}>
                  Switch User ({users.length})
                </Text>
              </TouchableOpacity>
            </View>

            {profileModalTab === "profile" ? (
              <ScrollView style={{ marginTop: 12 }}>
                {/* Profile Card */}
                <View style={styles.profileSummaryRow}>
                  <View style={styles.avatarCircleLg}>
                    {activeUser?.avatar ? (
                      <Image source={{ uri: activeUser.avatar }} style={styles.avatarImageLg} />
                    ) : (
                      <Text style={styles.avatarTextLg}>
                        {activeUser ? activeUser.name.slice(0, 2).toUpperCase() : "??"}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileSummaryName}>{activeUser?.name}</Text>
                    <Text style={styles.profileSummaryRole}>
                      {activeUser?.role} · {activeUser?.department || "General"}
                    </Text>
                    <Text style={styles.profileSummaryEmail}>{activeUser?.email}</Text>
                  </View>
                </View>

                {/* Avatar presets */}
                <Text style={styles.inputLabel}>Choose Avatar Photo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {MOBILE_AVATAR_PRESETS.map((presetUrl, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setProfileAvatar(presetUrl)}
                      style={[
                        styles.avatarPresetThumb,
                        profileAvatar === presetUrl && styles.avatarPresetThumbActive,
                      ]}
                    >
                      <Image source={{ uri: presetUrl }} style={styles.presetImg} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileName}
                  onChangeText={setProfileName}
                />

                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileDept}
                  onChangeText={setProfileDept}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 8 }]}
                  onPress={handleSaveProfile}
                  disabled={profileSubmitting}
                >
                  <Text style={styles.primaryBtnText}>
                    {profileSubmitting ? "Saving..." : "Save Profile"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView style={{ marginTop: 12 }}>
                <Text style={styles.helperText}>Tap any team member to switch active profile:</Text>
                {users.map((u) => {
                  const isCurrent = activeUser?.id === u.id;
                  const isSuper = u.role === "SUPER_ADMIN" || u.role === "ADMIN";
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.demoUserItem, isCurrent && styles.demoUserItemActive]}
                      onPress={() => handleLoginAs(u)}
                    >
                      <View style={styles.demoUserLeft}>
                        <View style={styles.userAvatarSm}>
                          <Text style={styles.userAvatarTextSm}>{u.name.slice(0, 1)}</Text>
                        </View>
                        <View>
                          <Text style={styles.demoUserName}>{u.name}</Text>
                          <Text style={styles.demoUserRole}>
                            {isSuper ? "Admin" : "Engineer"} · {u.department || "General"}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.demoUserAction, isCurrent && { color: "#10b981" }]}>
                        {isCurrent ? "Active ✓" : "Switch →"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================= */}
      {/* MODAL 3: DISPATCH TASK SHEET           */}
      {/* ======================================= */}
      <Modal visible={isNewTaskModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Task</Text>
              <TouchableOpacity onPress={() => setIsNewTaskModalOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Task Description *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Verify database indexing and apply hotfix"
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

            <Text style={styles.inputLabel}>Priority Level</Text>
            <View style={styles.chipRow}>
              {[
                { val: 1, label: "High (1)" },
                { val: 2, label: "Medium (2)" },
                { val: 3, label: "Low (3)" },
              ].map((p) => (
                <TouchableOpacity
                  key={p.val}
                  style={[styles.chip, taskPriority === p.val && styles.chipActive]}
                  onPress={() => setTaskPriority(p.val)}
                >
                  <Text style={[styles.chipText, taskPriority === p.val && styles.chipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Link to Ticket (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.chip, taskIssueId === "" && styles.chipActive]}
                onPress={() => setTaskIssueId("")}
              >
                <Text style={[styles.chipText, taskIssueId === "" && styles.chipTextActive]}>
                  Standalone
                </Text>
              </TouchableOpacity>
              {issues.map((iss) => (
                <TouchableOpacity
                  key={iss.id}
                  style={[styles.chip, taskIssueId === iss.id && styles.chipActive]}
                  onPress={() => setTaskIssueId(iss.id)}
                >
                  <Text style={[styles.chipText, taskIssueId === iss.id && styles.chipTextActive]}>
                    Ticket #{iss.ticketNumber}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateTask}
              disabled={taskSubmitting}
            >
              <Text style={styles.primaryBtnText}>
                {taskSubmitting ? "Creating..." : "Save Task"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================= */}
      {/* MODAL 4: SERVER CONNECTION SETTINGS     */}
      {/* ======================================= */}
      <Modal visible={isServerModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Server Connection</Text>
              <TouchableOpacity onPress={() => setIsServerModalOpen(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Configure your backend API server URL (for local network or physical mobile testing):
            </Text>

            <Text style={styles.inputLabel}>API URL</Text>
            <TextInput
              style={styles.textInput}
              placeholder={getApiUrl()}
              placeholderTextColor="#64748b"
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={handleResetServerUrl}
              >
                <Text style={styles.secondaryBtnText}>Auto-Detect</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={handleTestConnection}
                disabled={testStatus.testing}
              >
                <Text style={styles.secondaryBtnText}>
                  {testStatus.testing ? "Pinging..." : "Test Connection"}
                </Text>
              </TouchableOpacity>
            </View>

            {testStatus.result ? (
              <View
                style={[
                  styles.statusResultBox,
                  { borderColor: testStatus.ok ? "#10b981" : "#ef4444" },
                ]}
              >
                <Text style={{ color: testStatus.ok ? "#10b981" : "#ef4444", fontSize: 12 }}>
                  {testStatus.ok ? "✓ " : "✕ "} {testStatus.result}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveServerUrl}>
              <Text style={styles.primaryBtnText}>Save & Reconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 12,
  },

  // Auth / Welcome View
  authContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  authHeader: {
    alignItems: "center",
    marginVertical: 20,
  },
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  brandIcon: {
    fontSize: 26,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  authSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 280,
  },
  segmentedToggle: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#1e293b",
  },
  toggleBtnText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  toggleBtnTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  authFormCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkTextSmall: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  helperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  helperText: {
    fontSize: 11,
    color: "#64748b",
  },
  errorAlert: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorAlertText: {
    color: "#f87171",
    fontSize: 12,
  },
  quickAccessSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 16,
  },
  quickAccessTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  demoUserItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#0b0f19",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  demoUserItemActive: {
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  demoUserLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userAvatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarTextSm: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  demoUserName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
  },
  demoUserRole: {
    fontSize: 11,
    color: "#64748b",
  },
  demoUserAction: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },
  footerLinkBtn: {
    alignItems: "center",
    paddingVertical: 18,
  },
  footerLinkText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },

  // Main Dashboard Header
  header: {
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  userGreeting: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  statusDotButton: {
    padding: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e293b",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  roleTag: {
    paddingRight: 2,
  },
  roleTagText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  offlineWarningBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  offlineWarningText: {
    color: "#f87171",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#0b0f19",
    padding: 3,
    borderRadius: 10,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  mainTabBtnActive: {
    backgroundColor: "#1e293b",
  },
  mainTabText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  mainTabTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },

  // Content Area
  contentScroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchBar: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: "#ffffff",
  },
  filtersScroll: {
    marginBottom: 14,
  },
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChip: {
    backgroundColor: "#111827",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterChipText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  filterDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#1e293b",
    marginHorizontal: 4,
  },

  // Tickets List & Cards
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  ticketCard: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  ticketCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ticketNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3b82f6",
  },
  categoryBadge: {
    fontSize: 10,
    color: "#94a3b8",
    backgroundColor: "#1e293b",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontWeight: "600",
  },
  categoryBadgeText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadge: {
    backgroundColor: "#1e293b",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusBadgeProgress: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  statusBadgeResolved: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  statusBadgeTextProgress: {
    color: "#fbbf24",
  },
  statusBadgeTextResolved: {
    color: "#34d399",
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 4,
  },
  ticketDescription: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 17,
    marginBottom: 8,
  },
  aiInsightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#6366f1",
  },
  aiInsightIcon: {
    fontSize: 12,
  },
  aiInsightText: {
    fontSize: 11,
    color: "#c7d2fe",
    flex: 1,
  },
  ticketCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },
  assigneeName: {
    fontSize: 11,
    color: "#94a3b8",
  },
  priorityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },

  // Tasks Tab
  tasksHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  actionBtnSmall: {
    backgroundColor: "#3b82f6",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnSmallText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  taskCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  taskCardDone: {
    opacity: 0.6,
  },
  taskCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckboxDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkmarkIcon: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f8fafc",
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: "#64748b",
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  taskMetaBadge: {
    fontSize: 10,
    color: "#64748b",
    backgroundColor: "#0b0f19",
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  taskLinkedTicket: {
    fontSize: 10,
    color: "#3b82f6",
    fontWeight: "600",
  },

  // Create Ticket Form
  formContainer: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  formMainTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  formSubTitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 5,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#ffffff",
    marginBottom: 8,
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#1e293b",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  chipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  chipText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
    backgroundColor: "#0b0f19",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  checkboxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#f8fafc",
  },
  checkboxSubtitle: {
    fontSize: 10,
    color: "#64748b",
  },
  primaryBtn: {
    backgroundColor: "#3b82f6",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  logoutBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#1e293b",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalCloseIcon: {
    fontSize: 16,
    color: "#94a3b8",
    padding: 4,
  },
  modalSectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e2e8f0",
    marginTop: 14,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  detailDesc: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 12,
  },
  aiInsightBox: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  aiInsightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  aiInsightTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c7d2fe",
  },
  aiConfidenceBadge: {
    fontSize: 10,
    color: "#34d399",
    fontWeight: "700",
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },
  aiValue: {
    fontSize: 12,
    color: "#e2e8f0",
    lineHeight: 16,
  },
  statusButtonGroup: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  statusActionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  statusActionBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  statusActionText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  statusActionTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  emptyCommentsText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    marginBottom: 8,
  },
  commentCard: {
    backgroundColor: "#0b0f19",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
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
  commentBody: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  commentInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#0b0f19",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#ffffff",
  },
  commentSendBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Profile Modal
  profileSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0b0f19",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 14,
  },
  avatarCircleLg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImageLg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarTextLg: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  profileSummaryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  profileSummaryRole: {
    fontSize: 12,
    color: "#94a3b8",
  },
  profileSummaryEmail: {
    fontSize: 11,
    color: "#64748b",
  },
  avatarPresetThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  avatarPresetThumbActive: {
    borderColor: "#3b82f6",
  },
  presetImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusResultBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#0b0f19",
    marginBottom: 8,
  },
});
