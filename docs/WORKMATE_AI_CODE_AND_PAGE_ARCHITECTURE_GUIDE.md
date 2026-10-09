# WorkMate AI — Code-by-Code & Page-by-Page System Architecture Guide
*Comprehensive Enterprise Technical Manual: Monorepo Architecture, Neon Serverless Postgres Schema, Express REST API Endpoints, AI Diagnostic Engine, Next.js Web Portal, Operational Lifecycle Workflows, and Colorful Excel Export Engine*

---

## 🌟 Executive Summary: What is WorkMate AI?

In modern cloud-native enterprises (such as Netflix, Uber, Stripe, or Amazon), critical distributed systems experience failures continuously: database connection deadlocks, payment gateway timeouts, microservice latency spikes, or Kubernetes pod crashes.

In traditional organizations, when an operational incident occurs:
1. Support agents file generic, unstructured tickets in Jira without technical context.
2. Incidents sit in unassigned triage queues for hours awaiting human evaluation.
3. Once assigned, on-call software engineers waste 45+ minutes manually querying distributed logs to deduce the root cause.
4. Contractual Service Level Agreements (SLAs) are breached, resulting in direct revenue loss, compliance penalties, and customer churn.

**WorkMate AI** solves this operational bottleneck by delivering an enterprise **IT Service Management (ITSM), Workforce Operations, and Incident Command Platform** that unifies four core capabilities:
- **Jira Functionality**: Project tracking, 5-stage Kanban incident lifecycle, role-based scoping, and granular work orders.
- **ServiceNow Functionality**: Monitored microservice catalog, fleet health statuses, and real-time SLA compliance countdown timers.
- **Frontier AI Copilot (Google Gemini)**: Autonomous diagnosis engine that instantly parses error stack traces, infers likely root causes, estimates SLA priorities, and generates numbered step-by-step Standard Operating Procedure (SOP) remediation checklists.
- **Workforce & Shift Operations Management**: Strict enterprise shift tracking (9:00 AM shift punch with 30-min grace buffer, 5:30 PM punch out, 8h 30m workday calculation, 1-hour shift cooling period, mandatory re-entry remarks modal, and 30-day rolling data retention).

---

## 🏗️ Monorepo High-Level Topology & Architecture

WorkMate AI is structured as a TypeScript monorepo with clean separation of concerns, managed via `pnpm` workspaces:

```text
                            WORKMATE AI MONOREPO
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
    [apps/api]                                              [apps/web]
Backend REST API Server                               Enterprise Web Management Portal
(Node.js / Express + Prisma ORM)                     (Next.js 15 App Router + React 19)
Port: 4000                                           Port: 3000
```

### Monorepo Technology Stack:
- **Backend API (`apps/api`)**: Node.js, Express, TypeScript, Prisma ORM, Neon Serverless PostgreSQL, bcryptjs, Zod validation, ExcelJS.
- **Web Application (`apps/web`)**: Next.js 15 App Router, React 19, Vanilla CSS Glassmorphism Design System, ExcelJS.
- **Database & Cloud Infrastructure**: Neon Serverless PostgreSQL (pooled & direct connections), Prisma Client.
- **AI Engine**: Google Gemini 1.5 Flash (`@google/genai`) + Autonomous Deterministic Heuristic Fallback Engine.
- **Package Management**: `pnpm` Monorepo Workspaces (`pnpm-workspace.yaml`).

### System Communication Flow:
1. **Web Dashboard to Backend API**: The Next.js frontend communicates with the Express backend over HTTP REST at `http://localhost:4000/api` (or environment-configured `NEXT_PUBLIC_API_URL`).
2. **Backend API to Neon Postgres**: The backend connects to Neon Serverless Postgres via pooled connection strings (`DATABASE_URL`) with direct unpooled fallbacks (`DATABASE_URL_UNPOOLED`) for schema migrations and index synchronization.
3. **AI Copilot Invocation**: The backend dispatches prompt payloads to Google Gemini 1.5 Flash API when configured with `GEMINI_API_KEY`, automatically falling back to the built-in deterministic heuristic rule engine when offline or unconfigured.

---

## 🗄️ PART 1: The Database Layer (`apps/api/prisma`)

The database layer serves as the single source of truth for the entire platform. It is modeled in `apps/api/prisma/schema.prisma` and hosted on **Neon Serverless PostgreSQL**.

### 1. Enums Overview

| Enum | Allowed Values | Operational Purpose |
|---|---|---|
| `Role` | `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `ENGINEER`, `USER` | 5-tier role-based access control governance hierarchy. |
| `IssueStatus` | `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` | 5-stage incident ticket lifecycle states. |
| `IssuePriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | Severity categorization determining resolution SLA targets. |
| `IssueCategory` | `HARDWARE`, `SOFTWARE`, `NETWORK`, `FACILITY`, `SAFETY`, `OTHER` | Domain classification for engineering squad routing. |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `DONE` | Checkbox state for sub-tasks and field work orders. |

