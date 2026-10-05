# WorkMate AI — Complete Operations Manual & Full-Stack System Guide
*Comprehensive End-to-End User, Operator & Technical Reference Manual*
*Master of Computer Applications (MCA) Project Documentation*

---

## 📑 Table of Contents

1. **Chapter 1: Introduction, Problem Statement & Industry Context**
   - 1.1 The Operational Crisis in Modern Software Engineering
   - 1.2 The Failure of Legacy ITSM Tools (Jira, ServiceNow, PagerDuty)
   - 1.3 The WorkMate AI Paradigm & Value Proposition
   - 1.4 High-Level System Architecture Diagram

2. **Chapter 2: Technology Stack & Deep Implementation Architecture**
   - 2.1 Monorepo Workspace Philosophy (pnpm workspaces)
   - 2.2 Client Layer: Next.js 15, React 19 & Obsidian Glassmorphism
   - 2.3 Mobile Layer: React Native & Expo 57 for On-Call SREs
   - 2.4 API Gateway Layer: Node.js 22, Express 4.21 & TypeScript 5.8
   - 2.5 Input Sanitization & Security: Zod Runtime Schema Validation
   - 2.6 Dual-Core AI Intelligence Engine (Gemini 1.5 Flash + Heuristic Fail-Safe)
   - 2.7 Database Layer: Neon Serverless PostgreSQL & Prisma 6.5 ORM

3. **Chapter 3: Detailed Step-by-Step User Operations Manual**
   - 3.1 Initial Launch & Environment Verification
   - 3.2 Navigating the Top Navigation Bar & Global Status Indicators
   - 3.3 Persona Switching & Role-Based Simulation
   - 3.4 Operational Walkthrough: Logging an Incident with AI Autopilot
   - 3.5 Operating the Jira-Style Kanban Board & Table Views
   - 3.6 Deep Dive: Operating the Interactive Ticket Detail Drawer
   - 3.7 Collaborating in Real-Time: Team Updates & AI Copilot Advisories
   - 3.8 Operating the Monitored Service & Application Catalog
   - 3.9 Operating the Engineering Team & Specialist Directory
   - 3.10 Operating the Remediation Task Board (Sub-Task Tracking)
   - 3.11 Operating the AI Autonomous Triage Hub & Testing Sandbox

4. **Chapter 4: Comprehensive Module-by-Module Technical Documentation**
   - 4.1 Module 1: Role-Based Access Control & User Identity
   - 4.2 Module 2: Monitored Service & Asset Catalog Engine
   - 4.3 Module 3: Dual-Core Autonomous AI Incident Triage Engine
   - 4.4 Module 4: Incident Ticketing & Lifecycle Management Engine
   - 4.5 Module 5: Ticket Collaboration & AI Copilot Engine
   - 4.6 Module 6: Remediation Task Tracking & Execution Engine
   - 4.7 Module 7: Operations Command Center & Executive Shift Briefing
   - 4.8 Module 8: AI Testing Sandbox & Neural Simulation
   - 4.9 Module 9: Backend REST API Architecture & Route Controllers
   - 4.10 Module 10: PostgreSQL Database Schema & Relational Integrity
   - 4.11 Module 11: Mobile Application for On-Call Rotations

5. **Chapter 5: Real-World Incident Case Studies (5 In-Depth Scenarios)**
   - 5.1 Case Study 1: Billing Microservice 504 Gateway Timeout (Backend Outage)
   - 5.2 Case Study 2: Next.js Client-Side SSR Hydration Mismatch (Frontend Defect)
   - 5.3 Case Study 3: Kubernetes Pod CrashLoopBackOff & OOMKilled 137 (DevOps Outage)
   - 5.4 Case Study 4: PostgreSQL Connection Pool Starvation (Database Outage)
   - 5.5 Case Study 5: JWT Key Rotation Stale CDN Cache Miss (Security Outage)

6. **Chapter 6: System Administration, Troubleshooting & Disaster Recovery**
   - 6.1 Database Scale-to-Zero Wakeup Latency Management
   - 6.2 Managing Windows File Locks during Prisma Client Generation
   - 6.3 Handling SLA Breaches and Emergency Escalations
   - 6.4 API Key Configuration (Google Gemini vs. Offline Fallback)

7. **Chapter 7: Academic Evaluation, Viva Defense & Architectural Q&A**
   - 7.1 Comprehensive Viva Questions & Model Technical Answers

---

# CHAPTER 1: Introduction, Problem Statement & Industry Context

### 1.1 The Operational Crisis in Modern Software Engineering
In enterprise software systems (such as high-frequency trading, ride-sharing algorithms, streaming platforms, and global SaaS), systems are composed of hundreds of decoupled microservices, frontend applications, distributed event buses (Kafka/RabbitMQ), and database clusters.

