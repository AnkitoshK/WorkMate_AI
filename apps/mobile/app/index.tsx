import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

type Task = { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "DONE" };
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/tasks`);
      if (!response.ok) throw new Error("Could not load tasks. Check the API address.");
      setTasks(await response.json()); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load tasks"); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  async function createTask() {
    if (!title.trim()) return;
    const response = await fetch(`${apiUrl}/api/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), ownerId: "demo-user" })
    });
    if (!response.ok) { setError("Could not create task. Run the database migration and seed first."); return; }
    setTitle(""); await loadTasks();
  }

  async function advance(task: Task) {
    const next = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : "TODO";
    await fetch(`${apiUrl}/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    await loadTasks();
  }

  return <SafeAreaView style={styles.safe}>
    <View style={styles.container}>
      <Text style={styles.eyebrow}>WORKMATE · FIELD TEAM</Text>
      <Text style={styles.heading}>Your tasks</Text>
      <Text style={styles.caption}>Keep the day moving, one task at a time.</Text>
      <View style={styles.form}>
        <TextInput accessibilityLabel="Task title" placeholder="Add a task for your team" value={title} onChangeText={setTitle} onSubmitEditing={() => void createTask()} style={styles.input} returnKeyType="done" />
        <Pressable onPress={() => void createTask()} style={styles.addButton}><Text style={styles.addText}>Add</Text></Pressable>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {busy ? <ActivityIndicator color="#176b5b" style={styles.loader} /> : <FlatList
        data={tasks} keyExtractor={(task) => task.id} contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nothing assigned yet. Add your first task above.</Text>}
        renderItem={({ item }) => <Pressable onPress={() => void advance(item)} style={styles.card}>
          <View style={[styles.dot, item.status === "DONE" && styles.doneDot]} />
          <View style={styles.taskInfo}><Text style={styles.taskTitle}>{item.title}</Text><Text style={styles.status}>{item.status.replace("_", " ")} · tap to advance</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>}
      />}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" }, container: { flex: 1, paddingHorizontal: 22, paddingTop: 28 },
  eyebrow: { color: "#176b5b", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 }, heading: { color: "#182230", fontSize: 32, fontWeight: "800", marginTop: 8 },
  caption: { color: "#667085", fontSize: 15, marginTop: 8 }, form: { flexDirection: "row", gap: 9, marginTop: 28 },
  input: { flex: 1, borderWidth: 1, borderColor: "#d6dee8", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "white", fontSize: 15 },
  addButton: { backgroundColor: "#176b5b", borderRadius: 10, justifyContent: "center", paddingHorizontal: 18 }, addText: { color: "white", fontWeight: "700" },
  list: { paddingTop: 18, paddingBottom: 32 }, card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#e6ebf1" },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#e7a33e", marginRight: 13 }, doneDot: { backgroundColor: "#2c9b73" }, taskInfo: { flex: 1 }, taskTitle: { color: "#182230", fontSize: 16, fontWeight: "700" },
  status: { color: "#667085", fontSize: 11, marginTop: 6 }, chevron: { color: "#98a2b3", fontSize: 24 }, empty: { color: "#667085", textAlign: "center", marginTop: 48, lineHeight: 22 },
  error: { color: "#b42318", marginTop: 12 }, loader: { marginTop: 48 }
});