---

### 2. Relational Models Deep Dive

#### 📄 Model 1: `model User`
Represents employees, software engineers, operations managers, and system administrators.
- `id` (`String`, `@id`, `@default(cuid())`): Unique CUID identifier.
- `name` (`String`): Full name of the team member.
- `email` (`String`, `@unique`): Corporate email address (indexed for sub-millisecond lookup).
- `password` (`String?`): Salted and hashed password using `bcryptjs` (10 rounds).
- `role` (`Role`, `@default(USER)`): Access permission level.
- `department` (`String?`): Assigned engineering squad (e.g. *Backend & Cloud APIs*, *DevOps SRE*).
- `avatar` (`String?`): Profile avatar image URL.
- `shiftStatus` (`String?`, `@default("OFF_DUTY")`): Active work duty status (`ON_DUTY`, `OFF_DUTY`, `RE_ENTRY`).
- `lastLoginAt` (`DateTime?`): Timestamp of latest system login.
- `lastLogoutAt` (`DateTime?`): Timestamp of shift logout (used for 1-hour cooling period calculation).
- `lastPunchIn` (`DateTime?`): Timestamp of morning shift punch.
- `lastPunchOut` (`DateTime?`): Timestamp of evening shift punch out.
- **Relational Links**: `tasks`, `reportedIssues`, `assignedIssues`, `comments`, `attendanceLogs`.

#### 📄 Model 2: `model ServiceAsset`
Represents monitored microservices, cloud applications, clusters, and infrastructure in the enterprise catalog.
- `id` (`String`, `@id`): Unique CUID identifier.
- `name` (`String`): Descriptive service name (e.g. *Billing & Payment Gateway*, *Auth Gateway*).
- `slug` (`String`, `@unique`): URL-friendly unique identifier slug.
- `type` (`String`): `WEB_APP`, `MOBILE_APP`, `API_SERVICE`, `HARDWARE`, `FACILITY`.
- `department` (`String`): Owning engineering department.
- `environment` (`String`, `@default("PRODUCTION")`): `PRODUCTION`, `STAGING`, `ON_PREMISE`.
- `healthStatus` (`String`, `@default("OPERATIONAL")`): `OPERATIONAL`, `DEGRADED`, `OUTAGE`.
- `slaTargetMins` (`Int`, `@default(60)`): Contractual resolution SLA target in minutes.
- `urlOrLocation` (`String?`): Service endpoint URL or physical facility rack location.
- **Relational Links**: `issues` (all incident tickets linked to this service).

#### 📄 Model 3: `model Issue`
The core incident ticket tracked throughout the triage, investigation, and resolution lifecycle.
- `id` (`String`, `@id`): Unique CUID identifier.
- `ticketNumber` (`Int`, `@default(autoincrement())`): Human-readable ticket ID (`#TIK-001`, `#TIK-002`).
- `title` & `description` (`String`): Incident title and technical error stack trace.
- `status` (`IssueStatus`, `@default(OPEN)`): Lifecycle status.
- `priority` (`IssuePriority`, `@default(MEDIUM)`): Incident severity.
- `category` (`IssueCategory`, `@default(OTHER)`): Domain category.
- `department` (`String?`): Assigned department queue.
- `source` (`String`, `@default("WEB_PORTAL")`): Originating client channel.
- `affectedUrl` (`String?`): Exact URL or service endpoint where failure occurred.
- `resolutionNotes` (`String?`): Engineering notes explaining root cause fix.
- **Autonomous AI Fields**:
  - `aiSummary` (`String?`): AI-generated concise incident summary.
  - `aiSuggestedAction` (`String?`): Step-by-step SOP remediation checklist.
  - `aiRootCause` (`String?`): Identified technical failure reason.
  - `aiConfidence` (`Float?`): Confidence rating between 0.00 and 1.00 (e.g. 0.94 = 94%).
- **SLA & Compliance Fields**:
  - `slaDeadline` (`DateTime?`): Computed deadline based on service asset SLA minutes.
  - `slaBreached` (`Boolean`, `@default(false)`): Boolean flag marking SLA violation.
  - `resolvedAt` (`DateTime?`): Timestamp when incident status changed to `RESOLVED`.
  - `closedAt` (`DateTime?`): Timestamp when incident was finalized.
- **Relational Links**: `serviceAsset`, `reporter`, `assignee`, `tasks`, `comments`.