When a production defect or downtime occurs, every second of outage translates directly into financial loss, compliance penalties, and customer churn. Industry telemetry indicates:
- **Mean Time to Identify (MTTI)**: The time it takes to recognize that a problem has occurred and isolate which component broke.
- **Mean Time to Acknowledge (MTTA)**: The time it takes to assign the issue to an on-call engineer.
- **Mean Time to Resolve (MTTR)**: The time required to patch, deploy, and verify the hotfix.

In traditional setups, **MTTA often exceeds 30 to 60 minutes** simply because tickets sit in an unassigned inbox waiting for a human manager to manually inspect raw stacktraces, look up the on-call roster, and route the ticket.

### 1.2 The Failure of Legacy ITSM Tools
1. **Jira Software**: Excellent for planned sprint backlogs, but completely passive during live production fires. Jira does not understand stacktraces; it requires human operators to fill out dozens of required dropdowns.
2. **ServiceNow**: Extremely heavy enterprise ticketing tool designed for IT helpdesks (printers, laptop provisioning). Clunky, slow, and lacks developer-centric AI code remediation.
3. **PagerDuty**: Excellent for waking up engineers via SMS/phone calls, but provides no built-in root cause synthesis or code-level technical playbooks.

### 1.3 The WorkMate AI Paradigm
WorkMate AI unifies **ITSM ticketing**, **asset monitoring**, and **autonomous AI neural triage** into a single, high-performance operational cockpit:
- **Instant Microservice Identification**: The AI analyzes the error message or URL and immediately matches it against the company's registered application catalog.
- **Instant Engineering Routing**: Automatically bypasses human dispatchers and routes tickets directly to the exact team (Backend, Frontend, DevOps, Database, or QA) and on-call specialist.
- **Dynamic SLA Timers**: Automatically calculates countdown targets based on business criticality.
- **Automated Technical Playbooks**: Provides the assigned engineer with an immediate 3-to-5 step technical troubleshooting checklist before they even begin reading log files.

---

# CHAPTER 2: Technology Stack & Deep Implementation Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER                                   │
│  Next.js 15 (React 19) Web App          Expo React Native 57 Mobile Client   │
│  - SPA React Hooks (useState, etc.)     - Native iOS & Android APK           │
│  - Custom CSS Dark Glassmorphism        - Pull-to-Refresh & Offline Cache    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTP REST (JSON)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             API GATEWAY TIER                                 │
│  Node.js 22 + Express 4.21 + TypeScript 5.8 (Port 4000)                      │
│  - Modular Route Sub-Routers (/api/issues, /api/services, etc.)              │
│  - Runtime Schema Sanitization via Zod 3.24                                  │
│  - Centralized Error Handling & CORS Management                              │
└───────────────────────┬───────────────────────────────┬──────────────────────┘
                        │                               │
                        ▼                               ▼
