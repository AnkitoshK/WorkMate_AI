# WorkMate AI — Simple, Complete Project Guide & User Manual
*(Easy-to-Understand Guide for Everyone: Architecture, Tech Stack, Flow & How to Use It)*

---

## 🌟 1. What is WorkMate AI in Simple Words?

Imagine you work at a software company like Netflix, Uber, or Amazon. 
You have hundreds of systems:
- A **Web Portal** where users browse.
- A **Payment API** that charges credit cards.
- A **Database** that stores user data.
- A **Kubernetes Cloud Cluster** that runs everything.

### The Real-World Problem:
When something breaks (for example: **"Payments are failing with 504 Gateway Timeout"**):
1. Support agents don't know which engineer created that code.
2. Tickets sit in a queue for hours waiting for someone to manually read them.
3. Once assigned, the engineer has to spend 30 minutes reading logs to figure out what went wrong.

### The WorkMate AI Solution:
**WorkMate AI is an intelligent software ticketing system (like Jira + PagerDuty), but powered by AI.**
As soon as you paste an error message, URL, or stacktrace:
1. **AI instantly recognizes the affected software**: *"This is the Billing & Payment API!"*
2. **AI routes it to the right team**: *"Assign this to Marcus Vance in the Backend & Core APIs team!"*
3. **AI calculates the urgency & SLA**: *"Urgent! Must be resolved within 15 minutes before we breach customer SLA."*
4. **AI writes the technical fix for you**: *"Step 1: Turn on secondary Stripe rail. Step 2: Scale Kubernetes pods to 12 replicas. Step 3: Check socket timeouts."*

---

## 🏗️ 2. Tech Stack Explained — What We Used & How Deep We Used It

We used modern, industry-standard technologies. Here is how deep each technology goes:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                                 │
│                                                                          │
│    Next.js 15 (React 19) Web Dashboard     Expo React Native Mobile App  │
│    (Port 3000 - Rich Glassmorphism UI)      (Runs on Android / iOS)      │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │  HTTP REST (JSON)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            API SERVER LAYER                              │
│                                                                          │
│                    Node.js + Express.js + TypeScript                     │
│                    (Port 4000 - Strict Zod Validation)                   │
└───────────────────┬──────────────────────────────────┬───────────────────┘
                    │                                  │
                    ▼                                  ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────┐
│             AI BRAIN LAYER           │  │          DATABASE LAYER        │
│                                      │  │                                │
│  - Google Gemini 1.5 Flash (LLM)     │  │  - Neon Serverless PostgreSQL  │
│  - Built-in Autonomous Engine        │  │  - Prisma 6 ORM                │
│  - Incident Pattern Matcher          │  │  - Real-time Cloud Connection  │
└──────────────────────────────────────┘  └────────────────────────────────┘
```

---

### Layer 1: The User Interface (Frontend & Mobile)

#### 1. Next.js 15 & React 19 (Web Dashboard)
- **What it is**: The most popular modern web framework built on top of React.
- **How deep we used it**:
  - We built a full **Single Page Application (SPA)** with real-time state management (`useState`, `useEffect`, `useCallback`).
  - Integrated a **Jira-style Kanban Board** with 5 progress columns (*Open*, *Assigned*, *In Remediation*, *Resolved*, *Closed*) as well as a compact **Table View**.
  - Built an **Operations Command Center** with live SLA compliance bars, priority counters, and department workload distribution.
  - Implemented **Dark Glassmorphism Styling** using curated CSS tokens (no generic frameworks), featuring sleek gradients (`#6366f1` Indigo, `#06b6d4` Cyan, `#a855f7` AI Purple) and interactive micro-animations.

#### 2. Expo & React Native (Mobile App)
- **What it is**: A cross-platform framework that compiles React code into native mobile apps for iOS and Android.
- **How deep we used it**:
  - Used for **on-call engineers** who are away from their computers.
  - Pulls live tickets and tasks from the API with pull-to-refresh.
  - Allows engineers to toggle remediation tasks directly from their phones with instant sync back to the database.

---

### Layer 2: The Backend Server (API Layer)

#### 1. Node.js & Express.js with TypeScript
- **What it is**: High-performance backend runtime and web server.
- **How deep we used it**:
  - Built with **100% TypeScript** with strict type-checking (no `any` types in route schemas).
  - Configured modular routes:
    - `/api/issues`: Create, list, filter, update status, assign, and add comments to tickets.
    - `/api/services`: Manage catalog of monitored microservices and applications.
    - `/api/users`: Manage team members and role permissions.
    - `/api/tasks`: Manage engineering action checklists linked to tickets.
    - `/api/stats`: Compute real-time analytics (SLA breaches, velocity, workload).
    - `/api/ai`: Autonomous AI triage and shift summaries.

