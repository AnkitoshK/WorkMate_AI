# WorkMate AI — Master Full-Stack Project Documentation
*Enterprise Incident Management & Autonomous AI Triage Platform*
*Academic & Professional Project Report for Master of Computer Applications (MCA)*

---

## 🌟 Executive Summary

**WorkMate AI** is an enterprise-grade incident management and operational intelligence platform designed specifically for modern **Software Engineering, Cloud Infrastructure, and SRE (Site Reliability Engineering)** environments.

In high-concurrency production environments (e.g., fintech, e-commerce, cloud platforms), software failures cost thousands of dollars per minute. Traditional ticketing systems (like vanilla Jira or ServiceNow) suffer from **manual triage latency**: human operators must manually inspect error logs, deduce the responsible service, look up on-call rosters, and assign the ticket.

WorkMate AI eliminates manual triage by embedding an **Autonomous AI Diagnostic & Routing Engine**. When an incident is logged (via automated alerts, log stacktraces, or user reports):
1. **AI Recognizes the Software Asset**: Immediately identifies whether the defect belongs to the *Billing API*, *Web Portal*, *OAuth Service*, *Kubernetes Cluster*, or *PostgreSQL Database*.
2. **AI Routes to the Exact Team & Engineer**: Selects the appropriate engineering department (Backend, Frontend, DevOps, Database, QA) and assigns the lead specialist.
3. **AI Computes SLA Deadlines**: Dynamically calculates the strict SLA deadline based on priority.
4. **AI Generates the Root Cause & Action Checklist**: Synthesizes the probable technical root cause and generates a 3-to-5 step engineering action plan (e.g., circuit breaker failover, pod memory ceiling expansion, SSR dynamic imports, B-Tree index creation).

---

## 🏢 System Architecture & Tech Stack

WorkMate AI is architected as a high-performance **pnpm monorepo** divided into four distinct architectural layers:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             1. CLIENT LAYER                                  │
│                                                                              │
│    Next.js 15 (React 19) Web Dashboard         Expo React Native Mobile App  │
│    (Port 3000 - Obsidian Glassmorphism)         (iOS & Android Native App)   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTP REST (JSON)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          2. API GATEWAY LAYER                                │
│                                                                              │
│                Node.js + Express.js + Strict TypeScript (Port 4000)          │
│                Input Sanitization & Schema Validation via Zod                │
└───────────────────────┬───────────────────────────────┬──────────────────────┘
                        │                               │
                        ▼                               ▼
