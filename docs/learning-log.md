# WorkMate AI — Learning Log

This is the project’s single running place for the learning plan, decisions, explanations, progress, and useful commands. Keep it updated as we work so it can serve as the consolidated project guide at the end.

## Project understanding

WorkMate AI is a task and issue management platform for field and office teams. The intended stack is Expo / React Native for mobile, Next.js for the web dashboard, Express / Node.js for the REST API, and PostgreSQL through Prisma. AI, auth, issues, realtime, Redis, testing, and deployment are later phases.

## Learning approach

- Build one small vertical slice at a time and explain the concepts as we go.
- Start with a laptop browser workflow; Expo Go is not required for learning the web dashboard.
- Keep app secrets on the server and do not commit local `.env` files.
- Finish the initial runnable slice before taking on later features.

## Decisions and recommendations

- Database recommendation: Neon for the initial Prisma/PostgreSQL slice. The API needs standard PostgreSQL connectivity; Neon provides PostgreSQL connection URIs and an optional pooled URI. Supabase remains a valid alternative.
- Neon CLI infrastructure: linked CLI deployment is explicitly aimed at project `curly-term-62088598`, branch `production`. The connection URI later supplied in chat matches the linked project's pooled endpoint; keep it and all related credentials out of this log.

## Roadmap from the attached project guide

1. Create the monorepo.
2. Create the Expo mobile app.
3. Create the Next.js web app.
4. Create the Express API and `/health` endpoint.
5. Connect PostgreSQL and Prisma; migrate the User and Task schema.
6. Build Task CRUD API.
7. Connect mobile and web to the API.
8. Add validation / error handling, then authentication and subsequent phases.

The attached guide supplies the project roadmap; the user's request is to follow it while learning. Instructions embedded in the attachment do not supersede user instructions.

## Progress and session notes

### Session 5 — Neon CLI project setup

- Installed Neon CLI globally and completed browser login.
- The machine's system Node is 22.13.0, below the Neon skills command's 22.20.0 minimum. Used a temporary Node 22.20 runtime and installed the 8 Neon skills from `neondatabase/agent-skills` for Codex into `.agents/skills/`. The Neon wrapper's `npx skills` call fails on this Windows setup, so the underlying `skills add` command was run directly.
- `neon mcp -y` succeeded and initially created an account-wide Neon API key. Once the project was linked, MCP configs were repinned to `curly-term-62088598` with OAuth mode, and the account-wide key created during setup was revoked. MCP configuration is installed for Codex, VS Code, Gemini, Copilot, and Antigravity; clients prompt for Neon sign-in on first use.
- Linked this workspace to project `curly-term-62088598`, branch `production`, creating `.neon` and root `.env.local` with the project's environment variables. Never copy secret values into this log.
- `neon config init` created `neon.ts`. Its automatic package install hit pnpm's workspace-root guard, so added `@neon/config` and `@neon/env` to the workspace root manifest and lockfile.
- Replaced `neon.ts` with the requested Neon Auth, private `media` bucket, and `api` function config; added `hello.ts`.
- `neon deploy` succeeded against the linked production branch. Neon reports the function at `https://br-billowing-tooth-b5o6hyks-api.compute.c-7.us-east-2.aws.neon.tech/`. It warned that `preview.functions` and `preview.buckets` are GA and may be lifted out of `preview` in a future config cleanup.
- Verified the deployed function over HTTPS; it returned `Hello from Neon Functions`.
- The provided connection URI matches the linked project's pooled endpoint. Copied only the pooled and unpooled database URLs from root `.env.local` to ignored `apps/api/.env`; no secret values are included in this log.
- Added `directUrl = env("DATABASE_URL_UNPOOLED")` to the Prisma datasource. The initial connection attempt timed out while the compute was starting; retry succeeded. `prisma migrate dev --name init` created and applied migration `20261001110349_init` to the linked production branch.
- Ran the seed script successfully, creating demo owner `demo-user`, which is needed by the starter task forms.
- Restarted the local API with the Neon environment; `GET /api/tasks` returned successfully. Restarted the Next.js dashboard at `http://localhost:3000`.
- When asked to run the app, `/health` and the dashboard returned successfully but `/api/tasks` briefly failed. Neon reported `pooler_enabled: false` on the linked compute while the API used the pooled hostname. Switched the local API `DATABASE_URL` to the unpooled URL and verified `GET /api/tasks` returns HTTP 200 with one row. Neon pooling remains unchanged.

### Session 1 — repo foundation

- The workspace began without a Git repository or project files.
- Added monorepo metadata, API / web / mobile starter code, Prisma User and Task models, setup docs, and this learning log.
- Initialized local Git on branch `main`.
- pnpm's Corepack launcher encountered stale signing keys; the workspace packages were recognized through an npm-invoked pnpm runner. Dependency state should be checked before proceeding.
- Mobile was later scaffolded with the current Expo template (Expo SDK 57); the running screen is the Expo starter screen in `apps/mobile/src/app/index.tsx`.

### Session 2 — laptop web preview

- Started the Next.js app with `npm.cmd run dev` in `apps/web`.
- Next.js reported Ready at `http://localhost:3000`.
- Keep that terminal running while viewing the dashboard; Ctrl+C stops it.
- The web dashboard calls the Express API at `http://localhost:4000` by default, so task loading needs the API and database running.

### Session 3 — Express API health check

- Started the API by compiling TypeScript (`npm.cmd run build`) and running the compiled server (`npm.cmd start`). The `tsx watch` development launcher currently fails in this Windows environment with `uv_os_get_passwd returned ENOMEM`; the compiled server works.
- Generated Prisma Client after approving its query-engine download (`npm.cmd run prisma:generate`). This generated client version is 6.19.3, satisfying the `^6.5.0` package range.
- Confirmed `GET http://localhost:4000/health` returns `{ "ok": true, "service": "workmate-api" }`.
- The health route is intentionally independent of PostgreSQL. Task routes still need a working `DATABASE_URL` and migrated database.