#### 2. Zod (Input Validation & Security)
- **What it is**: TypeScript-first schema declaration and validation library.
- **How deep we used it**:
  - Every incoming API request (POST/PATCH) is rigorously validated by Zod before touching the database.
  - If someone sends an invalid email, an empty ticket title, or a wrong role, Zod immediately catches it with clear error messages.

---

### Layer 3: The AI Brain (Autonomous Triage Engine)

#### 1. Dual-Core AI Architecture:
WorkMate AI uses a **hybrid AI design** so that it **never fails**, even if external API limits or internet issues occur:
- **Core A (Google Gemini 1.5 Flash)**: When a `GEMINI_API_KEY` is present, it calls Google's latest multimodal LLM with structured JSON output mode to read the error and formulate complex solutions.
- **Core B (Built-in Heuristic Neural Engine)**: If the Gemini key is absent or offline, an intelligent fallback engine activates automatically. It analyzes keywords, URLs, and stacktraces using pattern classification to detect the exact microservice, team, SLA, and step-by-step fix.

#### 2. What the AI actually outputs:
When you submit an error, the AI outputs a complete JSON payload:
```json
{
  "detectedServiceName": "Billing & Payment Gateway API",
  "detectedDepartment": "Backend & Core APIs",
  "recommendedAssignee": "Marcus Vance",
  "predictedPriority": "URGENT",
  "slaTargetMinutes": 15,
  "summary": "Downstream payment acquirer TCP socket timeout causing thread pool starvation.",
  "rootCause": "Merchant acquiring bank TCP socket hang causing Node.js event loop latency spike.",
  "suggestedAction": "1. Engage circuit breaker to divert traffic to secondary Stripe rail.\n2. Scale payment worker pods to 12 replicas.\n3. Increase downstream socket timeout to 5000ms."
}
```

---

### Layer 4: The Database & ORM (Data Layer)

#### 1. Neon Serverless PostgreSQL
- **What it is**: Modern, cloud-native serverless PostgreSQL.
- **How deep we used it**:
  - Hosted in the AWS cloud with automatic scale-to-zero and high availability.
  - Uses connection pooling (`PgBouncer`) for fast serverless queries.

#### 2. Prisma 6 (ORM - Object Relational Mapper)
- **What it is**: Type-safe database toolkit that translates TypeScript objects into efficient SQL queries.
- **How deep we used it**:
  - Defined 5 relational models with foreign keys and cascade rules:
    - `User`: Team members with roles (`SUPER_ADMIN`, `MANAGER`, `ENGINEER`, `USER`).
    - `ServiceAsset`: Monitored microservices, web apps, and databases.
    - `Issue`: The tickets themselves, storing AI summaries, SLA deadlines, and status.
    - `Task`: Specific engineering checklist items linked to tickets.
    - `Comment`: Conversation thread on each ticket (including human comments and AI Copilot updates).

---

## 🔄 3. Complete End-to-End Life of a Ticket (The Flow)

Here is exactly what happens behind the scenes from the moment an error occurs until it is fixed:

```text
[Step 1: Error Occurs]
    An engineer or automated monitor notices:
    "HTTP 504 Gateway Timeout during checkout on /api/v1/billing/charge"
        │
        ▼
[Step 2: User Submits Ticket via Web UI]
    User opens "+ Log Incident Ticket", types the title, pastes error logs,
    and checks "✨ WorkMate AI Auto-Pilot".
        │
        ▼
[Step 3: Frontend calls Backend API]
    POST http://localhost:4000/api/issues
    Payload: { title, description, runAiTriage: true }
        │
        ▼
[Step 4: AI Service Intervenes]
    AiService.triageIssue() analyzes text:
    - Finds keywords: "504", "checkout", "billing"
    - Recognizes service: "Billing & Payment Gateway API"
    - Routes to team: "Backend & Core APIs"
    - Assigns on-call: "Marcus Vance"
    - Sets Priority: "URGENT"
    - Computes SLA deadline: Current Time + 15 minutes!
    - Generates 3-step technical action plan!
        │
        ▼
[Step 5: Saved to Neon PostgreSQL via Prisma]
    Database writes:
    - New Issue record with ticketNumber: #16
    - Link to ServiceAsset: asset-payment-api
    - Link to Assignee: marcus-manager
    - Link to Reporter: logged-in user
        │
        ▼
[Step 6: Real-time UI Update]
    - The Kanban board adds the card under "IN PROGRESS".
    - The Department Workload bar for "Backend & Core APIs" increments.
    - If SLA is close to expiring, the countdown badge flashes red.
        │
        ▼
[Step 7: Engineer Resolves Ticket]
    Marcus Vance opens the ticket drawer, reads the AI action plan,
    posts a comment: "Circuit breaker enabled, drop rate <0.1%",
    and moves status to "RESOLVED".
```

