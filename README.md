# ⚡ WorkMate AI — Full-Stack Industrial Ticketing & Field Operations Platform

> A full-stack, enterprise-grade task and incident management platform for engineering and office operations teams, powered by autonomous AI triage, Neon Serverless Postgres, Express REST API, and Next.js web application.

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

5. **Enterprise Web Experience**:
   - **Web Dashboard**: Next.js App Router with ultra-premium dark glassmorphic styling, real-time KPI metrics, shift attendance tracking, closed ticket archiving, and AI sandbox.

---

## 🏗️ Architecture

```text
┌───────────────────────────────────────────────────────────────┐
│                    Next.js Web Dashboard                      │
│        (Executive Admin, Operations Dispatch & Field Ops)      │
└───────────────────────────────┬───────────────────────────────┘
                                │ HTTP / REST API
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
- **Backend**: Node.js, Express, TypeScript, Zod Validation
- **Database & ORM**: Neon Serverless PostgreSQL, Prisma ORM
- **AI Engine**: WorkMate Autonomous Domain Intelligence + Google Gemini Integration
- **Package Management**: pnpm monorepo workspace

---
FOR LIVE ACCESS - Please click this link - https://work-mate-j5h7ir51a-ankitoshs-projects.vercel.app/  **OR** https://work-mate-ai-eight.vercel.app/
---

## 💻 Local Machine Setup & Run Guide

### 📋 Prerequisites
Before running locally, ensure you have the following installed:
1. **Node.js**: `v18.0.0` or higher ([nodejs.org](https://nodejs.org))
2. **pnpm**: Fast, disk space efficient package manager. Install globally if needed:
   ```bash
   npm install -g pnpm
   ```

---

### ⚠️ Important Notice
> **The mobile client (`apps/mobile`) has been completely removed.** WorkMate AI is now a unified, responsive enterprise Web application.
> If your terminal was previously inside `apps/mobile`, make sure to navigate back to the root directory before running any commands!

---

### 🚀 Step-by-Step Instructions

#### 1. Navigate to the Project Root Directory
Open your terminal (PowerShell, Command Prompt, or VS Code terminal) and ensure you are in the root directory:
```powershell
cd "d:\E DRIVE\Project\MCA\WorkMate_AI_Full_Stack_Project_Guide\WorkMate_AI"
```

#### 2. Install Dependencies & Generate Database Client
From the root folder, install all workspace packages and auto-generate the Prisma client:
```bash
pnpm install
```

#### 3. Run the Full-Stack Application
Choose whichever method you prefer:

##### ⚡ Option A: 1-Click Launch (Easiest — Windows Batch File)
Simply double-click `start-workmate.bat` in the project root folder.
This opens a command window and launches both the Backend API and Next.js Web Portal simultaneously.

##### 🖥️ Option B: Single Command (Concurrent Terminal)
From the root directory, run:
```bash
pnpm dev
```
*(Runs both the Express API and Next.js Web server together with color-coded console logs).*

##### 🔀 Option C: Separate Terminals (Recommended for isolated debugging)
- **Terminal 1 — Backend REST API**:
  ```bash
  pnpm dev:api
  ```
  *Server starts at `http://localhost:4000`*

- **Terminal 2 — Next.js Web Portal**:
  ```bash
  pnpm dev:web
  ```
  *Frontend starts at `http://localhost:3000`*

---

### 🌐 Accessing the Application

Once launched, open your web browser:
- **Web Portal (Next.js Dashboard)**: [http://localhost:3000](http://localhost:3000)
- **Backend API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)
- **Backend API Metrics**: [http://localhost:4000/api/stats](http://localhost:4000/api/stats)

---

### 🔐 Pre-Seeded Test Credentials

You can log into the local web portal using any of the simulated enterprise accounts:

| Name | Role | Email | Password |
|---|---|---|---|
| **Sarah Chen** | Super Admin | `admin@workmate.internal` | `WorkMate@123` |
| **Marcus Vance** | Operations & Dispatch Manager | `marcus@workmate.internal` | `WorkMate@123` |
| **Alex Rivera** | Senior Software Engineer | `alex@workmate.internal` | `WorkMate@123` |
| **Priya Sharma** | Network & Systems Specialist | `priya@workmate.internal` | `WorkMate@123` |

---

### 🛠️ Common Troubleshooting

- **Error: `Could not determine Node.js install directory` or command fails in `apps/mobile`**:
  Your terminal was likely opened in the old `apps/mobile` folder that was deleted. Simply run `cd ../..` or open a new terminal in the project root.
- **Port Conflicts**:
  If port `3000` or `4000` is already in use, check for background node processes or change ports in `apps/api/.env`.
- **Database Connection**:
  The backend connects to Neon Serverless Postgres via `DATABASE_URL` in `apps/api/.env`. Verify internet connectivity when querying live data.

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