┌───────────────────────────────────────────┐  ┌───────────────────────────────┐
│              AI COGNITIVE TIER            │  │        DATA PERSISTENCE       │
│  - Google Gemini 1.5 Flash Cloud LLM      │  │  - Neon Serverless PostgreSQL │
│  - Autonomous Heuristic Pattern Engine    │  │  - Prisma 6.5 Type-Safe ORM   │
│  - Automated Microservice & SLA Matcher   │  │  - PgBouncer Pooled Sockets   │
└───────────────────────────────────────────┘  └───────────────────────────────┘
```

### 2.1 Monorepo Workspace (pnpm)
The project utilizes `pnpm` workspaces configured via `pnpm-workspace.yaml`. This ensures that shared dependencies, TypeScript configs, and packages are deduplicated across `apps/api`, `apps/web`, and `apps/mobile`.

### 2.2 Client Layer: Next.js 15 & React 19
- **No Heavy CSS Frameworks**: Built using tailored CSS variables and design tokens (`globals.css`) implementing an **Obsidian Glassmorphism** aesthetic.
- **Sub-Second Reactive State**: Uses `useCallback` and `useState` for instant live filtering across hundreds of tickets without full-page reloads.

### 2.3 Backend API Layer: Express + TypeScript + Zod
- **Separation of Concerns**: Clean isolation between HTTP transport controllers (`src/routes/*.ts`) and core business domain logic (`src/services/*.ts`).
- **Zod Schema Validation**: Guarantees that invalid payloads (malformed emails, missing titles, invalid enums) fail fast at the gateway layer before touching database connections.

### 2.4 Dual-Core AI Architecture (100% Availability)
WorkMate AI implements an autonomous fail-safe architecture:
- **Primary Brain**: Calls the **Google Gemini 1.5 Flash API** using structured JSON response mode to parse complex, multi-line stacktraces.
- **Fail-Safe Brain**: If Gemini is offline, rate-limited, or unconfigured, an **internal deterministic heuristic engine** takes over in zero milliseconds. It analyzes domain vocabulary across 5 software verticals (Web, APIs, SRE, DB, Auth) to produce identical structured outputs.

### 2.5 Database Layer: Neon Serverless PostgreSQL + Prisma 6.5
- **Serverless PostgreSQL**: Cloud database hosted in AWS featuring scale-to-zero compute efficiency and automated branch snapshots.
- **PgBouncer Connection Pooling**: Prevents connection exhaustion when multiple client requests hit the server simultaneously.
- **Prisma 6.5**: Provides compile-time type safety across all queries, composite indexes on high-frequency filter columns, and automated schema migrations.

---

# CHAPTER 3: Detailed Step-by-Step User Operations Manual

This section explains **how to operate every single screen, tab, modal, and feature** of WorkMate AI.

---

### 3.1 Initial Launch & Environment Verification
Before operating the application, verify that the core services are active:
1. **API Server**: Listening on `http://localhost:4000`. Test via terminal:
   ```bash
   curl http://localhost:4000/health
   # Returns: {"ok":true,"service":"workmate-api"}
   ```
2. **Web Dashboard**: Open Google Chrome, Firefox, or Edge and navigate to:
   ```text
   http://localhost:3000
   ```

---

### 3.2 Navigating the Top Navigation Bar & Global Status Indicators
When you open `http://localhost:3000`, the top navigation bar displays:
- **Brand Title**: `WorkMate AI` with the cyan status pill `Enterprise v2.4`.
- **System Health Indicator**: Displays a glowing green dot `SYSTEMS OPERATIONAL` linked to the live microservice catalog.
- **User Profile & Persona Switcher**: Displays the currently active operator's name, role badge, and department.
- **Global Action Button**: The prominent purple button **`+ Log Incident Ticket`**.

---

### 3.3 Persona Switching & Role-Based Simulation
WorkMate AI supports multi-tenant role simulation. In the top-right header, click the **User Persona Dropdown**:

| Persona | Role Badge | Department | What this User Sees & Can Do |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | `👑 SUPER_ADMIN` | Executive & Platform Architecture | Global access. Can register new microservices in Tab 3, create new team members in Tab 4, and reassign tickets across all teams. |
| **Marcus Vance** | `MANAGER` | Backend & Core APIs | Department manager. Monitors backend incident queues, reassigns tickets, and tracks backend SLA compliance. |
| **David Kim** | `MANAGER` | DevOps & Cloud SRE | SRE manager. Oversees Kubernetes clusters, cloud infrastructure tickets, and Terraform tasks. |
| **Alex Rivera** | `ENGINEER` | Frontend & Mobile Engineering | Senior Software Engineer. Works on web portal hydration bugs, opens ticket drawer, and posts code updates. |
| **Priya Sharma** | `ENGINEER` | Database & Platform Infrastructure | Data specialist. Executes SQL index migrations, PgBouncer pool tuning, and resolves connection leaks. |
| **Elena Rostova** | `USER` | QA & Reliability Engineering | QA Lead. Logs new defects, tests hotfixes, and verifies resolutions before closure. |

---

### 3.4 Operational Walkthrough: Logging an Incident with AI Autopilot

Follow these steps to log a production software bug and observe the autonomous AI triage engine:

```text
[Step 1: Click Button] ────────► [Step 2: Enter Title] ────────► [Step 3: Paste Error]
     "+ Log Incident Ticket"          "HTTP 504 Gateway Timeout       "Payment microservice dropped
                                       during checkout"               45 customer transactions..."
                                                                               │
                                                                               ▼
[Step 6: Live Dashboard Update] ◄── [Step 5: Database Commit] ◄── [Step 4: Click Submit]
 Kanban card created, SLA timer      Saved to Neon PostgreSQL         "✨ WorkMate AI Auto-Pilot"
 active, team workload bar updated    with linked service & assignee   analyzes and routes ticket
```

1. Click **`+ Log Incident Ticket`** in the top navigation bar.
2. The **Incident Logging Modal** opens.
3. **Incident Title / Symptom**: Type:
   ```text
   HTTP 504 Gateway Timeout during checkout on /api/v1/billing/charge
   ```
4. **Affected Application / Service**:
   - Leave on: **`✨ Auto-Recognize with WorkMate AI`**.
   - *(Alternatively, you can manually select a service from the dropdown)*.
5. **Responsible Engineering Team**:
   - Leave on: **`✨ Auto-Route with WorkMate AI`**.
6. **Priority Assessment**:
   - Select **`URGENT`** (or leave it to AI to infer from symptoms).
7. **Detailed Symptoms, Error Logs & URL**: Paste:
   ```text
   Downstream merchant banking gateway TCP socket hang causing worker pool starvation. Over 45 customer transactions dropped in the last 10 minutes. Redis retry queue backlogged.
   ```
8. **AI Autopilot Checkbox**: Ensure **`✨ WorkMate AI Auto-Pilot`** is checked.
9. Click **`Submit Incident`**.
10. **The Result**:
    - The modal closes.
    - The ticket is immediately assigned ticket number `#16`.
    - WorkMate AI automatically matched the ticket to the **Billing & Payment Gateway API**.
    - It routed the incident to the **Backend & Core APIs** department and assigned lead engineer **Marcus Vance**.
    - It set a **15-minute SLA deadline** and synthesized a 3-step technical action checklist!

---

### 3.5 Operating the Jira-Style Kanban Board & Table Views

Click on **Tab 2: Ticketing Tool** in the dashboard.

#### 1. Switching Views:
- Click the **`Kanban Board`** button to view visual columns:
  - **OPEN**: Unassigned tickets waiting for initial review.
  - **ASSIGNED**: Allocated to a designated engineer, pending remediation.
  - **IN REMEDIATION**: Engineer is actively coding, patching, or testing a fix.
  - **RESOLVED**: Hotfix deployed and validated; pending final closure.
  - **CLOSED**: Fully verified and archived.
- Click the **`Table View`** button to switch to a dense, compact tabular list ideal for scanning dozens of tickets simultaneously.

#### 2. Using the Multi-Filter Bar:
- **Search Bar**: Type any keyword (e.g., `checkout`, `hydration`, `OOMKilled`, `Postgres`). The cards filter in real-time as you type.
- **Department Filter**: Click the dropdown to isolate tickets belonging exclusively to:
  - *All Engineering Teams*
  - *Backend & Core APIs*
  - *Frontend & Mobile Engineering*
  - *DevOps & Cloud SRE*
  - *Database & Platform Infrastructure*
  - *QA & Reliability Engineering*
- **Status Filter**: View only active, in-remediation, or closed tickets.
- **Priority Filter**: Isolate `URGENT` or `HIGH` priority tickets requiring immediate response.

---

### 3.6 Deep Dive: Operating the Interactive Ticket Detail Drawer

Click on any ticket card on the Kanban board or row in the Table view. An interactive sliding drawer opens from the right side of the screen.

```text
┌─────────────────────────────────────────────────────────────┐
│ TICKET #16 — DETAIL & COLLABORATION DRAWER                  │
├─────────────────────────────────────────────────────────────┤
│ Title: HTTP 504 Gateway Timeout during checkout             │
│ Priority: [ URGENT ]   Department: [ Backend & Core APIs ]  │
│ SLA Deadline: 14 mins remaining [ GREEN ]                   │
├─────────────────────────────────────────────────────────────┤
│ 🧠 AI DIAGNOSTIC & REMEDIATION PLAYBOOK                      │
│ Summary: Downstream merchant banking TCP socket hang...     │
│ Root Cause: Worker pool starvation on Node.js event loop... │
│ Confidence: 96%                                             │
│ Action Plan:                                                │
│   1. Engage circuit breaker to secondary Stripe rail.       │
│   2. Scale payment worker pods to 12 replicas.              │
│   3. Increase downstream socket timeout to 5000ms.          │
├─────────────────────────────────────────────────────────────┤
│ LIFECYCLE & ASSIGNEE CONTROLS                               │
│ Status:   [ IN_PROGRESS ▼ ]                                 │
│ Assignee: [ Marcus Vance (Backend Lead) ▼ ]                 │
├─────────────────────────────────────────────────────────────┤
│ 💬 COLLABORATION & UPDATES (3)                              │
│ • Marcus Vance: "Circuit breaker activated. Drop rate <0.1%"│
│ • 🤖 AI Advisory: "Upstream fiber outage confirmed in AWS"  │
│ [ Type update or remediation notes... ] [ Post ]            │
└─────────────────────────────────────────────────────────────┘
```

1. **Review AI Diagnostics**: Read the AI summary, verified root cause, and suggested action checklist.
2. **Update Status**: Click the **Status Dropdown** to move the ticket from `ASSIGNED` ➔ `IN_PROGRESS` ➔ `RESOLVED`.
3. **Reassign Lead**: Click the **Assigned Specialist Dropdown** to transfer ownership to another engineer if escalation is needed.
4. **Post Updates**: Type notes into the comment box and click **`Post`** to log permanent technical updates.

---

### 3.7 Collaborating in Real-Time: Team Updates & AI Copilot Advisories
In the **Collaboration & Updates** thread:
- **Human Engineer Comments**: Displayed with standard author avatars, names, and timestamps (e.g., *"Circuit breaker activated. 80% traffic now flowing through Stripe"*).
- **🤖 WorkMate AI Advisories**: Highlighted in distinctive **AI Purple Glassmorphism** borders (`rgba(168, 85, 247, 0.25)`). These represent autonomous telemetry updates generated by the AI engine when external dependencies (like AWS or merchant banks) report status changes.

---

### 3.8 Operating the Monitored Service & Application Catalog

Click on **Tab 3: Service Catalog** in the dashboard.
- **Service Cards**: Each card displays the microservice name, type badge (`API_SERVICE`, `WEB_APP`, `CLOUD_INFRA`, `DATABASE`), responsible team, and SLA target.
- **Health Indicators**:
  - `🟢 OPERATIONAL`: Zero high-priority tickets active.
  - `🟡 DEGRADED`: Active high/urgent tickets under remediation.
  - `🔴 OUTAGE`: Critical failure; service unavailable.
- **Registering a New Microservice (SuperAdmin)**:
  1. Switch user to **Sarah Chen (SUPER_ADMIN)**.
  2. Click the **`+ Register Service / App`** button.
  3. Enter Name: `Real-time Notification Webhook API`.
  4. Enter Slug: `notification-webhook-api`.
  5. Select System Type: `API_SERVICE`.
  6. Select Responsible Team: `Backend & Core APIs`.
  7. Set SLA Target: `30 minutes`.
  8. Click **`Register Service`**.

---

### 3.9 Operating the Engineering Team & Specialist Directory

Click on **Tab 4: Team Directory** in the dashboard.
- Displays all software engineers, SREs, managers, and QA leads.
- Shows their avatar, email, department, and role badge.
- **Active Workload Counters**: Displays the exact number of active incident tickets and remediation tasks assigned to each engineer.
- **Creating a Team Member (SuperAdmin)**:
  1. Switch user to **Sarah Chen (SUPER_ADMIN)**.
  2. Click **`+ Add Team Member`**.
  3. Enter Name, Email, Engineering Role, and Department.
  4. Click **`Create Team Member`**.

---

### 3.10 Operating the Remediation Task Board (Sub-Task Tracking)

Click on **Tab 5: Tasks** in the dashboard.
- Displays granular engineering sub-tasks linked to parent tickets.
- **Single-Click Completion**: Click on any task checkbox to instantly toggle between `TODO`, `IN_PROGRESS`, and `DONE`.
- **Velocity Tracking**: Completing tasks updates the global **Completion Velocity Percentage** on the operations dashboard in real-time.

---

### 3.11 Operating the AI Autonomous Triage Hub & Testing Sandbox

Click on **Tab 6: AI Intelligence Hub** in the dashboard.
This tab is an **interactive neural simulation sandbox**. It allows developers, evaluators, and examiners to test the AI engine on any arbitrary error input without creating permanent database records:

1. In the left card (**Real-time Service & Incident Triage Sandbox**):
   - **Incident Symptom**: Type: `Kafka consumer pod crashed with exit code 137 OOMKilled`.
   - **Cluster / Location**: Type: `k8s://us-east-2.production/worker-pool-a`.
   - **Stacktrace**: Type: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.
2. Click **`✨ Run Autonomous AI Diagnosis`**.
3. **Observe the Instant Output** in the right panel:
   - **Priority**: `URGENT`
   - **Category**: `SOFTWARE`
   - **Auto-Recognized Application**: `Cloud Kubernetes Production Cluster`
   - **Responsible Team**: `DevOps & Cloud SRE`
   - **Technical Root Cause**: Node.js memory retention leak during batch JSON uncompression.
   - **Remediation Plan**:
     1. Patch Helm memory ceiling from 2Gi to 4Gi.
     2. Apply backpressure rate limiting on Kafka consumer batch size.
     3. Take Node.js heap dump to isolate uncollected buffer references.

---

# CHAPTER 4: Comprehensive Module-by-Module Technical Documentation

---

### 4.1 Module 1: Role-Based Access Control (RBAC) & User Identity
- **Source Files**: [schema.prisma](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/prisma/schema.prisma#L11), [user.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/user.routes.ts), [page.tsx](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/web/src/app/page.tsx#L6).
- **Core Logic**: Enforces organizational boundaries through `enum Role`:
  ```prisma
  enum Role {
    SUPER_ADMIN
    ADMIN
    MANAGER
    ENGINEER
    USER
  }
  ```
- **Permission Matrix**:

| Operation | `SUPER_ADMIN` | `ADMIN` | `MANAGER` | `ENGINEER` | `USER` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Log Incident Ticket | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change Ticket Status | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reassign Ticket Lead | ✅ | ✅ | ✅ | ❌ | ❌ |
| Post Comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Toggle Tasks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Register Microservice | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add Team Member | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### 4.2 Module 2: Monitored Service & Asset Catalog Engine
- **Source Files**: [schema.prisma](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/prisma/schema.prisma#L64), [service.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/service.routes.ts).
- **Data Model**:
  ```prisma
  model ServiceAsset {
    id            String   @id @default(cuid())
    name          String
    slug          String   @unique
    type          String   // WEB_APP, API_SERVICE, MOBILE_APP, CLOUD_INFRA, DATABASE
    department    String   // Backend & Core APIs, DevOps & Cloud SRE, etc.
    environment   String   @default("PRODUCTION")
    healthStatus  String   @default("OPERATIONAL") // OPERATIONAL, DEGRADED, OUTAGE
    slaTargetMins Int      @default(60)
    urlOrLocation String?
    description   String?
    issues        Issue[]
  }
  ```
- **Active Incident Aggregation**: When querying `/api/services`, Prisma executes an optimized subquery counting only non-resolved issues (`status NOT IN ['RESOLVED', 'CLOSED']`), updating the service's health badge automatically.

---

### 4.3 Module 3: Dual-Core Autonomous AI Incident Triage Engine
- **Source Files**: [ai.service.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/services/ai.service.ts), [ai.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/ai.routes.ts).
- **Architecture**:
  ```typescript
  export class AiService {
    static async triageIssue(title, description, category, location, affectedUrl) {
      if (this.geminiApiKey) {
        try {
          return await this.callGeminiTriage(...);
        } catch (err) {
          console.warn("Gemini offline, falling back to autonomous heuristic engine");
        }
      }
      return this.heuristicTriage(...);
    }
  }
  ```
- **Heuristic Pattern Engine**: Uses regular expression lexical clustering across high-dimensional software categories:
  - *Billing / Fintech*: `payment|checkout|billing|invoice|stripe|504 gateway|webhook` ➔ Maps to `asset-payment-api`, Department: `Backend & Core APIs`, SLA: 15m.
  - *Frontend / Web*: `portal|web app|dashboard|react|next\.js|frontend|hydration|css|bundle` ➔ Maps to `asset-web-portal`, Department: `Frontend & Mobile Engineering`, SLA: 30m.
  - *Auth / Security*: `auth|jwt|token|login|jwks|oauth|session|401|403` ➔ Maps to `asset-auth-service`, Department: `Backend & Core APIs`, SLA: 15m.
  - *DevOps / SRE*: `k8s|kubernetes|pod|crashloop|oom|docker|container|helm|terraform` ➔ Maps to `asset-k8s-cluster`, Department: `DevOps & Cloud SRE`, SLA: 30m.
  - *Database / Postgres*: `postgres|database|prisma|sql|pool|deadlock|slow query|replica` ➔ Maps to `asset-postgres-db`, Department: `Database & Platform Infrastructure`, SLA: 30m.

---

### 4.4 Module 4: Incident Ticketing & Lifecycle Engine
- **Source Files**: [schema.prisma](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/prisma/schema.prisma#L101), [issue.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/issue.routes.ts), [issue.service.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/services/issue.service.ts).
- **SLA Calculation Equation**:
  ```typescript
  const slaTargetMinutes = triageResult.slaTargetMinutes || 60;
  const slaDeadline = new Date(Date.now() + slaTargetMinutes * 60 * 1000);
  ```
- **Database Index Optimization**: To support sub-millisecond filtering across thousands of tickets, `schema.prisma` applies composite B-Tree indexes:
  ```prisma
  @@index([status, priority])
  @@index([department])
  @@index([ticketNumber])
  @@index([serviceAssetId])
  ```

---

### 4.5 Module 5: Ticket Collaboration & AI Copilot Engine
- **Source Files**: [schema.prisma](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/prisma/schema.prisma#L140), [issue.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/issue.routes.ts#L80).
- **Data Model**:
  ```prisma
  model Comment {
    id            String   @id @default(cuid())
    content       String
    isAiGenerated Boolean  @default(false)
    issueId       String
    issue         Issue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
    authorId      String
    author        User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
    createdAt     DateTime @default(now())
  }
  ```
- When `isAiGenerated = true`, the web UI applies custom purple glassmorphism styling and prepends the title with `🤖 WorkMate AI Advisory`.

---

### 4.6 Module 6: Remediation Task Tracking Engine
- **Source Files**: [schema.prisma](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/prisma/schema.prisma#L82), [task.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/task.routes.ts), [task.service.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/services/task.service.ts).
- Allows granular remediation steps to be tracked, toggled, and linked to parent issues with automatic cascade delete rules (`onDelete: Cascade`).

---

### 4.7 Module 7: Operations Command Center & Executive Shift Briefing
- **Source Files**: [stats.service.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/services/stats.service.ts), [stats.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/stats.routes.ts).
- **Aggregated Metrics**: Queries the database in parallel using `Promise.all`:
  - Total tickets, open tickets, in-progress tickets, resolved tickets.
  - Active urgent and high-priority tickets.
  - SLA breach counts.
  - Task completion velocity:
    $$\text{Velocity} = \left(\frac{\text{Completed Tasks}}{\text{Total Tasks}}\right) \times 100\%$$

---

### 4.8 Module 8: AI Testing Sandbox Engine
- **Source Files**: [ai.routes.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/routes/ai.routes.ts), [page.tsx](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/web/src/app/page.tsx#L1184).
- Accepts POST requests on `/api/ai/triage` with arbitrary error strings, executes the neural classification pipeline in-memory, and returns diagnostic JSON without writing to PostgreSQL.

---

### 4.9 Module 9: Backend REST API Architecture
- **Source Files**: [server.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/server.ts), [app.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/api/src/app.ts).
- Configured with `cors()` enabling secure API consumption from Next.js (`http://localhost:3000`) and mobile devices.

---

### 4.10 Module 10: PostgreSQL Database Schema & Relational Integrity
- **Database Engine**: PostgreSQL on Neon Cloud.
- **Relational Integrity**: Enforced via foreign key constraints, unique email constraints, unique service slug constraints, and cascade delete rules.

---

### 4.11 Module 11: Mobile Application for On-Call Rotations
- **Source Files**: [apps/mobile/src/app/index.tsx](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/mobile/src/app/index.tsx), [apps/mobile/src/lib/api.ts](file:///d:/E/DRIVE/Project/MCA/WorkMate_AI_Full_Stack_Project_Guide/WorkMate_AI/apps/mobile/src/lib/api.ts).
- Built with React Native and Expo Router. Connects to `http://localhost:4000/api` to render a native mobile interface for on-call engineers.

---

# CHAPTER 5: Real-World Incident Case Studies (5 In-Depth Scenarios)

---

### 5.1 Case Study 1: Billing Microservice 504 Gateway Timeout (Backend Outage)
- **Symptom**: During flash sale checkout, customers receive `504 Gateway Timeout`. Over 45 customer transactions drop in 10 minutes.
- **AI Recognition**: Matches keyword `504 gateway` and `checkout` to `Billing & Payment Gateway API`.
- **Assigned Team**: `Backend & Core APIs` (Marcus Vance).
- **Assigned Priority**: `URGENT` (15-minute SLA).
- **AI Suggested Playbook**:
  1. Engage circuit breaker to divert 80% checkout volume to secondary Stripe rail.
  2. Scale payment worker pods to 12 replicas in Kubernetes.
  3. Increase downstream HTTP socket timeout to 5000ms with exponential backoff.
- **Resolution**: Circuit breaker activated; dropped transaction rate returned to `<0.1%`.

---

### 5.2 Case Study 2: Next.js Client-Side SSR Hydration Mismatch (Frontend Defect)
- **Symptom**: Analytics dashboard loads as a blank white screen on Chrome and Firefox. Console displays: *`Hydration failed because the initial UI does not match what was rendered on the server`*.
- **AI Recognition**: Matches keyword `hydration` and `UI` to `Customer Operations Web Portal`.
- **Assigned Team**: `Frontend & Mobile Engineering` (Alex Rivera).
- **Assigned Priority**: `HIGH` (45-minute SLA).
- **AI Suggested Playbook**:
  1. Wrap dynamic client-only date components with `dynamic(() => import(...), { ssr: false })`.
  2. Invalidate Cloudflare edge HTML cache.
  3. Run Cypress regression suite.
- **Resolution**: Dynamic import hotfix applied; SSR hydration restored.

---

### 5.3 Case Study 3: Kubernetes Pod CrashLoopBackOff & OOMKilled 137 (DevOps Outage)
- **Symptom**: Kafka batch webhook ingestion worker pods continually crashing with exit code 137 (OOMKilled).
- **AI Recognition**: Matches keyword `pod`, `CrashLoopBackOff`, and `OOMKilled` to `Cloud Kubernetes Production Cluster`.
- **Assigned Team**: `DevOps & Cloud SRE` (David Kim).
- **Assigned Priority**: `HIGH` (35-minute SLA).
- **AI Suggested Playbook**:
  1. Patch Helm deployment memory limit from 2Gi to 4Gi.
  2. Implement stream backpressure throttling on incoming webhook queue.
  3. Take Node.js heap dump to isolate uncollected buffer retentions.
- **Resolution**: Memory limit patched and stream backpressure enabled; pods stabilized at 0 restarts.

---

### 5.4 Case Study 4: PostgreSQL Connection Pool Starvation (Database Outage)
- **Symptom**: API endpoints throwing *`Timed out fetching a connection from the pool`*. Active client connections capped at 100/100.
- **AI Recognition**: Matches keyword `connection from the pool` and `PostgreSQL` to `Neon PostgreSQL Primary Cluster`.
- **Assigned Team**: `Database & Platform Infrastructure` (Priya Sharma).
- **Assigned Priority**: `URGENT` (30-minute SLA).
- **AI Suggested Playbook**:
  1. Query `pg_stat_activity` and execute `pg_terminate_backend()` on idle-in-transaction connections.
  2. Add missing composite B-Tree index on `(department, createdAt)` concurrently.
  3. Increase PgBouncer pool limits in Neon dashboard.
- **Resolution**: Missing index added; sequential scan latency dropped from 12s to 4ms, freeing connection sockets.

---

### 5.5 Case Study 5: JWT Key Rotation Stale CDN Cache Miss (Security Outage)
- **Symptom**: Mobile app users unexpectedly logged out after 15 minutes. Key rotation JWKS endpoint returning stale 404 cache responses on secondary edge regions.
- **AI Recognition**: Matches keyword `JWT`, `token`, and `JWKS` to `Auth & Identity Gateway (OAuth/JWT)`.
- **Assigned Team**: `Backend & Core APIs` (Alex Rivera).
- **Assigned Priority**: `MEDIUM` (60-minute SLA).
- **AI Suggested Playbook**:
  1. Flush stale Redis JWKS public key cache.
  2. Enforce `Cache-Control: max-age=300` on Cloudflare CDN edge rules.
  3. Synchronize public key rotation grace period to 1 hour across all regions.
- **Resolution**: Stale CDN cache purged; mobile authentication sessions restored.

---

# CHAPTER 6: System Administration, Troubleshooting & Disaster Recovery

### 6.1 Neon Database Scale-to-Zero Wakeup Latency
- **Behavior**: If inactive for more than 5 minutes, Neon serverless compute suspends to zero. The first subsequent request may take 1 to 2 seconds to warm up the database container.
- **Remedy**: The Express server includes connection retry logic that automatically handles the initial cold-start delay.

### 6.2 Managing Windows File Locks during Prisma Client Generation
- **Behavior**: On Windows systems, when the API server (`node dist/server.js`) is actively running, Windows places a mandatory file lock on `query_engine-windows.dll.node`. Running `prisma generate` while the server is active can result in `EPERM: operation not permitted`.
- **Remedy**: Always stop the running server before regenerating the client, or run `pnpm --filter @workmate/api build` after code changes.

### 6.3 Handling SLA Breaches and Emergency Escalations
- When a ticket exceeds its `slaDeadline` without being moved to `RESOLVED`, the system automatically marks `slaBreached = true`.
- The countdown badge flashes a red **`SLA BREACHED`** alert, alerting the Engineering Manager to reassign or escalate the ticket immediately.

---

# CHAPTER 7: Academic Evaluation, Viva Defense & Architectural Q&A

### Q1: What is the primary problem WorkMate AI solves that existing tools like Jira or ServiceNow cannot?
**Answer**: Existing tools are static databases that require human operators to manually read error logs, deduce the responsible microservice, look up on-call rosters, assign tickets, and research fixes. WorkMate AI introduces an **autonomous AI triage engine** that instantly recognizes the microservice, routes to the exact engineering team, calculates the SLA deadline, and generates a concrete 3-step technical remediation plan automatically.

### Q2: Why did you choose a Monorepo architecture instead of separate Git repositories?
**Answer**: A pnpm monorepo allows atomic commits across the backend API, web dashboard, and mobile client. It prevents schema drift between the database models, API responses, and frontend types while drastically simplifying local developer setup.

### Q3: Explain the dual-core hybrid AI design. Why not rely solely on OpenAI or Google Gemini?
**Answer**: In enterprise software operations, an incident ticketing system must have 100% uptime. If an external LLM API experiences an outage, rate limit, or network block, relying solely on an external API would take the entire ticketing system down. WorkMate AI solves this with a **deterministic heuristic fail-safe engine** that activates in zero milliseconds if Gemini is unavailable, guaranteeing that tickets are always triaged and routed.

### Q4: How is data validation handled, and why is Zod important?
**Answer**: TypeScript types only exist at compile time and disappear after JavaScript compilation. Zod provides **runtime validation** at the API gateway layer. It parses and validates request payloads against strict schemas before any database queries execute, preventing SQL injection, malformed data, or unexpected server crashes.

### Q5: Explain the database indexing strategy implemented in Prisma.
**Answer**: High-frequency filter queries on the Kanban board (filtering by department, status, priority, and ticket number) are backed by composite B-Tree indexes: `@@index([status, priority])`, `@@index([department])`, and `@@index([ticketNumber])`. This ensures that search queries execute in $O(\log N)$ time rather than requiring expensive sequential table scans.

---
*WorkMate AI — Master Full-Stack Project Documentation. All rights reserved.*