---

## 📖 4. Simple User Manual — How to Use the App

### Feature 1: Role Persona Switching
At the top-right of the dashboard, you will see a user dropdown:
- **Sarah Chen (`SUPER_ADMIN`)**: VP of Engineering. Has access to register new microservices and invite team members.
- **Marcus Vance (`MANAGER`)**: Backend Tech Lead. Manages backend incidents.
- **Alex Rivera (`ENGINEER`)**: Software Engineer. Works on frontend/mobile tickets.
- **Elena Rostova (`USER`)**: QA Lead. Submits bugs and verifies fixes.
*(Switching personas allows you to test the app from different perspectives!)*

### Feature 2: Logging a Bug with AI Autopilot & 5 Core Projects
1. Click **`+ Log Incident Ticket`** (top right).
2. Choose from the **5 Predefined System Projects** using the visual cards or dropdown:
   - 🌐 *Customer Operations Web Portal*
   - 💳 *Billing & Payment Gateway API*
   - 🔐 *Auth & Identity Gateway*
   - ☸️ *Cloud Kubernetes Production Cluster*
   - 🐘 *Neon PostgreSQL Primary Cluster*
   *(Or click **🤖 AI Auto-Detect** to let the AI automatically identify the service)*
3. Enter the title: e.g. `React blank screen on /analytics`.
4. Paste an error log: e.g. `Hydration failed because server HTML did not match client`.
5. Keep **`✨ WorkMate AI Auto-Pilot`** checked.
6. Click **`Submit Incident`**.
7. **Watch the magic**: The ticket is instantly categorized, attributed to the chosen project, auto-routed to the responsible squad and engineer, assigned a strict SLA deadline, and populated with a step-by-step technical fix!

### Feature 3: Using the Jira Kanban Board
- Click the **`Ticketing Tool`** tab.
- Click **`Kanban Board`** to see cards divided into columns:
  - **Open**: New unassigned tickets.
  - **Assigned**: Assigned to an engineer, pending remediation.
  - **In Remediation**: Engineer is actively coding a fix.
  - **Resolved**: Fix deployed to staging/production.
  - **Closed**: Verified and completed.
- Use the **Department Filter** dropdown to view only *Backend*, *Frontend*, or *DevOps* tickets.

### Feature 4: Viewing the AI Diagnostic & Adding Comments
1. Click on any ticket card.
2. An interactive drawer opens from the right.
3. You will see:
   - **AI Diagnostic Summary**: What broke in plain language.
   - **Root Cause**: The technical trigger (e.g. unindexed query or memory leak).
   - **Suggested Action Plan**: Step 1, 2, 3 checklist.
4. Scroll down to **Collaboration & Updates**:
   - Type an update: *"Deployed hotfix to production"* and click **Post**.
   - Your comment appears immediately in the timeline!

### Feature 5: AI Diagnostic Sandbox (Live Testing Hub)
Want to test how smart the AI is without creating real tickets?
1. Click the **`AI Intelligence Hub`** tab (Tab 6).
2. On the left side, enter any software problem:
   - Example: `Kafka consumer pod crashed with exit code 137`.
3. Click **`✨ Run Autonomous AI Diagnosis`**.
4. In under 1 second, the right panel will display:
   - Priority: `URGENT`
   - Microservice: `Cloud Kubernetes Production Cluster`
   - Department: `DevOps & Cloud SRE`
   - Full diagnosis and step-by-step fix!

---

## ⚡ 5. Cheat Sheet of Commands

```bash
# 1. Start the API Server (Backend)
pnpm dev:api
# Runs on: http://localhost:4000

# 2. Start the Web Dashboard (Frontend)
pnpm dev:web
# Runs on: http://localhost:3000

# 3. Seed Fresh Software Test Data
pnpm --filter @workmate/api db:seed

# 4. Update Database Schema (Push to Neon Postgres)
pnpm --filter @workmate/api exec prisma db push
```
