# WorkMate AI — Complete Deep-Dive Learning & Architecture Manual

> **Document Type:** Comprehensive Educational & Architectural Deep-Dive Guide  
> **Target Audience:** Full-Stack Engineers, Software Architects, DevOps Engineers, and Product Evaluators  
> **System Version:** 2.0 (Next.js 15 + Express + Neon PostgreSQL + Prisma ORM + Google Gemini AI)  
> **Date:** October 2026  

---

## 1. Executive Summary & Core Mission

### 1.1 What is WorkMate AI?
**WorkMate AI** is a next-generation, autonomous **IT Service Management (ITSM) and Fleet Command Platform**. It unifies the project tracking and ticketing power of **Jira Service Management**, the infrastructure telemetry of **ServiceNow**, and an intelligent **AI Copilot** powered by frontier Large Language Models (LLMs such as Google Gemini).

In modern enterprise engineering organizations, developers and operations teams are inundated with incident reports from various sources: web app crashes, payment gateway timeouts, database deadlocks, network degradation, and user-submitted bug tickets.

### 1.2 The Problem WorkMate AI Solves

| Traditional IT Ticketing (Legacy Jira / ServiceNow) | The WorkMate AI Autonomous Approach |
| :--- | :--- |
| **Manual Dispatching:** A human service desk dispatcher must manually read, tag, and assign each ticket. | **Instant Autonomous Triage:** Google Gemini AI analyzes the incident in under 1.5 seconds, extracting root cause, severity, and suggested fixes. |
| **Static & Broken SLAs:** Service Level Agreements (SLAs) are static timers that do not adapt to service criticality. | **Dynamic Asset-Aware SLAs:** SLAs dynamically calculate deadlines based on incident priority and the specific service asset's SLA target. |
| **Context Switching & Fragmentation:** Tasks, bug tickets, and server monitoring live in disconnected systems. | **Unified Fleet Command:** Web services, Kubernetes nodes, databases, incident tickets, and engineering tasks live under a single pane of glass. |
| **Complex Role Governance:** Team members get overwhelmed seeing thousands of irrelevant tickets from other squads. | **Strict Persona-Scoped Workspaces:** SuperAdmins oversee the entire fleet, while individual engineers (e.g. Aashutosh) see strictly their assigned and reported work. |

---

## 2. High-Level System Architecture

WorkMate AI is structured as a high-performance **Turborepo / pnpm workspace monorepo** designed for extreme type-safety, rapid local development, and modular cloud deployment.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER (apps/web)                      │
│   Next.js 15 (App Router) · React 19 · Enterprise Cyber Vanilla CSS Design  │
│   • Operations Command Dashboard (KPIs, Charts, SLA Metrics)                │
│   • Jira-Style Kanban Board & Table Matrix (Drag-free Realtime State)       │
│   • Monitored Services & Fleet Health Registry                              │
│   • Granular Team & Role Permission Center (SuperAdmin vs User)             │
│   • Operational Work Orders & Task Dispatcher                               │
│   • AI Intelligence Hub & Shift Handover Briefing                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST / JSON
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API & LOGIC LAYER (apps/api)                       │
│        Node.js · Express · TypeScript · Zod Validation · REST Router        │
│   • /api/issues  : Ticket creation, updates, comments, triage execution     │
│   • /api/tasks   : Work order creation, toggle status, ticket linking       │
│   • /api/services: Monitored website/API registry & health check state      │
│   • /api/users   : RBAC profiles, active session switching, role updates    │
│   • /api/ai      : Triage reasoning engine, executive shift summaries       │
│   • /api/stats   : Real-time analytics, SLA compliance, team velocity       │
└───────────────────────┬───────────────────────────────┬─────────────────────┘
                        │                               │
            Prisma ORM  │                               │ Google GenAI / REST
                        ▼                               ▼
