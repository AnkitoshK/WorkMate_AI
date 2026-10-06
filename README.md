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
FOR LIVE ACCESS - Please click this link - https://work-mate-j5h7ir51a-ankitoshs-projects.vercel.app/
---

## 💻 Quick Start Guide

### ⚡ 1-Click Launch (All 3 Services)
Double-click `start-workmate.bat` or run:
```bash
pnpm dev:all
# or: pnpm start
```
This automatically launches:
1. **Express API Server**: [http://localhost:4000](http://localhost:4000)
2. **Next.js Web Portal**: [http://localhost:3000](http://localhost:3000)
3. **Expo Mobile Metro**: [http://localhost:8081](http://localhost:8081)

---

## 📚 Project Documentation & Video Demonstration

All detailed manuals, architectural diagrams, process flows, and video walkthroughs are included in the repository:

### 🎬 Video Walkthrough
- **ITSM Operations Demo**: Available under [GitHub Releases](https://github.com/AnkitoshK/WorkMate_AI/releases) as `WorkMate_AI_ITSM_Operations_Demo.mp4`. Covers real-time incident triage, ticket resolution, and dispatch operations.

### 📖 Master Documentation & User Guides
- [`docs/COMPREHENSIVE_OPERATIONS_MANUAL.md`](docs/COMPREHENSIVE_OPERATIONS_MANUAL.md) — Comprehensive operations manual.
- [`docs/WORKMATE_AI_CODE_AND_PAGE_ARCHITECTURE_GUIDE.md`](docs/WORKMATE_AI_CODE_AND_PAGE_ARCHITECTURE_GUIDE.md) — Code-by-code & page-by-page architecture guide.
- [`docs/EASY_UNDERSTANDING_GUIDE.md`](docs/EASY_UNDERSTANDING_GUIDE.md) — Plain English high-level guide.
- [`docs/full_project_guide.md`](docs/full_project_guide.md) — End-to-end full project breakdown.
- [`docs/user_manual_and_system_guide.md`](docs/user_manual_and_system_guide.md) — User manual & system guide.

### 📑 Microsoft Word Documentation (.docx)
- `docs/WorkMate_AI_Master_Project_Documentation.docx`
- `docs/WorkMate_AI_Complete_Operations_Manual.docx`
- `docs/WorkMate_AI_Deep_Dive_Learning_Guide.docx`
- `docs/WorkMate_AI_Code_And_Page_Architecture_Guide.docx`
- `docs/WorkMate_AI_Process Flow.docx`
- `docs/WorkMate_AI_Tech_Stack.docx`
- `docs/WorkMate_AI_Guide Part 0.docx`
- `docs/WorkMate_AI_Part 1.docx`
- `docs/WorkMate_AI_Part 2.docx`
- `docs/WorkMate_AI_User_Manual Part 3.docx`
- `docs/WorkMate_AI_Final Part.docx`