#### 📄 Model 4: `model ClosedTicket`
Dedicated historical audit table storing finalized, archived tickets.
- `ticketNumber` (`Int`, `@unique`): Retained original ticket number.
- `title`, `description`, `category`, `priority`, `department`: Preserved ticket details.
- `resolutionNotes`: Permanent record of resolution steps taken.
- `aiRootCause`: Permanent record of AI diagnostic findings.
- `turnaroundDuration` (`String?`): Formatted turnaround duration (e.g. `2h 15m`).
- `turnaroundHours` (`Float?`): Pure decimal turnaround hours for Excel formulas.
- `closedAt` (`DateTime`, `@default(now())`): Archival timestamp.

#### 📄 Model 5: `model AttendanceLog`
Stores granular employee shift attendance records for enterprise compliance and payroll calculation.
- `userId` (`String?`): Linked User ID.
- `userName` & `userEmail` (`String`): Snapshot of employee identity.
- `role` & `department` (`String`): Organizational placement.
- `action` (`String`): `PUNCH_IN`, `PUNCH_OUT`, `LOGIN`, `LOGOUT`.
- `status` (`String`): `ON_TIME`, `LATE`, `COMPLETED`, `HALF_DAY`, `EARLY_LOGOUT`, `RE_ENTRY`.
- `shiftDate` (`String?`): Standardized `YYYY-MM-DD` date string for sub-millisecond date queries.
- `punchIn` (`DateTime?`): Morning punch timestamp.
- `punchOut` (`DateTime?`): Evening punch timestamp.
- `workHours` (`Float?`): Pure decimal hours worked (e.g. `8.50`).
- `remarks` (`String?`): Shift notes, grace buffer confirmation, or re-entry reason.
- `ipAddress` & `userAgent` (`String?`): Audit trail compliance metadata.
- `timestamp` (`DateTime`, `@default(now())`): Record creation timestamp.

#### 📄 Model 6: `model Task`
Granular work orders and remediation checklist items.
- `id` (`String`, `@id`): Unique CUID identifier.
- `title` & `description` (`String`): Task directive.
- `status` (`TaskStatus`, `@default(TODO)`): Checkbox state.
- `priority` (`Int`, `@default(2)`): Numeric priority level.
- `category` (`String?`): Task classification.
- `dueDate` (`DateTime?`): Target completion deadline.
- `ownerId` (`String`): Assigned engineer.
- `issueId` (`String?`): Optional parent incident ticket link.

#### 📄 Model 7: `model Comment`
Real-time discussion log on incident tickets.
- `id` (`String`, `@id`): Unique CUID identifier.
- `content` (`String`): Message or note body.
- `isAiGenerated` (`Boolean`, `@default(false)`): Distinguishes automated AI triage notes from engineer comments.
- `issueId` (`String`): Target ticket.
- `authorId` (`String`): Authoring user.

---

## ⚙️ PART 2: The Backend Server (`apps/api/src`)

### 1. Server Entry Point & Middleware Pipeline

#### `apps/api/src/server.ts`
- Imports initialized Express application from `app.ts`.
- Reads `PORT` from environment (defaults to `4000`).
- Listens on `0.0.0.0` ensuring local and LAN requests are processed.

#### `apps/api/src/app.ts`
- **CORS Configuration**: Configures open cross-origin resource sharing to support web clients and external integrations.
- **Body Parsing**: Parses incoming JSON request payloads (`express.json()`).
- **Sub-Router Mounting**:
  - `/api/users` ➔ `user.routes.ts`
  - `/api/attendance` ➔ `attendance.routes.ts`
  - `/api/issues` ➔ `issue.routes.ts`
  - `/api/closed-tickets` ➔ `closed-ticket.routes.ts`
  - `/api/services` ➔ `service.routes.ts`
  - `/api/tasks` ➔ `task.routes.ts`
  - `/api/stats` ➔ `stats.routes.ts`
  - `/api/ai` ➔ `ai.routes.ts`
- **Global Error Handling**: Catches unhandled errors and returns structured JSON responses `{ error: string }`.

---

### 2. Complete Backend Routes Matrix

#### 🛣️ Route 1: `apps/api/src/routes/user.routes.ts` (Authentication & Credentials)
- **`POST /api/users/login`**:
  - Validates `{ email, password }`.
  - Normalizes email to lowercase and executes sub-millisecond `prisma.user.findUnique({ where: { email } })`.
  - **1-Hour Shift Cooling Period Guard**: If user logged out of their shift within the last 60 minutes, returns HTTP `403 Forbidden` with the exact remaining cooldown countdown minutes.
  - Verifies password with `bcrypt.compareSync()`.
  - Fires an asynchronous unawaited touch on `lastLoginAt` (non-blocking for 0ms perceived response).
  - Returns authenticated user object without password hash.