┌───────────────────────────────────────────┐  ┌───────────────────────────────┐
│           3. AI INTELLIGENCE LAYER        │  │      4. DATA & STORAGE LAYER  │
│                                           │  │                               │
│  - Google Gemini 1.5 Flash (Cloud LLM)    │  │  - Neon Serverless PostgreSQL │
│  - Heuristic Pattern-Recognition Engine   │  │  - Prisma 6 ORM (Type-Safe)   │
│  - Microservice & Department Matcher      │  │  - PgBouncer Pooled Sockets   │
└───────────────────────────────────────────┘  └───────────────────────────────┘
```

### Technology Breakdown & Depth of Implementation:
- **Frontend**: **Next.js 15.2** & **React 19**. Uses Client Components with reactive hooks (`useState`, `useEffect`, `useCallback`) for sub-second UI updates, a Jira-style Kanban board, and custom CSS glassmorphism design tokens.
- **Mobile Client**: **Expo 57** & **React Native 0.76**. Built for on-call engineers to view active incident feeds, toggle remediation tasks, and report emergency outages.
- **Backend API**: **Node.js 22**, **Express.js 4.21**, and **TypeScript 5.8**. Implements RESTful architectural principles with modular route controllers and business services.
- **Validation**: **Zod 3.24**. Enforces strict runtime data validation on all incoming payloads before database execution.
- **ORM**: **Prisma 6.5**. Provides fully type-safe database access, automated schema migrations, and optimized relational queries.
- **Database**: **Neon Serverless PostgreSQL**. Hosted in the AWS cloud with auto-scaling, scale-to-zero capabilities, and connection pooling.
- **AI Core**: **Dual-Core Hybrid AI**. Combines Google Gemini 1.5 Flash (via REST with structured JSON mode) and an internal deterministic heuristic engine that guarantees 100% uptime even if external APIs are unreachable.

---

## 📦 Comprehensive Module-by-Module Documentation

---

### MODULE 1: User Personas & Role-Based Access Control (RBAC)

#### 1. Purpose & Overview
Manages the engineering organization hierarchy, assigning distinct operational permissions and access boundaries to team members.

#### 2. Technical Implementation
- Defined in [prisma/schema.prisma](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/prisma/schema.prisma) via `enum Role`:
  - **`SUPER_ADMIN`**: Global platform administrator (VP of Engineering / CTO). Can register new monitored microservices, create team accounts, configure SLAs, and reassign tickets across all departments.
  - **`ADMIN`**: Platform operations administrator. Oversees shift rosters and platform settings.
  - **`MANAGER`**: Technical Lead / Engineering Manager. Manages sprint workload, assigns department pool tickets, and monitors SLA breaches.
  - **`ENGINEER`**: Software Engineer (L4/L5 Specialist). Works on tickets, executes remediation checklists, and posts technical updates.
  - **`USER`**: QA Engineer / Internal Developer / Reporter. Submits new defect tickets and verifies resolutions.
- **Interactive Persona Switcher**:
  - Located in the top-right header of the web dashboard.
  - Allows instant simulation of any user persona (e.g., Sarah Chen as SuperAdmin vs. Alex Rivera as Software Engineer) without requiring repetitive manual re-logins.

---

### MODULE 2: Monitored Service & Application Catalog (Asset Registry)

#### 1. Purpose & Overview
Maintains an authoritative registry of all software applications, microservices, cloud clusters, and databases operated by the company.

#### 2. Key Attributes of a Service Asset
Every service registered in the system contains:
- **`name`**: Descriptive title (e.g., *"Billing & Payment Gateway API"*).
- **`slug`**: URL-safe unique identifier (e.g., `billing-api`).
- **`type`**: System architectural category (`WEB_APP`, `API_SERVICE`, `MOBILE_APP`, `CLOUD_INFRA`, `DATABASE`).
- **`department`**: Responsible engineering team (e.g., `Backend & Core APIs`).
- **`environment`**: Operational tier (`PRODUCTION`, `STAGING`, `ON_PREMISE`).
- **`healthStatus`**: Real-time status indicator (`OPERATIONAL`, `DEGRADED`, `OUTAGE`).
- **`slaTargetMins`**: Default resolution SLA target in minutes (e.g., 15 minutes for critical billing, 60 minutes for web portal).
- **`urlOrLocation`**: Endpoint, URL, or cloud ARN (e.g., `https://api.workmate.ai/v1/billing`).

#### 3. How it Works in Daily Operations
When tickets are opened, they link to a specific `ServiceAsset`. The Service Catalog tab automatically aggregates and displays:
- The active number of open incidents currently affecting each microservice.
- Visual health pills (Green for Operational, Amber for Degraded, Red for Outage).
- A SuperAdmin modal allowing engineers to register new microservices with custom SLA targets.

---

### MODULE 3: Autonomous AI Incident Triage & Neural Diagnostics

#### 1. Purpose & Overview
The core intellectual property of WorkMate AI. It transforms raw, chaotic error messages into structured, actionable engineering tickets in milliseconds.

#### 2. Dual-Engine Intelligence Architecture
```
                        [ Incident Symptom / Stacktrace ]
                                       │
                                       ▼
                         { GEMINI_API_KEY Available? }
                                    /     \
                            YES    /       \  NO or OFFLINE
                                  ▼         ▼
                 [ Google Gemini 1.5 Flash ]   [ Autonomous Heuristic Engine ]
                                  \         /
                                   ▼       ▼
                       [ Unified Structured JSON Output ]
                       • Detected Microservice Asset
                       • Responsible Department
                       • Recommended Specialist Assignee
                       • Predicted Priority & SLA Deadline
                       • Technical Root Cause Analysis
                       • Step-by-Step Remediation Plan
```

#### 3. Four-in-One AI Output Pipeline
1. **Asset Recognition**: Scans for keywords (e.g., `504`, `checkout`, `stripe`, `redis`) and maps them to the exact registered database ID (e.g., `asset-payment-api`).
2. **Department Routing**: Routes incidents to the appropriate team (e.g., `Backend & Core APIs` for payment crashes, `DevOps & Cloud SRE` for Kubernetes OOMKilled errors, `Frontend & Mobile Engineering` for React SSR hydration defects).
3. **Dynamic SLA Calculation**: Calculates the target deadline:
   $$\text{SLA Deadline} = \text{Current Time} + \text{Target Minutes}$$
