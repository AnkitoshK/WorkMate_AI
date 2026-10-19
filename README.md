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
WorkMate AI enforces granular, zero-leakage role governance across 6 enterprise tiers:

| Role | Badge | Permissions & Operational Scope |
|---|---|---|
| **SuperAdmin** | 👑 `SUPER_ADMIN` | Full platform supremacy: create/delete users, provision services, switch accounts, view & export user passwords/credentials, company-wide attendance. |
| **Engineering Manager** | 👔 `MANAGER` | Tech lead oversight, work order dispatching, triage approvals, ticket re-assignment, squad workload rebalancing. |
| **Software Engineer** | 🛠️ `ENGINEER` | Claim on-call incidents, run AI triage diagnostics, attach PR links, resolve tickets, submit personal shift attendance. |
| **Platform Admin** | 🛡️ `ADMIN` | Configure SLA thresholds, monitor service health, manage routing queues, bypass shift cooldowns. |
| **Developer / Reporter** | 👤 `USER` | Submit incident bug reports, track resolution status, post comments, follow incident progress. |
| **Viewer / Read-Only** | 👁️ `VIEWER` | Strict read-only observer: view assigned squad/project tickets only. Cannot edit tickets, change status, post comments, punch attendance, create tasks, or export reports. |

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
- **Existing Rules Preserved**: Resetting password does not bypass shift attendance records, the 1-hour cooling period, or role-based security boundaries.
- **Immediate Access**: Once the password is updated, the user is immediately logged in to their account, avoiding redundant login prompts.

---

### 10. Multi-Client & Multi-Project Hierarchy: 3-Tier Mapping (Department ➔ Project ➔ Service Layer) & Client Tenant Data Isolation
WorkMate AI provides an enterprise-grade multi-client and multi-project architecture designed specifically for organizations managing multiple concurrent client contracts and distinct software projects.

#### The Core Scenario: Two Clients, Two Independent Projects
Suppose your organization manages two different clients with separate software systems:
- **Client 1 (e.g. Acme Corp)** ➔ Project: **`Enterprise Customer Web Portal`**
- **Client 2 (e.g. Softech Solutions)** ➔ Project: **`Client B Customer CRM Portal`**

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               ENTERPRISE 3-TIER HIERARCHY & MULTI-TENANT ISOLATION ARCHITECTURE         │
└────────────────────────────────────────────────────────────────────────────────────────┘

    🏢 LEVEL 1: DEPARTMENT (Responsible Operational Unit)
       │  e.g., IT & Applications, Software & Cloud Ops, Human Resources (HR)
       │
       ▼
    🚀 LEVEL 2: CLIENT PROJECT & APPLICATION (Service Catalog Asset)
       │  • Client 1: "Enterprise Customer Web Portal"  (SLA: 30m | Monitor: Client 1 Lead)
       │  • Client 2: "Client B Customer CRM Portal"    (SLA: 15m | Monitor: Client 2 Lead)
       │
       ▼
    ⚙️ LEVEL 3: AFFECTED SERVICE LAYER / ARCHITECTURE COMPONENT
          • Frontend (User 1 - Frontend Lead)
          • Backend (User 2 - Backend Lead)
          • Database / Storage (Database Specialist)
          • Cloud Infra / Deployment / Admin Portal

       ┌─────────────────────────────────────────────────────────────────┐
       │                 TENANT DATA ISOLATION ENGINE                     │
       ├─────────────────────────────────┬───────────────────────────────┤
       │       Client 1 (Acme Corp)      │    Client 2 (Softech Sol)     │
       ├─────────────────────────────────┼───────────────────────────────┤
       │ • Sees ONLY Project 1 Tickets   │ • Sees ONLY Project 2 Tickets │
       │ • ❌ Project 2 completely hidden │ • ❌ Project 1 completely hidden│
       │ • Real-time SLA countdown (30m) │ • Real-time SLA countdown (15m)│
       │ • Live AI Triage & status notes │ • Live AI Triage & status notes│
       │ • Read-Only Viewer (Safe-Mode)  │ • Read-Only Viewer (Safe-Mode) │
       └─────────────────────────────────┴───────────────────────────────┘