- **`POST /api/users/forgot-password` (Self-Service Zero-OTP Password Reset)**:
  - Validates `{ email, newPassword }`.
  - Ensures password is at least 6 characters.
  - Looks up user in Neon Postgres; returns 404 if not found.
  - Hashes new password with `bcrypt.hash(newPassword, 10)`.
  - Updates database and immediately returns updated user object so the client signs in automatically without redundant login prompts.
- **`POST /api/users`**: Creates new team member with hashed password (defaults to `WorkMate@123` if omitted).
- **`GET /api/users`**: Lists all active team members.
- **`GET /api/users/export`**: Exports user credentials directory to CSV (SuperAdmin only).
- **`GET /api/users/export-excel`**: Streams formatted `.xlsx` workbook of user credentials with Royal Purple styled headers.
- **`GET /api/users/export-json`**: Returns user credentials JSON for client-side Excel rendering.
- **`POST /api/users/reset-cooldown`**: SuperAdmin endpoint to clear a user's shift cooldown lock for emergency platform access.
- **`PATCH /api/users/:id`**: Self-service profile updates (name, email, department, avatar).
- **`PATCH /api/users/:id/role`**: Dynamic role permission modifier.
- **`DELETE /api/users/:id`**: Permanently removes user account from database (SuperAdmin only).

#### 🛣️ Route 2: `apps/api/src/routes/attendance.routes.ts` (Shift Attendance & Cooling Lifecycle)
- **`POST /api/attendance/punch-in`**:
  - Handles daily shift arrival.
  - **Single Daily Punch Guard**: Verifies employee has not already punched in today.
  - **30-Minute Grace Buffer**:
    - Arrival ≤ 9:30 AM ➔ Status `ON_TIME`, Remarks: *"Shift 9:00 AM - 5:30 PM (On Time Buffer)"*.
    - Arrival > 9:30 AM ➔ Status `LATE`, records late arrival minutes.
  - **Re-Entry Punch Handling**: If user already completed today's shift and logged back in after the 1-hour cooling period, requires mandatory remarks (e.g. *Overtime Duty*, *Incident Triage*) and records status as `RE_ENTRY`.
  - Updates `User.shiftStatus` to `ON_DUTY` and creates `AttendanceLog` record.
- **`POST /api/attendance/punch-out`**:
  - Handles daily shift departure (standard shift ends at 5:30 PM).
  - Calculates exact duration between morning `punchIn` and `punchOut`.
  - Computes pure decimal work hours (`workHours`) for direct spreadsheet calculation.
  - Categorizes shift status:
    - `COMPLETED`: Work duration ≥ 8 hours 30 minutes.
    - `HALF_DAY`: Work duration ≥ 4 hours 15 minutes.
    - `EARLY_LOGOUT`: Left prior to minimum threshold.
  - Updates `User.shiftStatus` to `OFF_DUTY`, sets `User.lastLogoutAt` to current timestamp, and initiates the 1-hour shift cooling window.
- **`GET /api/attendance`**: Retrieves attendance records with date-wise filtering (`shiftDate`) and role scoping (SuperAdmin views all; employees view personal logs).
- **`GET /api/attendance/export`**: Generates CSV report with calculation columns (`Total Time`, `Total Hours (Decimal)`).
- **`GET /api/attendance/export-excel`**: Streams styled Microsoft Excel (`.xlsx`) workbook with Deep Emerald header formatting.
- **`POST /api/attendance/scrap-old`**: Background retention routine to prune attendance records older than 30 days.

#### 🛣️ Route 3: `apps/api/src/routes/issue.routes.ts` (Incident Lifecycle)
- **`GET /api/issues`**: Fetches all open, assigned, in-progress, and resolved incident tickets with relational data.
- **`POST /api/issues`**:
  - Validates ticket title, description, category, priority, and service asset.
  - Computes `slaDeadline` using target service SLA target minutes.
  - If `runAiTriage: true`, invokes Google Gemini AI triage service to extract root cause, severity, and remediation SOP.
  - Persists record to database and assigns auto-incrementing `ticketNumber`.
- **`PATCH /api/issues/:id`**:
  - Transitions ticket state (`OPEN` ➔ `IN_PROGRESS` ➔ `RESOLVED` ➔ `CLOSED`).
  - Evaluates if SLA was met or breached by comparing `resolvedAt` against `slaDeadline`.
  - When status changes to `CLOSED`, triggers auto-archival into `ClosedTicket` table.
- **`POST /api/issues/:id/comments`**: Adds user or AI-generated remediation comments to the ticket audit trail.

#### 🛣️ Route 4: `apps/api/src/routes/closed-ticket.routes.ts` (Archived Incident History)
- **`GET /api/closed-tickets`**: Queries permanent `ClosedTicket` table with resolution notes and turnaround durations.
- **`GET /api/closed-tickets/export`**: Direct server-side CSV export of closed incidents.
- **`POST /api/closed-tickets/archive/:issueId`**: Archives an existing ticket into permanent history and removes it from active queues.