4. **Actionable Checklist**: Writes a concrete 3-to-5 step technical playbook directly into the ticket (e.g., *"Step 1: Activate circuit breaker. Step 2: Scale Kubernetes pods to 12 replicas. Step 3: Increase downstream socket timeout to 5000ms"*).

---

### MODULE 4: Incident Ticketing & Lifecycle Management

#### 1. Purpose & Overview
Provides a real-time, interactive command center for tracking, updating, and resolving incidents across their complete operational lifecycle.

#### 2. Dual Viewing Modes
- **Jira-Style Kanban Board**:
  - Divided into 5 distinct lifecycle lanes:
    1. **Open**: Fresh unassigned incoming tickets.
    2. **Assigned**: Allocated to an on-call engineer, awaiting active response.
    3. **In Remediation**: Engineer is actively debugging, patching, or testing a fix.
    4. **Resolved**: Hotfix deployed to staging or production; verified stable.
    5. **Closed**: Formally closed, verified, and archived.
- **Interactive Table View**:
  - Compact, high-density tabular layout designed for fast scanning of dozens of tickets.
  - Displays Ticket Number (`#16`), Title, Affected Service, Engineering Team, Priority Badge, Assignee Avatar, and SLA Timer.

#### 3. Multi-Dimensional Search & Filtering Engine
Allows instant client-side filtering by:
- **Free-text Search**: Real-time query matching on titles, URLs, stacktraces, or ticket numbers.
- **Department Filter**: Isolates tickets for specific teams (`Backend & Core APIs`, `Frontend & Mobile Engineering`, `DevOps & Cloud SRE`, `Database & Platform Infrastructure`, `QA & Reliability Engineering`).
- **Priority Filter**: Filters by urgency (`URGENT`, `HIGH`, `MEDIUM`, `LOW`).
- **Status Filter**: Views only active, in-progress, or resolved items.

#### 4. Real-Time SLA Monitoring & Breach Indicators
- Every ticket calculates an automated deadline.
- When a ticket approaches its SLA limit, the countdown pill turns amber.
- If the current time exceeds `slaDeadline` and the ticket is not resolved, the system marks `slaBreached = true` and displays a flashing **SLA BREACHED** alert badge.

---

### MODULE 5: Ticket Detail Drawer & Team Collaboration

#### 1. Purpose & Overview
A sliding modal drawer that opens seamlessly upon clicking any ticket card or table row, enabling deep technical inspection without page reloads.

#### 2. Components of the Detail Drawer
- **Header**: Ticket number, full symptom title, priority badge, and department tag.
- **AI Diagnostic Card**:
  - **Summary**: Plain-English executive explanation of what broke.
  - **Root Cause**: Deep technical diagnosis (e.g., *"Sequential table scan on 2.4M audit trail rows holding client sockets open"*).
  - **AI Confidence Gauge**: Numerical certainty score (e.g., `96% Confidence`).
  - **Action Checklist**: Formatted numbered instructions for the assigned engineer.
- **Lifecycle Controls**:
  - Dropdown to immediately transition status (e.g., `OPEN` ➔ `IN_PROGRESS` ➔ `RESOLVED`).
  - Dropdown to reassign the lead engineer to any team member in the organization.
- **Collaboration Timeline**:
  - Chronological activity feed showing comments, updates, and timestamps.
  - Differentiates human engineer comments from automated **🤖 WorkMate AI Advisory** alerts with custom purple glassmorphism styling.
  - Integrated comment submission input for posting real-time remediation progress.

---

### MODULE 6: Remediation Task Board (Checklist Tracking)

#### 1. Purpose & Overview
Complex software incidents often require multiple secondary tasks (e.g., deploying Terraform configs, running SQL index migrations, updating documentation). This module tracks those granular sub-tasks.

#### 2. Key Capabilities
- Links each sub-task directly to its parent ticket (`issueId`).
- Assigns priority, due date, category (e.g., *DevOps & Cloud SRE*, *Code Fix & PR*), and owner.
- **Single-Click Status Toggling**: Engineers can toggle tasks between `TODO`, `IN_PROGRESS`, and `DONE` directly on the board.
- Feeds into the overall **Task Completion Velocity** metric displayed on the executive dashboard.

---

### MODULE 7: Operations Command Center & Executive Shift Briefing