```

#### 1. 3-Tier Explicit Mapping During Ticket Creation
Whenever an engineer, manager, or client logs an incident ticket, WorkMate AI enforces an explicit 3-tier architectural mapping so there is zero ambiguity about who owns the issue and who can view it:

1. **Tier 1: Department (`department`)**:
   - Identifies the organizational unit responsible for SLA delivery (e.g., *IT & Applications*, *DevOps & Cloud SRE*, *Customer Operations*).
   - Automatically synchronizes when selecting a registered project from the Service Catalog.
2. **Tier 2: Client Project (`serviceAssetId`)**:
   - Directly links the ticket to the registered client project in the **Application & Project Service Catalog** (e.g., *Enterprise Customer Web Portal*).
   - Automatically binds the project's target SLA (e.g. 30m), environment, and designated **Project Monitor (`monitorUserId`)**.
3. **Tier 3: Affected Service Layer (`component`)**:
   - Identifies the technical layer impacted: `FRONTEND`, `BACKEND`, `FULLSTACK`, `DATABASE`, `DYNAMIC_WEB`, `STATIC_WEB`, `ADMIN_PORTAL`, `CLOUD_INFRA`, `CI_CD_DEPLOY`.
   - **Auto-routes specialist engineers**:
     - `Frontend` / `Static Web` / `Dynamic Web` ➔ Auto-assigned to **User 1 (Frontend Lead)**.
     - `Backend` / `Database` / `API` ➔ Auto-assigned to **User 2 (Backend Lead)**.
4. **Live Confirmation Box**:
   - Before submission, the ticket modal renders a glowing **3-Tier Hierarchy & Tenant Data Isolation Live Confirmation Card** confirming the exact Department, Client Project, Service Layer, and Scoped Visibility.

---

#### 2. How Clients Understand What is Happening & Which Tickets They See
In multi-client environments, clients must have full transparency into their own issues without ever seeing another client's proprietary data:

1. **Client Tenant Data Isolation (Zero Cross-Client Leakage)**:
   - Each client user is assigned the **`👁️ VIEWER`** role and designated as the **Project Monitor (`monitorUserId`)** for their specific project or ticket.
   - **Cross-Client Exclusion Barrier**:
     - When **Client 1** logs in, any ticket with `iss.monitorUserId === Client_2` is strictly and unconditionally excluded (`matchesRoleScope = false`).
     - Generic department matches (e.g., both clients having tickets categorized under "IT & Applications") are prevented from leaking across client boundaries.
     - The board strictly renders only tickets where `iss.monitorUserId === activeUser.id || iss.serviceAsset?.monitorUserId === activeUser.id || iss.reporterId === activeUser.id`.
     - Cross-client visibility is mathematically 0%: Client 1 cannot view Client 2's tickets, and Client 2 cannot view Client 1's tickets.
   - The top banner explicitly displays:
     `🔒 Client Scoped Portal: Viewing tickets for your designated client project only (Zero Cross-Client Visibility)`
2. **How Clients Track Remediation in Real Time**:
   - **Real-Time Lifecycle State**: Clients view tickets transition through `OPEN` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED` in real time.
   - **SLA Breach Countdown Clock**: Displays whether the incident is within target SLA (e.g., 30m SLA) or breached.
   - **AI-Powered Diagnostics**: Clients see AI root-cause analysis and automated triage summaries explaining the incident's remediation path.
   - **Technical Collaboration Stream**: Clients follow technical progress updates and patch notes posted by engineers while in safe read-only viewing mode.

---

#### 3. Dedicated Project-Scoped Filtering & Navigation Tools
WorkMate AI includes four high-productivity features for filtering and isolating project tickets:

1. **1-Click "👁️ View Tickets" from Service Catalog**:
   - Every project card in the **Application & Project Service Catalog** includes an **`👁️ View Tickets (X)`** button.
   - Clicking it navigates directly to the Incident Queue with the view locked to that project.
2. **Dedicated "🌐 Project / Service Filter" Dropdown**:
   - Located in the tickets filter bar beside *Department*, *Status*, and *Priority*.
   - Allows instant switching between *All Projects* and any registered client application.
3. **Dedicated "⭐ My Project Tickets" Quick Pill**:
   - Mapped client monitors and project leads receive a prominent **`⭐ My Project Tickets`** button in the view scope bar.
   - One click restricts the board exclusively to their assigned client projects.
4. **Clickable Project Badges**:
   - Clicking the project badge on any Kanban ticket card or Table row instantly filters the entire board to that project.

---

