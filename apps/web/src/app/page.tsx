"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Task = { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "DONE"; createdAt: string };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/tasks`);
      if (!response.ok) throw new Error("Could not load tasks. Is the API running?");
      setTasks(await response.json());
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load tasks"); }
  }, []);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    const response = await fetch(`${apiUrl}/api/tasks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), ownerId: "demo-user" })
    });
    if (!response.ok) { setError("Could not create task. Check that the database has been migrated and seeded."); return; }
    setTitle("");
    await loadTasks();
  }

  async function updateStatus(task: Task, status: Task["status"]) {
    await fetch(`${apiUrl}/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    await loadTasks();
  }

  async function deleteTask(id: string) {
    await fetch(`${apiUrl}/api/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  }

  return <main className="shell">
    <div className="eyebrow">WorkMate AI · Team workspace</div>
    <h1>Tasks, moving forward.</h1>
    <p className="subtle">A clear view of the work your team needs to get done.</p>
    <section className="panel">
      <h2>Create a task</h2>
      <form className="form" onSubmit={createTask}>
        <input aria-label="Task title" placeholder="What needs to get done?" value={title} onChange={(event) => setTitle(event.target.value)} />
        <button className="primary" type="submit">Add task</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    <section className="panel">
      <h2>Team tasks <span className="meta">({tasks.length})</span></h2>
      {tasks.length === 0 && !error && <p className="subtle">No tasks yet. Add the first one above.</p>}
      {tasks.map((task) => <div className="task" key={task.id}>
        <div><div className="task-title">{task.title}</div><div className="meta">Created {new Date(task.createdAt).toLocaleDateString()}</div></div>
        <div>
          <select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => void updateStatus(task, event.target.value as Task["status"])}>
            <option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option>
          </select>{" "}
          <button type="button" onClick={() => void deleteTask(task.id)}>Delete</button>
        </div>
      </div>)}
    </section>
  </main>;
}
