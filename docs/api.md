# WorkMate AI — REST API Documentation

Base URL: `http://localhost:4000`

---

## 1. System Health

### `GET /health`
Returns the operational status of the Express API service.

**Response `200 OK`**:
```json
{
  "ok": true,
  "service": "workmate-api",
  "version": "1.0.0"
}
```

---

## 2. Operational Metrics & Stats

### `GET /api/stats`
Provides aggregated metrics for the manager dashboard, including KPI counts, priority distribution, infrastructure category breakdown, and team dispatch workload.

**Response `200 OK`**:
```json
{
  "overview": {
    "totalIssues": 5,
    "activeIssues": 4,
    "openIssues": 2,
    "assignedIssues": 1,
    "inProgressIssues": 1,
    "resolvedIssues": 1,
    "closedIssues": 0,
    "urgentIssues": 1,
    "highIssues": 1,
    "resolutionRate": 20,
    "totalTasks": 5,
    "doneTasks": 1,
    "inProgressTasks": 1,
    "taskCompletionRate": 20
  },
  "categoryBreakdown": [
    { "category": "FACILITY", "count": 1 },
    { "category": "NETWORK", "count": 1 },
    { "category": "HARDWARE", "count": 1 },
    { "category": "SAFETY", "count": 1 },
    { "category": "SOFTWARE", "count": 1 }
  ],
  "teamWorkload": [
    {
      "id": "alex-tech",
      "name": "Alex Rivera",
      "role": "USER",
      "activeTickets": 2,
      "assignedTasks": 2
    }
  ]
}
```

---

## 3. Issues & Ticketing Management

### `GET /api/issues`
Lists all operational tickets. Supports query parameter filtering.

**Query Parameters:**
- `status`: `OPEN` | `ASSIGNED` | `IN_PROGRESS` | `RESOLVED` | `CLOSED`
- `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
- `category`: `FACILITY` | `NETWORK` | `HARDWARE` | `SAFETY` | `SOFTWARE` | `OTHER`
- `assigneeId`: User ID filter
- `search`: Full text search across title, description, and location

### `POST /api/issues`
Creates a new incident ticket. Automatically triggers AI Triage by default.

**Request Body:**
```json
{
  "title": "Chilled water pump vibration alarm",
  "description": "Secondary pump 2 showing excessive vibration and cavitation sounds.",
  "category": "FACILITY",
  "priority": "HIGH",
  "location": "Central Chiller Plant",
  "reporterId": "marcus-manager",
  "assigneeId": "alex-tech",
  "runAiTriage": true
}
```

### `PATCH /api/issues/:id`
Updates ticket workflow status, priority, or assignee.

**Request Body:**
```json
{
  "status": "RESOLVED",
  "resolutionNotes": "Replaced impeller wear rings and aligned pump coupling."
}
```

### `POST /api/issues/:id/comments`
Posts a collaboration update or engineer technical note to a ticket.

**Request Body:**
```json
{
  "content": "On site. Lockout-tagout verified.",
  "authorId": "alex-tech"
}
```

### `POST /api/issues/:id/ai-triage`
Re-runs AI diagnostic analysis on an existing ticket and updates root cause & action plan.

---

## 4. AI Copilot Endpoints

### `POST /api/ai/shift-summary`
Synthesizes a live executive shift briefing from current active tickets and field tasks.

**Response `200 OK`**:
```json
{
  "headline": "Shift Briefing: 2 High-Priority Incident(s) Require Active Response",
  "urgentAlerts": [
    "[URGENT] Main HVAC compressor fault - Critical Server Room B @ Building 3, Floor 2, Server Room B - Status: IN_PROGRESS"
  ],
  "operationalSummary": "Active fleet monitoring indicates 5 total logged incidents...",
  "recommendedFocus": [
    "Immediate dispatch for Main HVAC compressor fault - Critical Server Room B",
    "Accelerate completion of 4 pending scheduled tasks",
    "Assign technical owner to 2 unassigned incoming incident(s)"
  ]
}
```

### `POST /api/ai/triage`
Runs real-time neural diagnosis on arbitrary equipment failure symptoms.

---

## 5. Tasks & Work Orders

### `GET /api/tasks`
Lists all operational work orders.

### `POST /api/tasks`
Creates a work order, optionally linked to a parent incident ticket.

### `PATCH /api/tasks/:id`
Updates task status (`TODO`, `IN_PROGRESS`, `DONE`) or due date.