#### 4. Read-Only Viewer Safe-Mode & Monitoring Collaboration Rights
- **Ticket Lifecycle**: In the ticket detail modal, the status dropdown is disabled (`disabled={true}`) with a visual `👁️ Read-Only Viewer` tag. Action buttons (*Mark Resolved*, *Close & Archive*, *Start Progress*) are protected from structural mutation by viewers.
- **Monitoring Comment & Media Rights**: Unlike basic status changes, viewers assigned to monitor tickets or reviewing project health **are explicitly granted rights to post comments, technical observations, and attach media/screenshots** in the discussion thread. Comments posted by viewers feature a distinct `👁️ Viewer / Monitor` identity pill.
- **Shift Attendance**: The Punch Terminal replaces punch-in and punch-out buttons with a protective banner: *"Viewer Account (Read-Only): Attendance logging and shift punches are disabled for your profile."*
- **Report Downloads**: Direct operational admin data download is restricted from standard viewer roles.
- **Task Checkboxes**: Task status toggle checkboxes are disabled (`disabled={true}`) and the task creation card informs the viewer that task management is restricted to assigned engineers and managers.
- **Backend API Security Layer (Defense-in-Depth)**:
  - Unauthorized mutation attempts are intercepted by the Express backend:
    - `POST /api/attendance/punch` ➔ `403 Forbidden` (`Viewer accounts have read-only permissions and are not authorized to mark attendance punches`)
    - `GET /api/attendance/export` & `/export-excel` ➔ `403 Forbidden` (`Viewer accounts do not have permission to download attendance reports`)
    - `GET /api/closed-tickets/export` ➔ `403 Forbidden` (`Viewer accounts do not have permission to download closed ticket reports`)
    - `PATCH /api/issues/:id`, `DELETE /api/issues/:id` ➔ `403 Forbidden` (`Viewer accounts cannot mutate ticket status or delete tickets`)
    - `POST /api/issues/:id/comments` ➔ ✅ `201 Created` (`Authorized for all authenticated roles including Viewer/Monitors`)
    - `POST /api/issues` ➔ ✅ `201 Created` (`Authorized for all authenticated team roles to raise tickets`)

---

#### 5. Batch Multi-Project Provisioning Facility & Department Mapping
WorkMate AI provides a high-throughput **Batch Provisioning Facility** allowing SuperAdmins to onboard and configure multiple enterprise projects simultaneously across organizational departments:

1. **High-Throughput Batch API (`POST /api/services/batch`)**:
   - Accepts an array of project definitions with target department, system type, SLA targets, and team mappings.
   - Automatically computes collision-resistant slugs (e.g. `client-b-crm`, `client-b-crm-1`) to prevent unique key constraint violations.
   - Atomically provisions all project records in PostgreSQL via Prisma.

2. **Interactive Multi-Project Provisioning UI Modal (`⚡ + Batch Add Multiple Projects`)**:
   - Accessible directly in the **Application & Project Service Catalog** header.
   - Enables dynamically adding/removing project rows with real-time department mapping.
   - **`⚡ Load Multi-Dept Template`**: Pre-populates realistic enterprise projects across IT & Applications, Cloud & DevOps, Finance & Billing, Platform Engineering, and HR.
   - Configures User 1 (Frontend Lead), User 2 (Backend Lead), and User 3 (Project Monitor) per project row before submission.

3. **Department-Grouped Hierarchy in Service Catalog**:
   - **`📂 By Department` View**: Groups catalog cards under glowing department banners (`IT & Applications`, `Cloud Infrastructure & DevOps`, `Finance & Billing Operations`, etc.) with project count badges and 1-click `+ Add Project to Department` shortcuts.
   - **`🔲 Flat Grid` View**: Classic responsive card grid for high-density monitoring.
   - **Department Filter Pills**: Instantly isolate projects by department with live counts.

---

#### 6. Enterprise Sign-In Security & Role-Based Access Controls
- **Public / Standard Login Screen**:
  - The "Instant Sign In by User ID" roster has been strictly removed for general users and unauthenticated guests to protect team identities and prevent unauthorized account switching.
  - Standard users authenticate via email and password, with access to **"Previous Login Suggestions"** that remember only their own previous session on that device.
- **SuperAdmin-Exclusive Session Rights**:
  - Instant Sign-In and Session Switching (`authTab === "switch"`) are restricted exclusively to authenticated `SUPER_ADMIN` accounts for administrative auditing and support.

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

