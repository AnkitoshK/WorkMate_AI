WorkMate AI — Full-Stack Learning Project
React Native + Next.js + Node/Express + Prisma + PostgreSQL + AI + Git + Free Deployment
Purpose: build one realistic application from zero, while learning each technology in a controlled sequence. Start with a small CRUD system; then add authentication, roles, AI, realtime, notifications, testing, Docker, CI/CD and deployment.
1. What we are building
WorkMate AI is a task and issue management platform for field/office teams. A user can create tasks, update status, report issues, attach evidence, and ask an AI assistant to summarize or suggest next actions.
Mobile: Expo React Native app for engineers/on-call users.
Web: Next.js dashboard for managers/admins.
Backend: Node.js + Express REST API.
Database: PostgreSQL.
ORM: Prisma.
AI: an LLM called only from the backend; API keys never go into the mobile/web client.
Version control: Git + GitHub with feature branches and pull-request style workflow.
Later: Redis, Socket.IO, background jobs, file storage, Docker, tests and CI/CD.
2. Learning philosophy
Do not start with every technology at once. Build vertical slices. Each phase should leave the application runnable.
Phase 0 — Git, repo and development environment.
Phase 1 — Hello screens and API health check.
Phase 2 — PostgreSQL + Prisma schema + migrations.
Phase 3 — Task CRUD API.
Phase 4 — React Native task screens connected to API.
Phase 5 — Next.js web dashboard connected to API.
Phase 6 — Authentication + role-based authorization.
Phase 7 — Issue/complaint workflow and file attachments.
Phase 8 — AI assistant: summarize, classify, suggest actions.
Phase 9 — Realtime updates with Socket.IO.
Phase 10 — Redis/cache + background jobs.
Phase 11 — Testing, security, logging and validation.
Phase 12 — Docker + CI/CD + free deployment.
3. Final architecture
                    ┌──────────────────────────┐                    │        Users              │                    └────────────┬─────────────┘                                 │             ┌───────────────────┴───────────────────┐             │                                       │     ┌───────▼────────┐                     ┌────────▼───────┐     │ Expo RN Mobile │                     │ Next.js Web    │     │ Android/iOS    │                     │ Admin/Dashboard│     └───────┬────────┘                     └────────┬───────┘             │                 HTTPS/JSON             │             └──────────────────┬─────────────────────┘                                ▼                    ┌──────────────────────┐                    │ Node + Express API   │                    │ Auth / CRUD / AI     │                    └───────┬───────┬─────┘                            │       │                     ┌──────▼───┐   └──────────────┐                     │ Prisma   │                  │                     └────┬─────┘            ┌─────▼─────┐                          │                  │ AI Provider│                    ┌─────▼─────┐            └───────────┘                    │ PostgreSQL│                    └───────────┘Later:Redis → cache / rate limitingSocket.IO → realtime eventsQueue/worker → long-running AI/file jobsObject storage → images/documents