#### 🛣️ Route 5: `apps/api/src/routes/service.routes.ts` (Microservice Catalog)
- **`GET /api/services`**: Returns catalog of monitored applications, environments, health statuses, and SLA targets.
- **`POST /api/services`**, **`PATCH /api/services/:id`**, **`DELETE /api/services/:id`**: SuperAdmin management of monitored infrastructure.

#### 🛣️ Route 6: `apps/api/src/routes/ai.routes.ts` & `ai.service.ts` (Autonomous Copilot)
- **`POST /api/ai/triage`**: Parses raw error logs and stack traces; calls Gemini 1.5 Flash to diagnose root causes and recommend SOP procedures.
- **`GET /api/ai/shift-briefing`**: Synthesizes all active open incidents across engineering squads into a managerial shift briefing.
- **Deterministic Heuristic Fallback Engine**: If Gemini API key is missing or network is unreachable, pattern-matches against 30+ industrial incident signatures (e.g. *504 Gateway Timeout*, *Connection Pool Deadlock*, *OOMKilled*, *SSL Expiration*).

#### 🛣️ Route 7: `apps/api/src/routes/task.routes.ts` (Field Tasks)
- CRUD operations for work order checklist items linked to parent incidents.

#### 🛣️ Route 8: `apps/api/src/routes/stats.routes.ts` (Metrics)
- Computes platform-wide SLA compliance rates, open ticket counts, urgent alerts, and completed work orders.

---

### 3. Server-Side Excel Engine (`apps/api/src/utils/excelExport.ts`)
Built with `exceljs` to stream formatted `.xlsx` workbooks directly to HTTP clients:
- **Streaming Response**: Sets `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition`.
- **Palette Presets**: Supports `emerald` (`#065F46`), `navy` (`#1E3A8A`), `purple` (`#581C87`), `indigo` (`#312E81`), and `blue` (`#1E40AF`).
- **Styling Architecture**: Bold white text, centered header alignment, thin grid borders, frozen top row, auto column widths, and zebra-striped alternating rows.

---

## 💻 PART 3: The Web Portal (`apps/web/src/app`)

Built with **Next.js 15, React 19, and Vanilla CSS Glassmorphism** on port `3000`.

### 1. HTML Shell & Critical Styling

#### `apps/web/src/app/layout.tsx`
- Root HTML layout shell.
- Preconnects to Google Fonts (`Plus Jakarta Sans` for clean typography and `JetBrains Mono` for code/ticket IDs).
- **Inlined Critical Styling `<style id="workmate-critical-theme">`**: Inlines the design stylesheet directly into the `<head>` of the initial server HTML document. This prevents Flash of Unstyled Content (FOUC) under all network conditions.

#### `apps/web/src/app/globals.css`
- Design system tokens:
  - Deep dark canvas: `#090d16`.
  - Glassmorphic card surface: `rgba(15, 23, 42, 0.7)`.
  - Border subtle: `rgba(255, 255, 255, 0.08)`.
  - Accents: Indigo (`#6366f1`), Cyan (`#06b6d4`), Emerald (`#10b981`), Rose (`#f43f5e`), Purple (`#a855f7`).
- Implements responsive layouts, Jira Kanban column styling, modal dialogs, and interactive hover animations.

---

### 2. Client-Side Excel Engine (`apps/web/src/utils/excelExport.ts`)
A dedicated utility that constructs and downloads `.xlsx` workbooks in the browser:
- Uses `exceljs` in the browser environment.
- Generates binary buffer, converts to `Blob`, and triggers automatic file download via temporary anchor element.
- Formats cell styling, bold header fills, frozen panes, and status badge pill colors (`ON_TIME` in emerald, `LATE` in rose, `URGENT` in red, `RESOLVED` in teal, `DONE` in green).

---

### 3. The Interactive Dashboard (`apps/web/src/app/page.tsx`)
The single-page application contains 8 core operational tabs and interactive modals:

#### 📊 Tab 1: Command Dashboard (`activeTab === "command"`)
- **Metric Cards**: Active Incidents, Urgent Alerts, SLA Compliance Percentage (`88%`), and Field Task Velocity.
- **Executive Shift Briefing**: Live AI-generated summary of platform health and incident trends.
- **Department Workload Grid**: Visual distribution of open tickets across Backend, Frontend, DevOps, and QA squads.

#### 🎫 Tab 2: Jira Ticketing Tool (`activeTab === "tickets"`)
- **Kanban Board**: 5 interactive columns: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
- **Table View**: Compact data grid with text search, priority filters, and category tags.
- **Role Scoping Filter**: Quick toggles between *My Role Incidents*, *Assigned to Me*, *Reported by Me*, and *All Tickets*.
- **📊 Export Excel Button**: Generates styled `.xlsx` workbook with Navy Corporate theme (`#1E3A8A`) and status badges.

