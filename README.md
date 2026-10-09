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

## 🔄 Complete System Feature Flows & Operational Lifecycle

### 1. Shift Attendance Lifecycle & Same-Day Re-Login Lock
WorkMate AI enforces a strict, enterprise-compliant shift and attendance schedule to ensure accurate work-hour reporting, employee wellness, and shift handover integrity:

```text
[Employee Login]
       │
       ▼
[9:00 AM Shift Punch In] ──► (Arrival ≤ 9:30 AM: ON_TIME | Arrival > 9:30 AM: LATE)
       │
       ▼ (Duty Status: ON_DUTY)
[Active Shift Duration: 8h 30m]
       │
       ▼
[5:30 PM Shift Punch Out] ──► (Status: COMPLETED / HALF_DAY / EARLY_LOGOUT)
       │                      (Duty Status: OFF_DUTY | Total Hours Logged)
       ▼
[Shift Logout]
       │
       ▼
[Shift Cooldown Window: 1 Hour Cooling Period]
       │
       ├──► ❌ Attempt Re-login during Cooldown ──► BLOCKED (403 Forbidden with exact countdown)
       │
       ▼
[Cooldown Expires / New Cycle] ──► ✅ Allowed to log in and start new shift session
```

#### Detailed Step-by-Step Flow:
1. **User Sign-In**:
   - The employee enters their registered corporate email and account password.
   - On successful authentication, their active session is initiated.
2. **Shift Punch-In (9:00 AM Standard Shift)**:
   - Attendance is **explicitly punched** via the Punch Terminal (web login alone does not mark attendance).
   - **30-Minute Relaxation Buffer**:
     - Arrival on or before 9:30 AM is designated as `ON_TIME` with the grace buffer applied.
     - Arrival after 9:30 AM is categorized as `LATE`, and late arrival duration is recorded down to the exact minute.
   - Duty status transitions to `ON_DUTY` with the exact punch timestamp and IP address logged in Neon Serverless Postgres.
   - **Single Punch Guard**: The employee cannot punch in multiple times for the same daily cycle (`existingTodayPunch` guard).
3. **Shift Punch-Out (5:30 PM Standard Shift End)**:
   - At the conclusion of the 8h 30m workday, the employee clicks **Punch Out**.
   - The platform calculates the exact time elapsed between morning Punch In and evening Punch Out (e.g. `8h 30m`).
   - Shift status is categorized:
     - `COMPLETED`: Work duration ≥ 8 hours 30 minutes.
     - `HALF_DAY`: Work duration ≥ 4 hours 15 minutes.
     - `EARLY_LOGOUT`: Left prior to minimum shift threshold.
   - Duty status transitions to `OFF_DUTY`.
4. **Shift Logout, 1-Hour Cooling Period & Mandatory Re-Entry Remarks**:
   - When the user logs out after punching out, the **Shift Cooldown period of 1 hour** is initialized.
   - **Cooldown Protection**: To protect against accidental double punches or session collisions immediately after shift exit, the employee is protected by a 1-hour cooling period.
   - Attempting to log in during this period triggers an HTTP `403 Forbidden` response displaying the exact time when next login is authorized:
     > *"Shift cooldown active: You logged out of your shift. Per 1-hour cooling period rules, at [Time] you are able to login and punch in attendance again (remaining: Xm)."*
   - **Re-Entry Attendance with Remarks Popup**: If a user logs back in after the 1-hour cooling period having already completed and punched out of their shift today, they cannot mark standard attendance directly. When attempting to punch in, an **Attendance Remarks Popup Modal** appears requiring a valid reason (e.g., *Overtime Duty*, *Emergency Incident Triage*, *Post-Logout Shift Re-Entry*).
   - Once confirmed, the re-entry punch is stored in the database with status `RE_ENTRY`, appears in the dashboard attendance audit trail with remarks, and exports seamlessly into Excel/CSV under the `Shift Remarks` column.
   - **SuperAdmin Override**: `SUPER_ADMIN` and `ADMIN` roles are exempt from cooldown locks for emergency platform management and can reset any user's cooldown via `POST /api/users/reset-cooldown`.