4. Recommended repository structure
workmate-ai/├── apps/│   ├── mobile/                 # Expo React Native│   ├── web/                    # Next.js│   └── api/                    # Node + Express├── packages/│   ├── types/                  # shared TypeScript types│   ├── validation/             # shared Zod schemas│   └── config/                 # shared config/constants├── docs/│   ├── architecture.md│   ├── api.md│   ├── database.md│   ├── setup.md│   └── deployment.md├── .github/│   └── workflows/├── .gitignore├── package.json├── README.md└── pnpm-workspace.yaml
5. Why TypeScript for this project
Use TypeScript across mobile, web and API. You already know JavaScript/React/Node concepts, so TypeScript adds type safety without changing the architecture. It also makes shared API types practical.
6. Phase 0 — create the repository
mkdir workmate-aicd workmate-aigit initgit branch -M maingit add .git commit -m &quot;chore: initialize project&quot;# after creating the GitHub repository:git remote add origin &lt;YOUR_GITHUB_REPO&gt;git push -u origin main
Recommended branches: main, develop (optional), feature/auth, feature/tasks, feature/ai. Use small commits such as feat(tasks): add task CRUD API.
7. Phase 1 — create the apps
# Install pnpm if needednpm install -g pnpmmkdir apps packages docs# Mobilenpx create-expo-app@latest apps/mobile# Webpnpm create next-app apps/web --ts --eslint --app# APImkdir apps/apicd apps/apipnpm initpnpm add express cors dotenv zodpnpm add -D typescript tsx @types/node @types/express
Keep the first mobile version simple: Home, Tasks, Task Details and Create Task. Do not add authentication yet.
8. Phase 2 — PostgreSQL + Prisma
cd apps/apipnpm add prisma @prisma/clientpnpm add -D prismanpx prisma init
Set DATABASE_URL in apps/api/.env. Never commit .env files.
DATABASE_URL=&quot;postgresql://USER:PASSWORD@HOST:5432/workmate&quot;PORT=4000
9. First Prisma schema
// apps/api/prisma/schema.prismagenerator client {  provider = &quot;prisma-client-js&quot;}datasource db {  provider = &quot;postgresql&quot;  url      = env(&quot;DATABASE_URL&quot;)}enum TaskStatus {  TODO  IN_PROGRESS  DONE}model User {  id        String   @id @default(cuid())  name      String  email     String   @unique  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt  tasks     Task[]}model Task {  id          String     @id @default(cuid())  title       String  description String?  status      TaskStatus @default(TODO)  priority    Int        @default(2)  dueDate     DateTime?  createdAt   DateTime   @default(now())  updatedAt   DateTime   @updatedAt  ownerId String  owner   User @relation(fields: [ownerId], references: [id])}
npx prisma migrate dev --name initnpx prisma generatenpx prisma studio
10. Phase 3 — Express API
// apps/api/src/server.tsimport express from &quot;express&quot;;import cors from &quot;cors&quot;;const app = express();app.use(cors());app.use(express.json());app.get(&quot;/health&quot;, (_req, res) =&gt; {  res.json({ ok: true, service: &quot;workmate-api&quot; });});app.listen(4000, () =&gt; {  console.log(&quot;API running on http://localhost:4000&quot;);});
Then evolve the API into layers rather than putting everything in server.ts.
apps/api/src/├── config/├── controllers/├── middleware/├── routes/├── services/├── utils/├── app.ts└── server.ts
11. First real CRUD route
// services/task.service.tsimport { PrismaClient } from &quot;@prisma/client&quot;;const prisma = new PrismaClient();export function createTask(data: {  title: string;  description?: string;  ownerId: string;}) {  return prisma.task.create({ data });}export function getTasks() {  return prisma.task.findMany({    orderBy: { createdAt: &quot;desc&quot; }  });}
// routes/task.routes.tsimport { Router } from &quot;express&quot;;import { createTask, getTasks } from &quot;../services/task.service&quot;;const router = Router();router.get(&quot;/&quot;, async (_req, res) =&gt; {  const tasks = await getTasks();  res.json(tasks);});router.post(&quot;/&quot;, async (req, res) =&gt; {  const task = await createTask(req.body);  res.status(201).json(task);});export default router;
After this works, add GET /:id, PATCH /:id, DELETE /:id, validation, proper error handling and pagination.
12. API contract to learn
GET    /api/tasksGET    /api/tasks/:idPOST   /api/tasksPATCH  /api/tasks/:idDELETE /api/tasks/:idPOST   /api/auth/registerPOST   /api/auth/loginGET    /api/mePOST   /api/ai/task-summaryPOST   /api/ai/suggest-action
13. Phase 4 — React Native
Use Expo Router so navigation and screens are easy to organize.
apps/mobile/├── app/│   ├── _layout.tsx│   ├── index.tsx│   ├── tasks/│   │   ├── index.tsx│   │   ├── [id].tsx│   │   └── create.tsx├── components/├── lib/│   └── api.ts├── hooks/└── types/
// lib/api.tsconst API_URL = process.env.EXPO_PUBLIC_API_URL!;export async function getTasks() {  const response = await fetch(`${API_URL}/api/tasks`);  if (!response.ok) {    throw new Error(&quot;Failed to load tasks&quot;);  }  return response.json();}
Important: Android emulator and a physical phone may not reach localhost in the same way. During local development, use your computer's LAN IP when testing from a physical device.
14. Phase 5 — Next.js web app
apps/web/├── app/│   ├── page.tsx│   ├── tasks/│   │   └── page.tsx│   └── dashboard/│       └── page.tsx├── components/├── lib/│   └── api.ts└── types/
The web app initially shows a table/dashboard; the mobile app focuses on task execution. Both consume the same Express API.
15. Phase 6 — authentication
Add authentication only after CRUD works. Use short-lived access tokens and a secure refresh strategy. Passwords must be hashed with a password hashing library; never store plaintext passwords.
User ├── id ├── name ├── email ├── passwordHash └── roleRole:ADMINMANAGERUSER
Then protect routes with auth middleware and role middleware. On mobile, store tokens using secure device storage rather than plain AsyncStorage.
16. Phase 7 — issues / complaints
Add a second business workflow so you practice relationships and status transitions.
model Issue {  id          String      @id @default(cuid())  title       String  description String  status      IssueStatus @default(OPEN)  priority    Int         @default(2)  createdAt   DateTime    @default(now())  updatedAt   DateTime    @updatedAt  reporterId  String  reporter    User        @relation(fields: [reporterId], references: [id])}enum IssueStatus {  OPEN  ASSIGNED  IN_PROGRESS  RESOLVED  CLOSED}
This is where you can practice the kind of workflow/state logic you have encountered in enterprise support systems.
17. Phase 8 — AI integration
Do not call the AI provider directly from React Native or the browser. The flow should be Mobile/Web → Express API → AI provider → Express API → client.
POST /api/ai/task-summaryRequest:{  &quot;taskId&quot;: &quot;abc123&quot;}Backend:1. Authenticate user2. Load task from PostgreSQL3. Build a controlled prompt4. Call the AI provider5. Validate the response6. Return structured JSON
Useful first AI features:
Summarize an issue.
Convert an issue description into a structured problem statement.
Suggest priority and next action.
Generate a daily task summary.
Explain an error message in beginner-friendly language.
Later: AI chat with project context and document retrieval.
18. AI safety and architecture
Mobile/Web   |   | POST /api/ai/...   vExpress API   |   +-- auth / rate limit / validation   |   +-- database context   |   vAI provider   |   vStructured response
Keep API keys in server-side environment variables. Add rate limiting before exposing AI publicly. Log metadata, not sensitive user prompts, unless you have a deliberate data-retention policy.
19. Phase 9 — realtime
Only after normal REST APIs work, add Socket.IO.
Example:User A changes Task #101 to IN_PROGRESS        |        vExpress + Socket.IO        |        +----&gt; User B dashboard updates        +----&gt; Manager dashboard updates
This teaches the difference between request/response APIs and event-driven communication.
20. Phase 10 — Redis and background jobs
Redis cache for frequently requested dashboard data.
Rate limiting for login and AI endpoints.
Background queue for expensive AI summarization, report generation or notifications.
Do not introduce Redis just because it is popular; introduce it when you can explain the problem it solves.
21. Testing roadmap
Unit tests: service functions and utility functions.
API integration tests: authentication and CRUD endpoints.
Component tests: important mobile/web UI.
End-to-end tests: login → create task → update task → AI summary.
Manual API testing with Postman/Thunder Client during early development.
22. Git workflow you should practice
git checkout -b feature/task-crudgit add .git commit -m &quot;feat: add task CRUD API&quot;git push -u origin feature/task-crud# review / merge into maingit checkout maingit pull
Commit prefixes: feat, fix, refactor, docs, test, chore. Keep commits small enough that you can explain every changed file.
23. Suggested .gitignore
node_modules/.env.env.*!.env.exampledist/build/.expo/.next/coverage/*.log.DS_Store
24. Documentation you should maintain
docs/├── setup.md          # how to run locally├── architecture.md   # system diagram and decisions├── database.md       # ERD and Prisma models├── api.md            # endpoints + request/response examples├── authentication.md├── ai.md├── deployment.md└── troubleshooting.md
The README should contain: project purpose, screenshots, stack, architecture, local setup, environment variables, API summary, deployment URL, mobile APK/Expo instructions, and Git workflow.
25. Database evolution
V1UserTaskV2UserTaskIssueV3UserRoleTaskIssueAttachmentV4AIRequestAIResponse / AIUsageV5NotificationAuditLogV6Realtime/session-related data if actually needed
Use Prisma migrations for every schema change. Never casually edit production database tables manually once deployment begins.
26. Free deployment strategy — recommended learning setup
For the learning/portfolio stage, split the hosting responsibilities rather than forcing one platform to host everything.
GitHub  |  +--&gt; Vercel       -&gt; Next.js web  |  +--&gt; Render       -&gt; Express API  |  +--&gt; Supabase     -&gt; PostgreSQL  |  +--&gt; Expo/EAS     -&gt; Android/iOS builds  |  +--&gt; AI provider  -&gt; model API (may have usage cost)
A second database option is Neon PostgreSQL. Its current Free plan is designed for learning/early projects and provides per-project storage and compute limits. Choose one database provider; do not run both just to make the architecture look bigger.
27. Current free-tier reality
Vercel Hobby is free for personal projects and includes Git-based CI/CD and HTTPS, but its Hobby terms are for personal/non-commercial use. citeturn1search0turn1search6
Render currently offers free web services and free Postgres for experimentation, but its free Postgres expires after 30 days, so it is not the database choice I would use for a long-lived portfolio project. citeturn0search2
Supabase currently has a $0 Free plan with PostgreSQL, 500 MB database size, 5 GB egress and 1 GB file storage; inactive free projects can be paused. citeturn1search1turn1search5
Neon's current Free plan is also suitable for learning and early projects, with 0.5 GB storage per project and scale-to-zero behavior. citeturn1search14
Railway has a $0 Free plan with $1/month of free resources after its initial trial, so I would not make Railway the primary 'always free' assumption. citeturn0search3turn0search8
Cloudflare Workers has a free tier, but its serverless execution model is different from a normal always-running Express server. It is useful later if you want to experiment with serverless APIs. citeturn0search1
Expo/EAS has a free build/update allocation, subject to current limits. citeturn0search4
28. My recommended zero/near-zero learning stack
Web       -&gt; Vercel HobbyAPI       -&gt; Render FreeDatabase  -&gt; Supabase Free OR Neon FreeMobile    -&gt; Expo + local development / EAS Free allowanceSource    -&gt; GitHub FreeAI        -&gt; start with local/mock AI adapter; connect a paid/free-credit provider
Important: AI inference is the component most likely to become a real recurring cost. Design the code with an AI service interface so you can develop locally using a mock provider and switch to a real model provider later.
29. Environment variables
# apps/api/.envDATABASE_URL=...JWT_SECRET=...AI_API_KEY=...PORT=4000# apps/web/.env.localNEXT_PUBLIC_API_URL=https://your-api.example.com# apps/mobile/.envEXPO_PUBLIC_API_URL=https://your-api.example.com
Only variables explicitly intended for client exposure should use NEXT_PUBLIC_ or EXPO_PUBLIC_. Never put database passwords, JWT signing secrets or AI provider secrets in those variables.
30. Milestone checklist
M0: GitHub repo + monorepo + README
M1: Mobile + web + API run locally
M2: PostgreSQL + Prisma migration
M3: Task CRUD API
M4: Mobile task CRUD
M5: Web dashboard
M6: Authentication + roles
M7: Issue workflow
M8: AI assistant
M9: Realtime
M10: Redis + background jobs
M11: Testing + security
M12: Docker + CI/CD + deployment
31. What you will learn by the end
React Native / Expo application architecture
Next.js web application architecture
REST API design with Express
PostgreSQL relational database design
Prisma schema, relations and migrations
Authentication, authorization and API security
Git branching, commits, pull requests and release workflow
AI integration through a secure backend
Realtime communication with Socket.IO
Redis caching/rate limiting
Background job architecture
Testing and debugging
Docker and environment management
CI/CD and cloud deployment
32. The actual order we should follow together
Do not build the whole final system in one go. The best learning path is to implement one milestone at a time and test it before moving forward.
STEP 01  Create GitHub repositorySTEP 02  Create monorepoSTEP 03  Create Expo mobile appSTEP 04  Create Next.js web appSTEP 05  Create Express APISTEP 06  Add /health endpointSTEP 07  Install PostgreSQL + PrismaSTEP 08  Create User + Task schemaSTEP 09  Run first migrationSTEP 10  Build Task CRUD APISTEP 11  Connect mobile to APISTEP 12  Connect web to APISTEP 13  Add validation/error handlingSTEP 14  Add authenticationSTEP 15  Add rolesSTEP 16  Add Issue workflowSTEP 17  Add AI endpointSTEP 18  Add AI UI in mobile + webSTEP 19  Add realtimeSTEP 20  Add Redis/queue only where neededSTEP 21  Add testsSTEP 22  DockerizeSTEP 23  Deploy web/API/databaseSTEP 24  Build Android appSTEP 25  Polish README + portfolio documentation
Workflow
01. Git + GitHub
        ↓
02. Monorepo
        ↓
03. React Native / Expo
        ↓
04. Next.js Web
        ↓
05. Express API
        ↓
06. PostgreSQL
        ↓
07. Prisma ORM
        ↓
08. Task CRUD
        ↓
09. Connect Mobile → API
        ↓
10. Connect Web → API
        ↓
11. Authentication
        ↓
12. Roles &amp; Permissions
        ↓
13. Issue/Complaint Workflow
        ↓
14. AI Integration
        ↓
15. Socket.IO Realtime
        ↓
16. Redis + Background Jobs
        ↓
17. Testing
        ↓
18. Docker
        ↓
19. CI/CD
        ↓
20. Deployment

34. First coding target
When starting implementation, stop after the following is working: Git repository → Expo screen → Next.js screen → Express /health → PostgreSQL connection → Prisma migration → Task CRUD API. This gives you the foundation for every later feature.
The next implementation session should begin with the repository and folder creation, then we write the exact package.json files, TypeScript configuration, API bootstrap, Prisma setup, and first Git commits. Do not add AI, Redis or Socket.IO until the CRUD slice is working.



