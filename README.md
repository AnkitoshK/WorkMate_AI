# ⚡ WorkMate AI — Full-Stack Industrial Ticketing & Field Operations Platform

> A full-stack, enterprise-grade task and incident management platform for field engineers and office operations teams, powered by autonomous AI triage, Neon Serverless Postgres, Express REST API, Next.js dashboard, and Expo React Native mobile.

---

## 🌟 Key Features

1. **Intelligent Ticketing & Incident Workflow**:
   - Multi-status issue lifecycle: `OPEN` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED` ➔ `CLOSED`.
   - Priority assessment: `LOW`, `MEDIUM`, `HIGH`, `URGENT` with live glowing pulse alerts.
   - Categorization across critical domains: `FACILITY`, `NETWORK`, `HARDWARE`, `SAFETY`, `SOFTWARE`, `OTHER`.
   - Kanban board with drag-free quick actions & full Table view switcher.
   - Rich Ticket Detail Modal with collaboration thread, resolution notes, and live re-assignment.

2. **WorkMate AI Copilot**:
   - **Autonomous Incident Triage**: Automatically extracts failure patterns, determines likely root causes, estimates SLA priority, and generates numbered step-by-step Standard Operating Procedure (SOP) remediation checklists.
   - **Executive Shift Briefing**: Generates real-time operational summaries across active tickets, overdue work orders, and team dispatch bottlenecks.
   - **Dual-Engine Architecture**: Seamlessly calls Google Gemini API when configured, with a built-in deterministic domain intelligence engine for 100% resilient offline/evaluation execution.

3. **Field Task Dispatching**:
   - Scheduled work orders linked directly to parent incident tickets.
   - Due date tracking, category tags, and 1-click status toggling.

4. **Multi-Role Profile Simulation**:
   - Instant live switcher between roles:
     - 👩‍💼 **Sarah Chen** (Executive Admin)
     - 👨‍💼 **Marcus Vance** (Operations & Dispatch Manager)
     - 👷 **Alex Rivera** (Senior Software Engineer)
     - 👩‍💻 **Priya Sharma** (Network & Systems Specialist)

5. **Cross-Platform Experience**:
   - **Web Dashboard**: Next.js App Router with ultra-premium dark glassmorphic styling, real-time KPI metrics, and AI sandbox.
   - **Mobile App**: Expo React Native on-call software engineer application for rapid on-site updates and mobile incident logging.

---

## 🏗️ Architecture

```text
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     Next.js Web Dashboard     │        │    Expo React Native Mobile   │
│       (Admin & Dispatch)      │        │      (On-Call Engineers)      │
└───────────────┬───────────────┘        └───────────────┬───────────────┘
                │               HTTP / REST API          │
                └───────────────────────┬────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │     Express REST API Server   │
                        │   (Routes, Services, AI Engine)│
                        └───────────────┬───────────────┘
                                        │
                         Prisma ORM     │    AI Gateway / Gemini
                                        ▼
                        ┌───────────────────────────────┐
                        │     Neon Serverless Postgres  │
                        │   (Users, Issues, Comments)   │
                        └───────────────────────────────┘
```

---

## 🚀 Live Local Endpoints

- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)
- **API Metrics**: [http://localhost:4000/api/stats](http://localhost:4000/api/stats)
- **API Tickets**: [http://localhost:4000/api/issues](http://localhost:4000/api/issues)
- **API Tasks**: [http://localhost:4000/api/tasks](http://localhost:4000/api/tasks)

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 App Router, React 19, Vanilla CSS Glassmorphism
- **Mobile**: Expo SDK 57, React Native, Safe Area Context
- **Backend**: Node.js, Express, TypeScript, Zod Validation
- **Database & ORM**: Neon Serverless PostgreSQL, Prisma ORM
- **AI Engine**: WorkMate Autonomous Domain Intelligence + Google Gemini Integration
- **Package Management**: pnpm monorepo workspace

---

## 💻 Quick Start & Evaluation Guide

### 1. Start API Server:
```bash
cd apps/api
npm run start
# Listens on http://localhost:4000
```

### 2. Start Web Dashboard:
```bash
cd apps/web
npm run start
# Available at http://localhost:3000
```

### 3. Start Mobile App (Optional):
```bash
cd apps/mobile
npm run start
```