┌─────────────────────────────────────┐   ┌───────────────────────────────────┐
│           DATA LAYER (Neon)         │   │      AI INTELLIGENCE LAYER        │
│   Neon Serverless PostgreSQL        │   │    Google Gemini 2.5 / Flash      │
│   • Pooled & Direct Connections     │   │   • Prompt Template Engineering   │
│   • Auto-scaling & Instant Branching│   │   • Structured JSON Enforcement   │
│   • Relational Integrity & Cascades │   │   • Rule-Based Heuristic Fallback │
└─────────────────────────────────────┘   └───────────────────────────────────┘
```

### 2.1 Technology Stack Details
1. **Frontend (`apps/web`)**: Built on Next.js 15 and React 19. It uses vanilla CSS tokens (`globals.css`) with curated neon-indigo and cyber-cyan palettes, glassmorphic frosted panels, and micro-animations. It operates completely without heavy bloated UI libraries.
2. **Backend (`apps/api`)**: Node.js Express server written in strict TypeScript. It uses Zod schemas to validate all inputs before queries touch the database.
3. **Database (`Neon PostgreSQL`)**: Managed serverless PostgreSQL on AWS us-east-2. Connection pooling allows handling thousands of concurrent requests without running out of connections.
4. **ORM (`Prisma v6`)**: Fully typed models, migrations, and seeds. Prisma guarantees that all database relations (Users, Issues, Comments, Tasks, ServiceAssets) are strongly typed in TypeScript.
5. **AI Engine (`AiService`)**: Integrates Google Gemini 2.5 Flash via structured prompt engineering. If the cloud AI API key is missing or offline, it automatically falls back to an intelligent heuristic classifier.

---

## 3. End-to-End Operational Lifecycle & Flowcharts

To fully understand WorkMate AI, we trace the six fundamental workflows that occur within the system.

### Flow 1: Incident Creation & Submission Flow

When a user or automated monitor detects a bug or outage, the following chain of events executes:

```
[User / Monitor]
       │
       ▼
1. User opens "+ Log Incident Ticket" Modal
   Inputs: Title, Description, Affected Service (e.g. Payment Gateway), Priority, Category
       │
       ▼
2. Client sends HTTP POST to http://localhost:4000/api/issues
   Payload: { title, description, category, priority, serviceAssetId, reporterId, runAiTriage: true }
       │
       ▼
3. Express Route (issue.routes.ts) validates input with Zod Schema:
   • Checks title (min 3 chars), description (min 3 chars), reporterId (valid cuid)
       │
       ▼
4. IssueService.createIssue() intercepts request:
   • Verifies reporter exists in database
   • Fetches ServiceAsset metadata (if linked) to check custom SLA target minutes
       │
       ▼
5. Calls AI Triage Engine (Flow 2) to evaluate incident severity & root cause
       │
       ▼
6. Calculates Dynamic SLA Deadline:
   • slaDeadline = currentTime + slaMinutes (e.g., 15 mins for URGENT)
       │
       ▼