#### 1. Purpose & Overview
Gives engineering directors, VPs, and department leads a 10,000-foot view of platform health, team workloads, and operational velocity.

#### 2. Core Dashboard Widgets
- **AI Executive Shift Briefing**: An automated banner synthesized by `AiService.generateShiftSummary()`. Highlights urgent unresolved blockers, active incident counts, and recommended operational focus areas.
- **KPI Metric Cards**:
  - Total Active Incidents count with red critical pulse indicators.
  - Urgent & High Priority count.
  - SLA Compliance Percentage and Breached Count.
  - Task Velocity Percentage (Ratio of completed remediation tasks vs. total tasks).
- **Department Workload Distribution**:
  - Real-time progress bars showing the exact incident load across all 5 engineering teams.
  - Color-coded gradients showing which department is currently carrying the heaviest remediation burden.

---

### MODULE 8: AI Testing Sandbox (Live Diagnostic Playground)

#### 1. Purpose & Overview
Allows developers and evaluators to test the neural diagnosis engine on arbitrary error inputs without creating persistent database records.

#### 2. How to Use the Sandbox
1. Navigate to the **AI Intelligence Hub** tab.
2. In the left panel, input any software defect:
   - *Incident Symptom*: e.g., `Postgres connection pool exhausted with 100/100 connections`.
   - *Cluster / URL*: e.g., `postgres://primary-db:5432/production`.
   - *Stacktrace*: e.g., `Timed out fetching connection from pool after 10000ms`.
3. Click **`✨ Run Autonomous AI Diagnosis`**.
4. In under 1 second, the right panel renders the recognized microservice (`Neon PostgreSQL Primary Cluster`), the assigned team (`Database & Platform Infrastructure`), priority (`URGENT`), and the generated SQL indexing fix.

---

### MODULE 9: Backend Architecture & REST API (`apps/api`)

#### 1. Purpose & Overview
The backbone of the application. An Express.js microservice written in TypeScript that enforces business rules, coordinates the AI engine, and securely interfaces with PostgreSQL.

#### 2. API Route Endpoints Matrix

| HTTP Method | Route Endpoint | Controller / Service | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | `server.ts` | Basic server liveness check |
| `GET` | `/api/issues` | `issue.routes.ts` | List issues with department/status/priority filters |
| `POST` | `/api/issues` | `issue.routes.ts` | Create new issue (triggers `AiService.triageIssue`) |
| `GET` | `/api/issues/:id` | `issue.routes.ts` | Fetch full issue details including comments & tasks |
| `PATCH`| `/api/issues/:id` | `issue.routes.ts` | Update status, priority, or assignee |
| `POST` | `/api/issues/:id/comments` | `issue.routes.ts` | Add collaboration comment to an issue |
| `GET` | `/api/services` | `service.routes.ts` | List all monitored microservices with incident counts |
| `POST` | `/api/services` | `service.routes.ts` | Register new monitored microservice |
| `GET` | `/api/users` | `user.routes.ts` | List team members with role and workload counts |
| `POST` | `/api/users` | `user.routes.ts` | Create new team member (SuperAdmin only) |
| `GET` | `/api/tasks` | `task.routes.ts` | List engineering remediation tasks |
| `PATCH`| `/api/tasks/:id` | `task.routes.ts` | Toggle task completion status |
| `GET` | `/api/stats` | `stats.routes.ts` | Fetch aggregated dashboard metrics and workload |
| `POST` | `/api/ai/triage` | `ai.routes.ts` | Run sandbox AI triage diagnosis on arbitrary text |

---

### MODULE 10: Database Schema & Entity Relationships

#### 1. Database Engine
Hosted on **Neon Serverless PostgreSQL** with instant branch provisioning, scale-to-zero compute, and connection pooling via PgBouncer.

#### 2. Relational Data Models
1. **`User`**: Team accounts storing email, name, avatar URL, department, and role enum. Has 1-to-many relations with reported issues, assigned issues, remediation tasks, and authored comments.
2. **`ServiceAsset`**: Monitored applications and microservices. Has a 1-to-many relation with incidents (`issues`).
3. **`Issue`**: The primary incident ticket. Stores title, description, status, priority, category, department, affected URL, SLA deadline, and cached AI diagnostics fields (`aiSummary`, `aiRootCause`, `aiSuggestedAction`, `aiConfidence`).
4. **`Task`**: Remediation action items linked to a parent `Issue` and assigned to a `User`.
5. **`Comment`**: Collaboration notes linked to an `Issue` and authored by a `User`, flagged with `isAiGenerated` for AI copilot advisories.