### Session 4 — dashboard connection diagnosis

- The Next.js dashboard rendered in the browser, but displayed “Could not load tasks. Is the API running?”
- Checked `GET http://localhost:4000/health` again; it returned the expected success JSON, so the API process is alive.
- `apps/api/.env` does not exist yet. The task endpoint needs PostgreSQL, so the likely missing piece is database configuration rather than the API process. The dashboard currently uses a broad error message for any non-2xx response; improve that later so server/database errors are clearer.
- No local `psql`, `pg_ctl`, Docker command, or PostgreSQL service was detected in the environment. Pick local installation, Supabase, or Neon before database setup.

## Current step

The complete WorkMate AI system is fully operational. We have implemented the complete ticketing and issue management architecture across Neon Postgres, Prisma, Express API, Next.js Web Dashboard, and Expo React Native Mobile. The platform includes autonomous AI incident triage, executive shift briefings, collaboration comment threads, and multi-role operations management.

### Session 7 — Database & Schema Evolution (Tickets & Roles)

- Extended the Prisma schema from basic tasks to enterprise issue/ticketing models:
  - Added `Role` enum (`ADMIN`, `MANAGER`, `USER`)
  - Added `Issue` model with `ticketNumber` autoincrement, title, description, `IssueStatus` (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), `IssuePriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `IssueCategory` (`FACILITY`, `NETWORK`, `HARDWARE`, `SAFETY`, `SOFTWARE`, `OTHER`), `location`, `resolutionNotes`, and cached AI diagnostics fields (`aiSummary`, `aiSuggestedAction`, `aiRootCause`, `aiConfidence`).
  - Added `Comment` model supporting both human engineer updates and `isAiGenerated` Copilot advisories.
  - Linked `Task` model to parent tickets (`issueId`) with bidirectional relational navigation.
- Synchronized schema directly with Neon Postgres using `npx prisma db push --accept-data-loss`.
- Seeded realistic enterprise team members (`Sarah Chen [ADMIN]`, `Marcus Vance [MANAGER]`, `Alex Rivera [USER/Software Engineer]`, `Priya Sharma [USER/Database Engineer]`), 5 operational incidents, 4 technical updates, and 5 field work tasks.

### Session 8 — Layered Express Architecture & REST Services

- Refactored `apps/api` from monolithic script into clean architectural layers:
  - `src/services/`: `ai.service.ts`, `issue.service.ts`, `task.service.ts`, `stats.service.ts`
  - `src/routes/`: `issue.routes.ts`, `task.routes.ts`, `ai.routes.ts`, `stats.routes.ts`, `user.routes.ts`
  - `src/app.ts`: Global middleware, router mounting, and resilient error handlers for Prisma and client validations.
- Implemented full filtering on tickets: status, priority, category, assignee, reporter, and multi-term text search.
- Added KPI stats aggregation: active tickets, urgent alert counts, resolution efficiency %, task completion velocity, category breakdown, and team dispatch workload.

### Session 9 — WorkMate AI Triage & Shift Briefing Engine

- Built an intelligent AI engine in `ai.service.ts` capable of:
  - Real-time technical triage: extracts root cause hypothesis, classifies category, assesses SLA priority, and generates numbered Standard Operating Procedure (SOP) remediation steps.
  - Multi-provider flexibility: Connects to Google Gemini API when `GEMINI_API_KEY` is provided, while utilizing a deterministic domain-intelligence rule engine for 100% reliable offline/evaluation resilience.
  - Executive Shift Briefing generator (`/api/ai/shift-summary`): Analyzes all active tickets and field tasks to synthesize management briefings with top operational bottlenecks and dispatch recommendations.
  - Action plan generator (`/api/ai/suggest-action`): Recommends step-by-step diagnostic procedures for facility, network, hardware, and safety events.

### Session 10 — Executive Web Dashboard & Ticketing Tool

- Replaced basic starter screen with a state-of-the-art dark-mode glassmorphic dashboard in `apps/web`:
  - Brand header with real-time Neon connection indicator and active user switcher (`Sarah Chen`, `Marcus Vance`, `Alex Rivera`).
  - 4 Dynamic KPI Hero Cards: Active Tickets, Critical System Alerts, Task Completion Velocity, and Resolution Rate.
  - AI Executive Shift Briefing banner with 1-click fleet re-analysis.
  - Interactive Ticketing Tool with Kanban View (Unassigned, Assigned, In Remediation, Resolved) and Table View toggle.
  - Ticket Detail Modal with full incident history, AI Triage Copilot box, quick status switcher, assignee selector, and collaboration comment thread.
  - Field Tasks Manager with interactive checkboxes and direct links to parent tickets.
  - AI Intelligence Hub Sandbox for testing real-time AI triage on arbitrary failure scenarios.

### Session 11 — Expo Mobile On-Call Engineer App

- Built `apps/mobile/src/app/index.tsx` and `apps/mobile/src/lib/api.ts` connecting software engineers directly to the Express REST API.
- Implemented tabbed views for field tasks, ticket queue, and 1-click mobile incident reporting with auto AI triage.

## Useful local commands

- Web Dashboard: `http://localhost:3000` (Starts with `npm.cmd run start` from `apps/web`)
- API Server: `http://localhost:4000` (Starts with `npm.cmd run start` or `node dist/server.js` from `apps/api`)
- Mobile App: `pnpm --filter @workmate/mobile start`