#### 🗄️ Tab 3: Closed Incident Archive (`activeTab === "closedTickets"`)
- Dedicated audit log table displaying finalized tickets from the `ClosedTicket` database archive.
- Displays Ticket Number, Title, Category, Priority, Resolver, Closed At, Turnaround Duration, Resolution Notes, and AI Root Cause diagnosis.
- **📊 Export Excel Button**: Generates styled `.xlsx` workbook with Deep Indigo Audit theme (`#312E81`).
- **🌐 Server CSV**: Direct database CSV download link.

#### ⏱️ Tab 4: Shift Attendance Terminal (`activeTab === "attendance"`)
- **Shift Terminal & Punch Widget**:
  - Live digital clock and duty status badge (`ON_DUTY`, `OFF_DUTY`, `RE_ENTRY`).
  - **Punch In Button**: 9:00 AM shift punch with 30-minute relaxation buffer up to 9:30 AM.
  - **Punch Out Button**: 5:30 PM shift punch out calculating total hours and starting the 1-hour cooling period.
- **1-Hour Cooling Period Countdown**: Shows real-time countdown if employee attempts re-entry during the cooling window.
- **Attendance Remarks Modal**: Mandatory modal requiring explanation (e.g. *Overtime Duty*) if punching back in after shift punch-out.
- **Attendance Audit Trail**:
  - SuperAdmin view: Company-wide audit log across all squads.
  - Employee view: Personal verified attendance log.
  - Quick date filters: **Today**, **Yesterday**, **All Dates**, or calendar date picker.
- **Excel & CSV Export Toolbar**:
  - `📊 Export Excel (.xlsx)`: Client-side styled `.xlsx` with Emerald theme (`#065F46`), punch in/out, shift duration, and decimal calculation hours (`8.50`).
  - `🌐 Server Excel (.xlsx)`: Direct streaming backend Excel export (`GET /api/attendance/export-excel`).
  - `📥 Export Report (CSV)`: Client CSV blob export.
  - `🌐 Server CSV`: Backend streaming CSV export.

#### 👥 Tab 5: Team Members & Roles (`activeTab === "users"`)
- Directory of all registered employees with role tags (`SUPER_ADMIN`, `MANAGER`, `ENGINEER`, `ADMIN`, `USER`).
- **Dynamic Role Selector**: SuperAdmin can modify user permissions on the fly via dropdown.
- **Switch to User Button**: SuperAdmin 1-click privilege to switch active session to any user.
- **⚡ 1-Click Instant Sign In**: Instant login activation.
- **SuperAdmin Credentials Export Toolbar**:
  - `📊 Export Excel (.xlsx)`: Styled `.xlsx` workbook with Royal Purple theme (`#581C87`) containing user IDs, names, emails, roles, departments, password hashes, and shift statuses.
  - `🌐 Server Excel (.xlsx)`: Backend streaming Excel endpoint (`GET /api/users/export-excel`).
  - `📥 Export Users & Passwords (CSV)`: Client CSV export.
  - `🌐 Server CSV (Passwords)`: Backend streaming CSV endpoint.

#### 📋 Tab 6: Field Tasks & Work Orders (`activeTab === "tasks"`)
- Action checklist view for engineers to track remediation tasks.
- Interactive status checkboxes (`TODO` ➔ `DONE`).
- Priority badges, category tags, assignee names, and direct links to parent `#TIK-xxx` incidents.
- **📊 Export Excel Button**: Generates styled `.xlsx` workbook with Blue & Amber Dispatch theme (`#1E40AF`).

#### 🌐 Tab 7: Applications & Websites (`activeTab === "services"`)
- Interactive service asset cards representing monitored microservices, APIs, web apps, and databases.
- Displays health status (`OPERATIONAL`, `DEGRADED`, `OUTAGE`), active incident count, environment badge, and SLA target time.
- SuperAdmin management to add new projects, edit SLA thresholds, or decommission services.

#### 🧪 Tab 8: AI Triage Sandbox (`activeTab === "sandbox"`)
- Interactive prompt laboratory to paste raw error logs, select affected microservices, and inspect Gemini's autonomous triage diagnostics in real time.

---

### 4. Interactive Modals Architecture

1. **Authentication Modal (`isAuthModalOpen`)**:
   - **Tab 1: Sign In**:
     - Email and password inputs with show/hide password toggle (`👁️` / `🙈`).
     - **"Forgot Password?" Link**: Switches directly to the reset tab.
     - **"⚡ Instant Sign In by User ID" Grid**: Interactive cards displaying all team members for 1-click instant access.
     - **"👤 Suggested Login ID" Section**: Device-remembered accounts stored in `localStorage` for quick sign-in without leaking other accounts.
   - **Tab 2: 🔑 Reset Password (Basic Self-Service Forgot Password)**:
     - Registered work email input.
     - New password and confirm password inputs (min. 6 characters) with visibility toggles.
     - On submission: validates in PostgreSQL, hashes via bcrypt, updates DB, and signs user in immediately.
   - **Tab 3: 🔁 Switch Account (SuperAdmin Only)**:
     - Quick administrative account switcher.