5. **30-Day Rolling Data Retention**:
   - Attendance records are preserved for a 30-day (1 month) audit window.
   - Records older than 30 days are automatically pruned by background retention routines, keeping the database optimized.

---

### 2. Multi-Tab Styled Colorful Excel (.xlsx) & CSV Calculation Reports
WorkMate AI generates professionally styled, enterprise-grade Microsoft Excel (`.xlsx`) workbooks powered by `exceljs` across every operational tab, featuring distinctive curated color palettes, bold white titles, frozen headers, grid borders, zebra-striped rows, and automatic column sizing:

| Tab | Excel Palette / Theme | Dominant Header Fill | Styled Columns & Status Pill Badging |
|---|---|---|---|
| **Active Tickets** | Navy Corporate | Deep Navy `#1E3A8A` | Ticket ID, Title, Status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), Priority, Category, Department, Assignee, Linked Asset |
| **Closed Tickets Archive** | Indigo Audit | Deep Indigo `#312E81` | Ticket ID, Issue Title, Turnaround Duration, Resolution Notes, AI Root Cause Diagnosis, Resolver, Closed At |
| **Attendance Records** | Emerald Workplace | Deep Emerald `#065F46` | Punch In Time, Punch Out Time, Shift Duration (`8h 30m`), Decimal Hours (`8.50` calculation-ready), Shift Remarks |
| **Team Credentials** | Purple Security | Royal Purple `#581C87` | User ID, Name, Email, Role, Department, Password/Hash, Duty Shift Status (`ON_DUTY`, `OFF_DUTY`, `RE_ENTRY`) |
| **Field Tasks** | Blue & Amber Dispatch | Deep Blue `#1E40AF` | Task ID, Task Title, Priority, Category, Owner/Assignee, Linked Ticket (`#TIK-001`), Due Date, Status (`TODO`, `DONE`) |

- **Design Features**:
  - **Frozen Top Row**: Header row remains visible while scrolling thousands of records.
  - **Dynamic Status Highlighting**: Cell backgrounds for statuses (e.g. `ON_TIME` in emerald, `LATE` in rose, `URGENT` in red, `RESOLVED` in teal) are rendered directly in Excel cells.
  - **Auto-Calculated Decimal Hours**: Allows direct spreadsheet formulas (`=SUM(...)`, `=AVERAGE(...)`) without manual string conversion.
  - **Both Client & Server Download**: Download directly via browser client blob or direct streaming API endpoints (`GET /api/attendance/export-excel`, `GET /api/users/export-excel`).

---

### 3. Role-Based Access Control (RBAC) & Authority Hierarchy
WorkMate AI enforces granular, zero-leakage role governance across 5 enterprise tiers:

| Role | Badge | Permissions & Operational Scope |
|---|---|---|
| **SuperAdmin** | 👑 `SUPER_ADMIN` | Full platform supremacy: create/delete users, provision services, switch accounts, view & export user passwords/credentials, company-wide attendance. |
| **Engineering Manager** | 👔 `MANAGER` | Tech lead oversight, work order dispatching, triage approvals, ticket re-assignment, squad workload rebalancing. |
| **Software Engineer** | 🛠️ `ENGINEER` | Claim on-call incidents, run AI triage diagnostics, attach PR links, resolve tickets, submit personal shift attendance. |
| **Platform Admin** | 🛡️ `ADMIN` | Configure SLA thresholds, monitor service health, manage routing queues, bypass shift cooldowns. |
| **Developer / Reporter** | 👤 `USER` | Submit incident bug reports, track resolution status, post comments, follow incident progress. |

---

### 4. Device-Scoped Account Suggestion & Zero-Leakage Privacy
- **1st Login Remembered**: When any user logs into WorkMate AI on a browser for the first time, their account is securely stored in device `localStorage`.
- **Employee Devices**: On a normal employee's device, **only their own single ID** is suggested below the login button (`👤 Suggested Login ID (Saved on Device)`). They can never see any other employee's ID.
- **SuperAdmin Devices**: Devices where a SuperAdmin has authenticated offer quick administrative selection across authorized accounts (`👑 SuperAdmin Quick Login Suggestions`).
- **Public / Unauthenticated Devices**: Fresh visitors or incognito windows display **zero account suggestions**, protecting corporate user directories from unauthorized discovery.
- **Device Forget Option**: Users can click `✕` on any suggested account card to clear cached credentials from that machine.