### 11. Media & Screenshot Attachment Flow & Viewer Collaboration Rights

WorkMate AI features an industrial-grade **Media & Screenshot Attachment Pipeline** enabling reporters, engineers, managers, and project monitors/viewers to upload, drag-and-drop, or paste image evidence and technical documentation directly into incident tickets and discussion threads.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     USER ACTION: CAPTURE EVIDENCE                        │
│   • Snipping Tool (Win+Shift+S) / Clipboard Screenshot                  │
│   • Drag & Drop File into Comment / Post Box                            │
│   • Browse File Selector (PNG, JPG, WEBP, GIF, SVG, PDF)                 │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE SMART PROCESSING                           │
│   • Clipboard Event Interception (onPaste on Textarea)                   │
│   • Client-Side Canvas Image Optimization (Resizes if >1.2MB to ~800KB)   │
│   • Real-Time Thumbnail Preview Chip with File Name, Size & [✕ Remove]   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  HIGH-SPEED PERSISTENCE ENGINE                           │
│   1. Primary Route: POST /api/upload (Saves to static /uploads directory │
│      or branches via S3-compatible Neon Object Storage)                  │
│   2. Resilient Fallback: Self-contained Data URL Base64 Storage in DB   │
│   3. Database Columns: mediaUrl (TEXT) & mediaName in Neon Postgres      │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   INTERACTIVE CONSUMPTION & LIGHTBOX                     │
│   • Ticket Details Modal: Prominent "📎 Incident Media & Evidence" card   │
│   • Discussion Timeline: Compact responsive thumbnail in comment bubble  │
│   • 1-Click High-Res Lightbox Modal: Zoom, Pan, Download & Fullscreen    │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Key Capabilities & Process Flow:

1. **Universal Clipboard Paste (Ctrl+V)**:
   - Team members taking screenshots with Windows Snipping Tool (`Win + Shift + S`) or macOS (`Cmd + Shift + 4`) can simply focus on the ticket description or comment input and press `Ctrl + V`.
   - The platform instantly intercepts the clipboard image data, runs client-side optimization, and generates a visual preview chip.

2. **Drag & Drop Attachment Zone**:
   - Both the **Create Ticket Modal** and **Ticket Discussion Box** act as live drag-and-drop zones with real-time border illumination (`.drag-over`) when hovering media files over the box.

3. **Viewer & Monitor Role Collaborative Rights**:
   - Clients, auditors, and project monitors utilizing the `VIEWER` role possess verified rights to submit technical comments and attach screenshots to any assigned or visible tickets.
   - Comments submitted by viewers prominently display the `👁️ Viewer / Monitor` verification badge, keeping engineers informed of client feedback while protecting ticket lifecycle integrity (status alteration remains restricted to assigned staff).

4. **Full-Resolution Interactive Lightbox**:
   - Clicking any attached image thumbnail in ticket descriptions or comment timelines instantly opens the **Full-Resolution Lightbox Modal** with backdrop blur, image title, download button, and close controls.

5. **Dual-Layer Fail-Safe Storage**:
   - **Upload Endpoint (`POST /api/upload`)**: Saves media files to the server's static directory (`/uploads/...`) with 50MB payload limits configured in Express middleware.
   - **Resilient Fallback**: If network interruptions occur, the image automatically falls back to an embedded Base64 Data URL, ensuring zero data loss during mission-critical field operations.

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

| Name | Role | Email | Password | Squad / Project Scope |
|---|---|---|---|---|
| **Sarah Chen** | Super Admin | `admin@workmate.internal` | `WorkMate@123` | Global (All Squads) |
| **Marcus Vance** | Operations & Dispatch Manager | `marcus@workmate.internal` | `WorkMate@123` | Backend & Core APIs |
| **Alex Rivera** | Senior Software Engineer | `alex@workmate.internal` | `WorkMate@123` | Backend & Core APIs |
| **Priya Sharma** | Network & Systems Specialist | `priya@workmate.internal` | `WorkMate@123` | Cloud Infra |
| **Rajesh Engineer** | Software Engineer | `rajesh@softech.com` | `WorkMate@123` | 💻 Softech Solution |
| **Anita Viewer** | Viewer / Read-Only | `anita@softech.com` | `WorkMate@123` | 💻 Softech Solution |

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