2. **Incident Detail Modal (`selectedIssue`)**: Full incident overview, AI root cause diagnosis, SLA countdown timer, lifecycle buttons (`In Progress`, `Resolve`, `Close`), and live comment audit thread.
3. **Log New Ticket Modal (`isNewTicketOpen`)**: Service asset selector, title, description, and AI triage toggle.
4. **Attendance Remarks Modal (`showRemarksModal`)**: Enforced popup modal requiring a written reason when an employee attempts to punch back in after completing their daily shift.
5. **Action Confirmation Modal (`actionModal`)**: Custom glassmorphic confirmation modal replacing native browser alert/confirm dialogues.

---

## 🔄 PART 4: End-to-End Operational Lifecycle Workflows

### Workflow 1: Instant 0ms Sign-In & Login Acceleration
```text
[User Clicks "⚡ Sign In" / User ID Card]
       │
       ├──► ⚡ Step 1: Instant Client Optimistic Activation (0ms)
       │         • Modal dismisses immediately
       │         • User session activates instantly with matched profile
       │         • Dashboard renders active workspace with 0 loading delay
       │
       └──► 🚀 Step 2: High-Speed Background Verification & DB Touch
                 • Backend Neon Postgres uses direct indexed lookup (findUnique)
                 • Async unawaited lastLoginAt touch (no remote DB wait)
                 • Shift cooldown validation (1-hour cooling check)
                 • Graceful rollback & security alert if invalid or cooldown active
```

---

### Workflow 2: Self-Service "Forgot Password" Flow (Zero OTP / Zero Email Setup)
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

---

### Workflow 3: Shift Attendance, 1-Hour Cooling Period & Re-Entry Remarks
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
[Cooldown Expires / New Cycle]
       │
       ▼
[Re-Entry Punch In Attempt] ──► ⚠️ Prompts Mandatory "Attendance Remarks Modal"
                                   (e.g., "Overtime Duty", "Emergency Incident Triage")
                                   Records Status: RE_ENTRY | Updates Audit Trail
```

---

### Workflow 4: Incident Triage, Resolution & Archival
```text
[1. Incident Reported / Monitoring Alert Triggered]
         │
         ▼
[2. POST /api/issues with runAiTriage: true]
         │
         ├──► Computes SLA Deadline based on Service Asset Target Mins
         │
         └──► Calls Google Gemini 1.5 Flash (or Deterministic Fallback Engine)
              Extracts: aiRootCause, aiSuggestedAction SOP, aiConfidence
         │
         ▼
[3. Issue Saved to Neon Postgres & Appears in Web Kanban ("OPEN")]
         │
         ▼
[4. Engineer Claims Incident ("IN_PROGRESS")]
         │  Reviews AI root cause diagnosis and executes SOP steps
         ▼
[5. Engineer Submits Fix & Clicks "Resolve"]
         │  SLA timer stops; database records resolvedAt timestamp
         ▼
[6. Manager Reviews & Clicks "Close"]
         │
         ▼
[7. Automated Archival to ClosedTicket Table]
         │  Calculates turnaround duration and turnaround hours
         │  Preserves resolution notes and AI root cause permanently
         │  Available in Closed Tickets Archive tab and styled Excel exports
```

---

## 📊 PART 5: Multi-Tab Formatted Colorful Excel Workbooks Matrix

WorkMate AI provides native `.xlsx` workbooks generated with `exceljs` across every operational tab, featuring bold white titles, frozen top rows, grid borders, zebra-striped rows, and status badges:

| Tab | Excel Palette / Theme | Dominant Header Fill | Styled Columns & Status Pill Badging |
|---|---|---|---|
| **Active Tickets** | Navy Corporate | Deep Navy `#1E3A8A` | Ticket ID, Title, Status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), Priority, Category, Department, Assignee, Linked Asset |
| **Closed Tickets Archive** | Indigo Audit | Deep Indigo `#312E81` | Ticket ID, Issue Title, Turnaround Duration, Resolution Notes, AI Root Cause Diagnosis, Resolver, Closed At |
| **Attendance Records** | Emerald Workplace | Deep Emerald `#065F46` | Punch In Time, Punch Out Time, Shift Duration (`8h 30m`), Decimal Hours (`8.50` calculation-ready), Shift Remarks |
| **Team Credentials** | Purple Security | Royal Purple `#581C87` | User ID, Name, Email, Role, Department, Password/Hash, Duty Shift Status (`ON_DUTY`, `OFF_DUTY`, `RE_ENTRY`) |
| **Field Tasks** | Blue & Amber Dispatch | Deep Blue `#1E40AF` | Task ID, Task Title, Priority, Category, Owner/Assignee, Linked Ticket (`#TIK-001`), Due Date, Status (`TODO`, `DONE`) |