---

### 5. SuperAdmin User Credential & Password Audit Export
- **Security Compliance**: SuperAdmins can download the complete user credential directory via `GET /api/users/export` (CSV) or `GET /api/users/export-excel` (Styled .xlsx).
- **Report Contents**: Exported workbook contains User ID, Full Name, Email Address, Role, Department, **Password (Hash / Security Code)**, Duty Status, Created At, Last Login At, and Last Logout At.
- **Non-Admin Protection**: Non-superadmin access attempts receive a strict `403 Forbidden` response.

---

### 6. SuperAdmin-Only Account Switcher
- Account switching is **strictly restricted to SuperAdmins**. Normal employees cannot switch accounts under any circumstances.
- Available exclusively to SuperAdmins across three convenient locations:
  1. **Header Bar**: Quick `🔁 Switch` button.
  2. **Auth Modal**: `🔁 Switch Account` tab.
  3. **Team Management (Tab 4)**: `Switch to User →` button on each team member card.

---

### 7. Closed Incident Audit Archive & AI Copilot Workflow
- **Closed Ticket Archive**: Completed incidents are archived in a dedicated database table with turnaround time, resolution notes, and root-cause records, exportable via CSV and styled Excel.
- **WorkMate AI Incident Copilot**: Autonomous triage extracts failure patterns, determines root causes, and recommends step-by-step SOP remediation plans.

---

### 8. Instant 0ms Sign-In & Login Acceleration Architecture
WorkMate AI eliminates perceived authentication lag through a high-performance, multi-layered architecture:

```text
[User Clicks "Sign In" / User ID Card]
       │
       ├──► ⚡ Step 1: Instant Client Optimistic Activation (0ms)
       │         • Modal closes immediately
       │         • User session activates instantly with matched profile
       │         • Dashboard renders active workspace with 0 loading delay
       │
       └──► 🚀 Step 2: High-Speed Background Verification & DB Touch
                 • Backend Neon Postgres uses direct indexed lookup (findUnique)
                 • Async unawaited lastLoginAt touch (no remote DB wait)
                 • Shift cooldown validation (1-hour cooling check)
                 • Graceful rollback & security alert if invalid or cooldown active
```

- **Instant 1-Click Sign-In via User ID**: In the Auth Modal, users can click any registered account card or their User ID to instantly access their profile without typing.
- **Sub-Millisecond Neon Lookups**: Database queries target the unique lowercase email index directly, bypassing expensive table scans.
- **Non-Blocking Audit Logging**: Session timestamps are updated asynchronously in the background so the user is never blocked by database network latency.

---

### 9. Basic Self-Service "Forgot Password" Flow (Zero-OTP / Zero-Email Configuration)
WorkMate AI includes a straightforward, self-service password recovery flow that requires **no external SMTP server, SendGrid API key, or SMS gateway configuration**:

```text
[Forgot Password Clicked in Auth Modal]
       │
       ▼
[Enter Registered Work Email]
       │
       ▼
[Input New Password & Confirm Password (min. 6 characters)]
       │
       ▼
[POST /api/users/forgot-password]
       │
       ├──► 🔍 Validates Email exists in Neon Database
       │
       ├──► 🔒 Hashes New Password with bcrypt (10 rounds)
       │
       ├──► 💾 Updates User record in PostgreSQL
       │
       ▼
[Instant Automatic Sign-In]
       │
       ▼
[Success Toast & Active Dashboard Session Initiated]
```

- **Zero-Dependency Architecture**: Teams can deploy and test locally or on preview environments without configuring complex email relays or waiting for OTP codes.
- **Password Strength Enforced**: Requires a minimum of 6 characters with real-time confirmation matching.
- **Existing Rules Preserved**: Resetting password does not bypass shift attendance records, the 1-hour cooling period, or role-based security boundaries.
- **Immediate Access**: Once the password is updated, the user is immediately logged in to their account, avoiding redundant login prompts.

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