7. Writes Ticket to Neon PostgreSQL via Prisma:
   • Creates Issue record with unique auto-incrementing ticketNumber (e.g. #TIK-026)
       │
       ▼
8. Returns HTTP 201 Created to Client -> UI immediately updates Kanban board and KPIs!
```

---

### Flow 2: AI Autonomous Triage & Diagnostic Reasoning Flow

The core differentiator of WorkMate AI is its autonomous incident reasoning engine located in `apps/api/src/services/ai.service.ts`.

```
[Raw Incident Symptoms]
"Checkout failing with 504 Gateway Timeout on /api/v1/billing"
       │
       ▼
1. Prompt Construction:
   System sets strict operational persona: "Senior Enterprise Site Reliability Engineer (SRE)"
   Injects: Ticket Title, Full Description, Affected Service, Environment, Error Messages
       │
       ▼
2. Schema & Output Constraint:
   Demands strict RFC-compliant JSON with exactly 5 parameters:
   • category: HARDWARE | SOFTWARE | NETWORK | FACILITY | SAFETY | OTHER
   • priority: LOW | MEDIUM | HIGH | URGENT
   • suggestedAction: Concrete, technical remediation steps
   • rootCause: Inferred failure vector (e.g., downstream microservice thread pool exhaustion)
   • confidence: Value between 0.00 and 1.00
       │
       ▼
3. Gemini Model Call:
   Executes Google Gemini API interaction with temperature = 0.1 (high determinism)
       │
       ├─────────────────────────────────┬─────────────────────────────────┐
       │ (Cloud API Success)             │ (No API Key / Network Offline)  │
       ▼                                 ▼                                 ▼
4. JSON Parse & Validation        5. Intelligent Heuristic Fallback
   Parses markdown-clean JSON.       Analyzes keyword signatures:
   Extracts root cause & action.     - "timeout", "504", "crash" -> URGENT / SOFTWARE
                                     - "wifi", "dns", "latency" -> HIGH / NETWORK
       │                                 │
       └────────────────┬────────────────┘
                        ▼
6. Ticket Enrichment:
   The issue is stored with `aiSummary`, `aiRootCause`, `aiSuggestedAction`, and `aiConfidence`.
   A diagnostic audit badge appears on the Kanban card indicating autonomous triage completion.
```

---

### Flow 3: Dynamic SLA Calculation & Deadline Engine

WorkMate AI does not use arbitrary static ticket deadlines. SLAs are governed by the criticality of the service asset and the incident priority:

| Priority Level | Default Resolution Target | Service Asset Override Rule | Example Breach Condition |
| :--- | :--- | :--- | :--- |
| **URGENT** | **15 Minutes** | Uses `ServiceAsset.slaTargetMins` if smaller | Outage on Core Billing API in Production |
| **HIGH** | **60 Minutes** | Uses standard high-priority pool | Latency spike on User Authentication Service |
| **MEDIUM** | **4 Hours (240 mins)** | Standard business hour queue | UI styling glitch on mobile browser |
| **LOW** | **24 Hours (1440 mins)**| Backlog queue | Minor typo in documentation footer |

**SLA Enforcement Mechanism:**
- Whenever tickets are listed, `IssueService` evaluates `slaDeadline < currentTime` and `status != RESOLVED`.
- If breached, `slaBreached = true` is set, triggering flashing amber/red warning badges on the dashboard to alert engineering leads.

---

### Flow 4: Enterprise Role-Based Access Control (RBAC) & Data Scoping Flow

WorkMate AI implements **strict organizational boundary enforcement** so team members only interact with relevant data.

```
                            [Incoming User Session]
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      Role == SUPER_ADMIN / ADMIN                   Role == ENGINEER / USER
                │                                             │
                ▼                                             ▼
       [Enterprise Fleet Mode]                        [Personal Workspace Mode]
• View all organization tickets (Global)       • STRICT DATA SCOPING:
• Modify member roles & departments            • Only tickets assigned to this user
• Register and monitor new applications        • Only tickets reported by this user
• View global SLA & department analytics       • Other team members' tickets are hidden
• Dispatch tasks to any squad member           • Can only link tasks to personal tickets
```

#### Detailed Role Privileges Matrix

| Capability / Feature | `SUPER_ADMIN` | `ADMIN` | `MANAGER` | `ENGINEER` *(e.g. Aashutosh)* | `USER` *(Reporter)* |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Global Organization Tickets** | ✅ Yes | ✅ Yes | Squad Only | ❌ Hidden (Personal Only) | ❌ Hidden |
| **View Assigned & Reported Tickets** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Alter Team Member Roles** | ✅ Yes | ❌ 403 | ❌ 403 | ❌ 403 (Locked) | ❌ 403 |
| **Register Monitored Web Services** | ✅ Yes | ✅ Yes | ❌ 403 | ❌ 403 (Read Only) | ❌ 403 |
| **Dispatch Operational Work Orders** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Restricted |
| **Run Manual AI Triage Sandbox** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Restricted |

---

### Flow 5: Operational Work Orders (Field Tasks) Flow

Tickets represent customer-facing symptoms (*"Users cannot log in"*). Work Orders represent the actual engineering tasks needed to fix the symptom (*"Roll back deploy v1.4"*, *"Restart Auth pod"*).

```
[Incident Ticket #TIK-025]
"Submit button not functioning on checkout"
       │
       ▼
1. Engineer clicks "+ Add Task"
   Inputs: Task Title ("Patch validation regex in checkout.tsx"), Category, Priority, Due Date
   Links Task directly to Ticket #TIK-025
       │
       ▼
2. Client sends HTTP POST to /api/tasks
   Payload: { title, category, priority, ownerId: activeUser.id, issueId: "cmutplufw0009i6d0fhxxotdj" }
       │
       ▼
3. Task is created and linked relationally to both the User and the Issue
       │
       ▼
4. Execution & Status Toggling:
   Engineer completes code fix and clicks the checkbox on the Work Order card:
   • Client sends HTTP PATCH to /api/tasks/:id with { status: "DONE" }
   • Dashboard re-computes "Task Completion Velocity Rate" in real time!
```

---

### Flow 6: Real-Time AI Executive Shift Handover Briefing

At any moment, an Engineering Lead or SuperAdmin can click **"⚡ Re-analyze Operations"** on the Command Dashboard:

```
[Trigger Shift Summary]
       │
       ▼
1. IssueService aggregates all unresolved incidents, critical outages, and task completion metrics.
       │
       ▼
2. Sends complete operational snapshot to AiService.generateShiftSummary():
       │
       ▼
3. Gemini processes the telemetry and returns:
   • headline: "2 Critical Outages Detected Across Billing & Platform Infrastructure"
   • operationalSummary: "Checkout service latency elevated. DevOps team actively patching Redis nodes."
   • recommendedFocus: [
       "Prioritize Ticket #TIK-021: Backend memory leak remediation",
       "Validate SSL certificate expiry on Auth API",
       "Clear backlog queue on Mobile App crash reports"
     ]
       │
       ▼
4. Rendered directly on the Command Dashboard with high-visibility purple callouts.
```

---

## 4. Database Schema Deep Dive (Neon PostgreSQL)

The schema is defined in `apps/api/prisma/schema.prisma`. Below is the complete relational architecture:

### 4.1 Schema Relationship Diagram (ASCII ERD)

```
 ┌───────────────────────────┐                ┌───────────────────────────┐
 │           User            │ 1            * │           Issue           │
 │───────────────────────────│────────────────│───────────────────────────│
 │ id            String (PK) │ reporterId     │ id            String (PK) │
 │ name          String      │ assigneeId     │ ticketNumber  Int (Auto)  │
 │ email         String (UQ) │                │ title         String      │
 │ role          Enum(Role)  │                │ description   String      │
 │ department    String?     │                │ status        Enum(Status)│
 │ avatar        String?     │                │ priority      Enum(Prior) │
 │ createdAt     DateTime    │                │ category      Enum(Categ) │
 └─────────────┬─────────────┘                │ aiSummary     String?     │
               │                              │ aiRootCause   String?     │
               │ 1                            │ aiAction      String?     │
               │                              │ aiConfidence  Float?      │
               │ *                            │ slaDeadline   DateTime?   │
 ┌─────────────┴─────────────┐                │ serviceAssetId String?    │
 │           Task            │                └─────────────┬─────────────┘
 │───────────────────────────│                              │ 1
 │ id            String (PK) │                              │
 │ title         String      │                              │ *
 │ description   String?     │                ┌─────────────┴─────────────┐
 │ status        Enum(Task)  │                │          Comment          │
 │ priority      Int         │                │───────────────────────────│
 │ ownerId       String (FK) │ *            1 │ id            String (PK) │
 │ issueId       String? (FK)│────────────────│ content       String      │
 └───────────────────────────┘ issueId        │ isAiGenerated Boolean     │
                                              │ authorId      String (FK) │
                                              │ issueId       String (FK) │
                                              └───────────────────────────┘
```

### 4.2 Field-by-Field Table Specifications

#### 1. `User` Table (Team & Identity)
- `id` (String, Primary Key, CUID): Unique identifier for the team member.
- `name` (String): Full display name (e.g. *"Aashutosh Kumar"*).
- `email` (String, Unique): Work email address for authentication and notification.
- `role` (Enum `Role`): `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `ENGINEER`, `USER`.
- `department` (String, Optional): Squad assignment (e.g. *"Frontend & Mobile Engineering"*).
- `avatar` (String, Optional): HTTPS URL to profile photo.

#### 2. `ServiceAsset` Table (Monitored Systems & Apps)
- `id` (String, Primary Key, CUID): Service asset identifier.
- `name` (String): Human-readable name (e.g. *"Stripe Checkout & Billing"*).
- `slug` (String, Unique): Machine-friendly identifier (`billing-api`).
- `type` (Enum): `WEB_APP`, `MOBILE_APP`, `API_SERVICE`, `CLOUD_INFRA`, `DATABASE`, `HARDWARE`, `FACILITY`.
- `department` (String): Owning department.
- `environment` (Enum): `PRODUCTION`, `STAGING`, `ON_PREMISE`.
- `healthStatus` (Enum): `OPERATIONAL`, `DEGRADED`, `OUTAGE`.
- `slaTargetMins` (Int): Target resolution window in minutes (e.g. 15 for mission-critical apps).
- `urlOrLocation` (String, Optional): Health check URL or server cluster host.

#### 3. `Issue` Table (Incident Tickets)
- `id` (String, Primary Key, CUID): Internal UUID.
- `ticketNumber` (Int, Auto-increment): Customer-facing ticket number (e.g. `#TIK-025`).
- `title` (String, max 200 chars): Concise summary of the incident.
- `description` (String, max 10000 chars): Detailed symptoms, error logs, and stack traces.
- `status` (Enum): `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`.
- `priority` (Enum): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- `category` (Enum): `HARDWARE`, `SOFTWARE`, `NETWORK`, `FACILITY`, `SAFETY`, `OTHER`.
- `aiSummary` (String, Optional): One-line executive briefing generated by Gemini.
- `aiSuggestedAction` (String, Optional): Exact steps recommended by AI to resolve the bug.
- `aiRootCause` (String, Optional): Technical root cause inferred by Gemini.
- `aiConfidence` (Float, Optional): Confidence score (0.0 to 1.0) of AI diagnosis.
- `slaDeadline` (DateTime, Optional): Timestamp when SLA breach occurs.
- `slaBreached` (Boolean, Default false): Flag set if ticket exceeds SLA target.
- `reporterId` (String, Foreign Key -> `User.id`): Member who logged the ticket.
- `assigneeId` (String, Foreign Key -> `User.id`, Optional): Assigned engineer.
- `serviceAssetId` (String, Foreign Key -> `ServiceAsset.id`, Optional): Linked system.

#### 4. `Task` Table (Work Orders)
- `id` (String, Primary Key, CUID): Task identifier.
- `title` (String): Specific actionable step.
- `status` (Enum): `TODO`, `IN_PROGRESS`, `DONE`.
- `priority` (Int, Default 1): 1 = Normal, 2 = High, 3 = Urgent.
- `ownerId` (String, Foreign Key -> `User.id`): Engineer responsible for execution.
- `issueId` (String, Foreign Key -> `Issue.id`, Optional): Parent incident ticket.

#### 5. `Comment` Table (Audit Trail & Discussions)
- `id` (String, Primary Key, CUID): Comment identifier.
- `content` (String): Message or log update.
- `isAiGenerated` (Boolean, Default false): True if auto-posted by AI Copilot.
- `authorId` (String, Foreign Key -> `User.id`): Comment author.
- `issueId` (String, Foreign Key -> `Issue.id`): Parent ticket.

---

## 5. API Architecture & REST Specifications

All endpoints are hosted on `http://localhost:4000` (or the configured `PORT`).

### 5.1 Route Map

```
Base URL: http://localhost:4000
├── /health              GET     --> Health check verification
├── /api/issues          GET     --> List tickets (supports status, category, assigneeId, reporterId)
│                        POST    --> Create ticket with optional AI auto-triage
├── /api/issues/:id      GET     --> Get ticket detail with comments, tasks, serviceAsset
│                        PATCH   --> Update status, priority, assignee, resolutionNotes
│                        DELETE  --> Remove ticket
├── /api/issues/:id/comments POST--> Add comment to ticket (human or AI)
├── /api/issues/:id/ai-triage POST--> Run on-demand AI triage on existing ticket
├── /api/tasks           GET     --> List work orders
│                        POST    --> Dispatch new work order
├── /api/tasks/:id       PATCH   --> Toggle work order status (TODO -> DONE)
│                        DELETE  --> Remove work order
├── /api/services        GET     --> List monitored web applications
│                        POST    --> Register new application (SuperAdmin)
├── /api/users           GET     --> List team members with ticket counts
│                        POST    --> Register new team member
│                        PATCH   --> Update member role (SuperAdmin only)
│                        DELETE  --> Remove member account (SuperAdmin only)
├── /api/stats           GET     --> Get KPI overview, SLA compliance, workloads
└── /api/ai/shift-summaryPOST    --> Generate executive AI handover briefing
```

### 5.2 Key Endpoint Payloads

#### Creating an Incident (`POST /api/issues`)
**Request Body (JSON):**
```json
{
  "title": "504 Gateway Timeout during checkout on /api/v1/billing",
  "description": "Payment microservice dropping transactions. Redis queue backlogged with 10k items.",
  "category": "SOFTWARE",
  "priority": "HIGH",
  "reporterId": "cmutn5nsr0003i60och71ay63",
  "serviceAssetId": "cmutnzabc0001service",
  "runAiTriage": true
}
```

**Response (JSON - HTTP 201 Created):**
```json
{
  "id": "cmutpxyz0001issue",
  "ticketNumber": 26,
  "title": "504 Gateway Timeout during checkout on /api/v1/billing",
  "status": "OPEN",
  "priority": "URGENT",
  "category": "SOFTWARE",
  "aiSummary": "Critical failure in payment microservice causing transaction dropouts due to Redis backlog.",
  "aiRootCause": "Redis connection pool exhaustion causing downstream HTTP 504 timeouts.",
  "aiSuggestedAction": "Scale Redis read-replicas, flush dead letter queue, and restart billing worker pods.",
  "aiConfidence": 0.94,
  "slaDeadline": "2026-10-05T09:15:00.000Z",
  "slaBreached": false,
  "createdAt": "2026-10-05T09:00:00.000Z"
}
```

---

## 6. Frontend State & Reactive Rendering Mechanics

The frontend (`apps/web/src/app/page.tsx`) maintains a reactive, real-time client state without unnecessary page reloads.

### 6.1 State Architecture

```typescript
// Active Session & Identity
const [users, setUsers] = useState<User[]>([]);
const [activeUser, setActiveUser] = useState<User | null>(null);

// Raw Datasets (Fetched from API)
const [issues, setIssues] = useState<Issue[]>([]);
const [tasks, setTasks] = useState<Task[]>([]);
const [services, setServices] = useState<ServiceAsset[]>([]);
const [stats, setStats] = useState<DashboardStats | null>(null);

// Scoping & Filter States
const [searchQuery, setSearchQuery] = useState("");
const [roleScopeFilter, setRoleScopeFilter] = useState<"MY_ROLE_DEFAULT" | "MY_ASSIGNED" | "MY_REPORTED" | "ALL_TICKETS">("MY_ROLE_DEFAULT");
```

### 6.2 The Scoping Computation Engine

```typescript
const isSuperAdmin = activeUser?.role === "SUPER_ADMIN" || activeUser?.role === "ADMIN";

// 1. Strictly Scoped Issues
const filteredIssues = issues.filter((iss) => {
  // Search query & category matching...
  
  if (!activeUser) return true;
  
  if (!isSuperAdmin) {
    // Regular user / engineer (e.g. Aashutosh): STRICTLY personal work
    if (roleScopeFilter === "MY_ASSIGNED") return iss.assigneeId === activeUser.id;
    if (roleScopeFilter === "MY_REPORTED") return iss.reporterId === activeUser.id;
    return iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id;
  }
  
  // SuperAdmin: Access to all fleet tickets or filter by choice
  if (roleScopeFilter === "MY_ASSIGNED") return iss.assigneeId === activeUser.id;
  if (roleScopeFilter === "MY_REPORTED") return iss.reporterId === activeUser.id;
  return true; // Default: All Org
});

// 2. Strictly Scoped Tasks (Work Orders)
const filteredTasks = tasks.filter((task) => {
  if (!activeUser) return true;
  if (isSuperAdmin) return true;
  
  // Engineer only sees tasks they own, or tasks linked to their tickets
  const isOwner = task.ownerId === activeUser.id;
  const isLinkedToMyIssue = Boolean(
    task.issueId && issues.some(iss => iss.id === task.issueId && (iss.assigneeId === activeUser.id || iss.reporterId === activeUser.id))
  );
  return isOwner || isLinkedToMyIssue;
});
```

---

## 7. Developer Operations & How to Run from Scratch

### 7.1 Prerequisites
- **Node.js**: v20 or v22 LTS
- **pnpm**: v9 or v10 (`npm install -g pnpm`)
- **Git**: Installed and configured

### 7.2 Step-by-Step Local Setup

#### Step 1: Clone & Install Dependencies
```bash
git clone <repository-url>
cd WorkMate_AI
pnpm install
```

#### Step 2: Configure Environment Variables
In the project root, verify `.env.local` contains your Neon database credentials:
```env
DATABASE_URL="postgresql://neondb_owner:<password>@ep-frosty-dream-b589tv8j-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:<password>@ep-frosty-dream-b589tv8j.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
```
In `apps/api/.env`:
```env
PORT=4000
DATABASE_URL="postgresql://neondb_owner:<password>@ep-frosty-dream-b589tv8j-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
GEMINI_API_KEY="your-gemini-api-key-here"  # Optional: Fallback heuristics kick in if omitted
```

#### Step 3: Run Database Migrations & Prisma Client Generation
```bash
cd apps/api
pnpm prisma:generate
```

#### Step 4: Start the Full-Stack Application
From the root directory, run:
```bash
pnpm dev
```
`concurrently` will start both services in parallel:
- **Express Backend API**: Listening on [http://localhost:4000](http://localhost:4000)
- **Next.js Web Frontend**: Listening on [http://localhost:3000](http://localhost:3000)

---

## 8. Verification & Demonstration Checklist

To verify all system features during a demo or evaluation:

1. **Verify Health Check**: Open `http://localhost:4000/health`. Should return `{"ok": true, "service": "workmate-api"}`.
2. **Test SuperAdmin View**: In the web app, select **Ankitosh Kumar (SUPER_ADMIN)**.
   - Confirm all 3 tickets appear across the Kanban columns.
   - Confirm Team & Roles tab allows editing roles.
3. **Test Isolated Engineer View**: Switch user to **Aashutosh Kumar (ENGINEER)**.
   - Confirm only Ticket #25 (assigned to Aashutosh) appears.
   - Confirm other colleagues' tickets (Ticket #21 & #22 assigned to Ravi) are completely hidden.
   - Confirm the badge shows `1 visible` instead of the global 3.
4. **Test Autonomous AI Triage**:
   - Click **"+ Log Incident"**.
   - Enter title: *"Database connection pool timeout on checkout"*.
   - Check **"Run Autonomous AI Triage"** and submit.
   - Notice the ticket automatically appears with categorized priority (`URGENT`), root cause explanation, and technical action items.
5. **Test Work Order Linking**:
   - Open Work Orders tab, click **"+ Add Task"**.
   - Notice the "Link to Incident Ticket" dropdown strictly lists only tickets belonging to the logged-in user.

---

*End of Deep-Dive Learning & Architecture Guide · WorkMate AI v2.0*