---

## 📋 PART 6: Master Code Reference & File Registry Matrix

| File Path | Technology | Primary Functionality & Responsibilities |
| :--- | :--- | :--- |
| `apps/api/prisma/schema.prisma` | Prisma / PostgreSQL | Relational models for `User`, `ServiceAsset`, `Issue`, `ClosedTicket`, `AttendanceLog`, `Task`, `Comment`. |
| `apps/api/src/server.ts` | Node.js / Express | Server entry point; initializes HTTP listener on port `4000` binding to `0.0.0.0`. |
| `apps/api/src/app.ts` | Express.js | Express application pipeline, CORS configuration, JSON body parser, and route registrations. |
| `apps/api/src/routes/user.routes.ts` | Express / bcryptjs | Instant login, zero-OTP forgot password, user CRUD, 1-hour cooldown guard, credential export. |
| `apps/api/src/routes/attendance.routes.ts` | Express / Prisma | 9:00 AM punch-in with 30-min buffer, 5:30 PM punch-out, re-entry remarks, 30-day data pruning. |
| `apps/api/src/routes/issue.routes.ts` | Express / Zod | Incident creation, SLA deadline calculation, status transitions, comments, and AI triage invocation. |
| `apps/api/src/routes/closed-ticket.routes.ts` | Express / Prisma | Closed ticket query endpoints, CSV exports, and automated archival routines. |
| `apps/api/src/routes/service.routes.ts` | Express | Monitored microservice catalog CRUD and environment health management. |
| `apps/api/src/routes/task.routes.ts` | Express | Field task work order dispatching and status toggling. |
| `apps/api/src/routes/stats.routes.ts` | Express | Platform KPI metrics and real-time SLA compliance percentage calculations. |
| `apps/api/src/routes/ai.routes.ts` | Express | Endpoints for automated incident triage and executive shift briefing synthesis. |
| `apps/api/src/services/ai.service.ts` | Google Gemini API | Autonomous AI diagnosis engine with Gemini 1.5 Flash and deterministic heuristic fallback. |
| `apps/api/src/utils/excelExport.ts` | ExcelJS | Server-side streaming `.xlsx` workbook generator with color themes and cell styling. |
| `apps/web/src/app/layout.tsx` | Next.js 15 | Root document shell; inlines critical CSS to prevent unstyled flash across all network conditions. |
| `apps/web/src/app/globals.css` | Vanilla CSS | Dark glassmorphic design system tokens, Jira Kanban styling, and responsive grid layouts. |
| `apps/web/src/utils/excelExport.ts` | ExcelJS | Client-side styled `.xlsx` generator with color palettes, borders, frozen panes, and status pill cells. |
| `apps/web/src/app/page.tsx` | React 19 / Next.js | Unified 8-tab enterprise dashboard, state management, instant sign-in, and interactive modals. |
| `scripts/convert_md_to_docx.cjs` | Node.js / docx | Automated documentation compiler converting markdown manuals into styled Microsoft Word `.docx` files. |
| `start-workmate.bat` | Windows Batch | 1-click batch launcher starting both Backend API and Next.js Web server simultaneously. |
| `README.md` | Markdown | Master project overview, features, setup guides, and live cloud URLs. |

---

## 💻 PART 7: Local Setup & Operations Reference

### Prerequisites
- **Node.js**: `v18.0.0` or higher ([nodejs.org](https://nodejs.org))
- **pnpm**: `npm install -g pnpm`

### Execution Commands
1. **Install Dependencies**: `pnpm install`
2. **Launch Application (1-Click Batch File)**: Double-click `start-workmate.bat`
3. **Launch Application (Terminal)**: `pnpm dev`
4. **Independent Terminals**:
   - Backend API: `pnpm dev:api` (Port `4000`)
   - Web Portal: `pnpm dev:web` (Port `3000`)
5. **Compile Word Documentation**: `node scripts/convert_md_to_docx.cjs`

### Verified Pre-Seeded Accounts
- **Sarah Chen** (Super Admin): `admin@workmate.internal` / `WorkMate@123`
- **Marcus Vance** (Operations Manager): `marcus@workmate.internal` / `WorkMate@123`
- **Alex Rivera** (Software Engineer): `alex@workmate.internal` / `WorkMate@123`
- **Priya Sharma** (Systems Specialist): `priya@workmate.internal` / `WorkMate@123`