---

### MODULE 11: Mobile On-Call Application (`apps/mobile`)

#### 1. Purpose & Overview
An Expo / React Native client designed for software engineers and SREs on rotational on-call shifts who need instant mobile access to production alerts.

#### 2. Key Features
- **Live Incident Stream**: Pulls open production incidents directly from the Express API with pull-to-refresh gestures.
- **Task Execution**: Allows engineers to mark remediation tasks as completed directly from their smartphones.
- **Quick Outage Reporter**: Lightweight mobile form to report critical outages directly into the triage pipeline.

---

## 🚀 Step-by-Step User Manual: How to Demonstrate & Test

### Step 1: Open the Application
1. Ensure the API server is running on `http://localhost:4000`.
2. Open the Next.js Web Dashboard on `http://localhost:3000`.

### Step 2: Test Persona Switching
- Click the user dropdown in the top navigation bar.
- Switch between **Sarah Chen (SUPER_ADMIN)**, **Marcus Vance (MANAGER)**, **Alex Rivera (ENGINEER)**, and **Elena Rostova (QA Lead)**.
- Notice how the user profile badge and department tag change instantly.

### Step 3: Log a Bug with AI Autopilot
1. Click the glowing **`+ Log Incident Ticket`** button.
2. In the modal:
   - Set Title: `React blank screen on /analytics`.
   - Set Description: `Hydration failed because the initial UI does not match what was rendered on the server in client bundle`.
   - Leave Department and Service on **`✨ Auto-Route with WorkMate AI`**.
   - Keep **`✨ WorkMate AI Auto-Pilot`** checked.
3. Click **`Submit Incident`**.
4. **Observe the Result**:
   - The ticket appears immediately on the Kanban board under `ASSIGNED`.
   - The AI automatically matched the *Customer Operations Web Portal*.
   - The AI routed the ticket to the *Frontend & Mobile Engineering* team and assigned it to *Alex Rivera*.
   - The AI computed a 45-minute SLA deadline and generated the Next.js dynamic import fix checklist!

### Step 4: Work on the Ticket in the Detail Drawer
1. Click on the newly created ticket card.
2. The **Ticket Detail Drawer** slides open from the right.
3. Read the AI Root Cause and Suggested Action Plan.
4. Change the status from `ASSIGNED` to `IN_PROGRESS`.
5. In the collaboration thread, type: *"Investigating Next.js component boundaries"* and click **Post**.
6. The update appears in the timeline. Move the status to `RESOLVED` when finished.

### Step 5: Test the AI Diagnostic Sandbox
1. Click the **`AI Intelligence Hub`** tab (Tab 6).
2. In the input box, type: `Kafka worker pod terminating with exit code 137 OOMKilled`.
3. Click **`✨ Run Autonomous AI Diagnosis`**.
4. The AI immediately returns:
   - Priority: `HIGH`
   - Application: `Cloud Kubernetes Production Cluster`
   - Department: `DevOps & Cloud SRE`
   - Complete technical explanation and Helm memory ceiling patch steps!

---

## 📋 Viva & Evaluation Summary Questions

| Common Examiner Question | Complete Answer |
| :--- | :--- |
| **What makes WorkMate AI different from Jira?** | Jira is a static ticketing tool requiring human operators to manually read, categorize, route, and assign tickets. WorkMate AI has an embedded AI triage engine that automatically recognizes the software asset, routes to the on-call team, sets the SLA deadline, and writes the technical remediation checklist. |
| **How does the AI work if the internet is down?** | WorkMate AI features a hybrid dual-core architecture. It attempts to call Google Gemini 1.5 Flash for deep LLM analysis. If the API key is absent, rate-limited, or offline, an intelligent deterministic heuristic pattern-matching engine takes over instantly, guaranteeing 100% platform availability. |
| **Which database is used and why?** | Neon Serverless PostgreSQL with Prisma 6 ORM. It provides strict relational integrity, ACID compliance, foreign key cascades, automatic connection pooling via PgBouncer, and scale-to-zero efficiency. |
| **How is code organized?** | A pnpm monorepo consisting of `apps/api` (Express backend), `apps/web` (Next.js dashboard), and `apps/mobile` (Expo React Native client), sharing common TypeScript configs and schemas. |

---
*Documentation compiled for WorkMate AI Project Guide. All rights reserved.*
