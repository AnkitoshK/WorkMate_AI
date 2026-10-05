import "dotenv/config";
import { PrismaClient, Role, IssueStatus, IssuePriority, IssueCategory, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding WorkMate AI Software Engineering incident management database...");

  // 0. Clean up existing operational data for a completely fresh software-only start
  console.log("Cleaning up existing data...");
  await prisma.comment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.serviceAsset.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✓ Existing data removed.");

  // 1. Software Engineering Team & Roles
  const usersData = [
    {
      id: "sarah-admin",
      name: "Sarah Chen",
      email: "sarah.chen@workmate.ai",
      role: Role.SUPER_ADMIN,
      department: "Executive & Platform Architecture",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "marcus-manager",
      name: "Marcus Vance",
      email: "marcus.v@workmate.ai",
      role: Role.MANAGER,
      department: "Backend & Core APIs",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "david-it-manager",
      name: "David Kim",
      email: "david.kim@workmate.ai",
      role: Role.MANAGER,
      department: "DevOps & Cloud SRE",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "alex-tech",
      name: "Alex Rivera",
      email: "alex.tech@workmate.ai",
      role: Role.ENGINEER,
      department: "Frontend & Mobile Engineering",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "priya-tech",
      name: "Priya Sharma",
      email: "priya.s@workmate.ai",
      role: Role.ENGINEER,
      department: "Database & Platform Infrastructure",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
    {
      id: "demo-user",
      name: "Elena Rostova (QA Lead)",
      email: "demo@workmate.local",
      role: Role.USER,
      department: "QA & Reliability Engineering",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }
  console.log(`✓ Seeded ${usersData.length} software engineering team members.`);

  // 2. Monitored Software Applications & Microservices
  const assetsData = [
    {
      id: "asset-web-portal",
      name: "Customer Operations Web Portal",
      slug: "web-portal",
      type: "WEB_APP",
      department: "Frontend & Mobile Engineering",
      environment: "PRODUCTION",
      healthStatus: "OPERATIONAL",
      slaTargetMins: 30,
      urlOrLocation: "https://app.workmate.ai",
      description: "Primary enterprise Next.js React dashboard for customer management and telemetry.",
    },
    {
      id: "asset-payment-api",
      name: "Billing & Payment Gateway API",
      slug: "billing-api",
      type: "API_SERVICE",
      department: "Backend & Core APIs",
      environment: "PRODUCTION",
      healthStatus: "DEGRADED",
      slaTargetMins: 15,
      urlOrLocation: "https://api.workmate.ai/v1/billing",
      description: "Mission-critical financial transaction processing and credit card charging microservice.",
    },
    {
      id: "asset-auth-service",
      name: "Auth & Identity Gateway (OAuth/JWT)",
      slug: "auth-gateway",
      type: "API_SERVICE",
      department: "Backend & Core APIs",
      environment: "PRODUCTION",
      healthStatus: "OPERATIONAL",
      slaTargetMins: 15,
      urlOrLocation: "https://auth.workmate.ai",
      description: "Centralized identity provider, JWT issuance, JWKS key rotation, and OAuth2 session manager.",
    },
    {
      id: "asset-k8s-cluster",
      name: "Cloud Kubernetes Production Cluster",
      slug: "k8s-prod-cluster",
      type: "API_SERVICE",
      department: "DevOps & Cloud SRE",
      environment: "PRODUCTION",
      healthStatus: "DEGRADED",
      slaTargetMins: 30,
      urlOrLocation: "k8s://us-east-2.production.cluster",
      description: "Amazon EKS multi-zone Kubernetes cluster running core backend microservices and workers.",
    },
    {
      id: "asset-postgres-db",
      name: "Neon PostgreSQL Primary Cluster",
      slug: "postgres-primary",
      type: "API_SERVICE",
      department: "Database & Platform Infrastructure",
      environment: "PRODUCTION",
      healthStatus: "DEGRADED",
      slaTargetMins: 30,
      urlOrLocation: "postgres://ep-frosty-dream.neon.tech:5432/neondb",
      description: "High-concurrency serverless Postgres database hosting application state and issue tickets.",
    },
  ];

  for (const a of assetsData) {
    await prisma.serviceAsset.create({ data: a });
  }
  console.log(`✓ Seeded ${assetsData.length} monitored software applications and services.`);

  // 3. Exactly 5 Software-Specific Incident Tickets
  const issuesData = [
    {
      id: "iss-1",
      title: "HTTP 504 Gateway Timeout during checkout on /api/v1/billing/charge",
      description: "Downstream merchant banking gateway TCP socket hang causing worker pool starvation. Over 45 customer transactions dropped in the last 10 minutes. Redis retry queue is backlogged.",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.URGENT,
      category: IssueCategory.SOFTWARE,
      department: "Backend & Core APIs",
      source: "API_MONITOR",
      affectedUrl: "https://api.workmate.ai/v1/billing/charge",
      location: "AWS us-east-2 Production Cluster",
      serviceAssetId: "asset-payment-api",
      reporterId: "david-it-manager",
      assigneeId: "marcus-manager",
      slaDeadline: new Date(Date.now() + 15 * 60 * 1000), // in 15 mins
      slaBreached: false,
      aiSummary: "Downstream payment acquirer TCP socket timeout causing thread pool starvation on billing microservice.",
      aiSuggestedAction: "1. Engage circuit breaker to divert traffic to secondary Stripe payment rail.\n2. Scale payment worker pods to 12 replicas in Kubernetes.\n3. Increase downstream HTTP socket timeout to 5000ms with exponential backoff.",
      aiRootCause: "Merchant acquiring bank TCP socket hang causing Node.js event loop latency spike.",
      aiConfidence: 0.96,
    },
    {
      id: "iss-2",
      title: "Hydration mismatch & React uncaught error on /dashboard/analytics",
      description: "Users on Chrome and Firefox experience white-screen blank page upon loading analytics dashboard. Console displays: 'Hydration failed because the initial UI does not match what was rendered on the server' in SSR client bundle.",
      status: IssueStatus.ASSIGNED,
      priority: IssuePriority.HIGH,
      category: IssueCategory.SOFTWARE,
      department: "Frontend & Mobile Engineering",
      source: "WEB_PORTAL",
      affectedUrl: "https://app.workmate.ai/dashboard/analytics",
      location: "Next.js Web Client v14.2",
      serviceAssetId: "asset-web-portal",
      reporterId: "demo-user",
      assigneeId: "alex-tech",
      slaDeadline: new Date(Date.now() + 45 * 60 * 1000), // in 45 mins
      slaBreached: false,
      aiSummary: "Client-side bundle hydration error caused by date formatting mismatch between server SSR and client browser locale.",
      aiSuggestedAction: "1. Wrap dynamic date components inside `suppressHydrationWarning` or dynamic import with `ssr: false`.\n2. Invalidate Cloudflare edge HTML cache.\n3. Run end-to-end Cypress regression suite.",
      aiRootCause: "Browser `Intl.DateTimeFormat` timezone discrepancy with UTC server-rendered timestamp.",
      aiConfidence: 0.92,
    },
    {
      id: "iss-3",
      title: "Kubernetes Pod CrashLoopBackOff in worker-ingestion-deployment",
      description: "Production Kafka queue consumer pods terminating with exit code 137 (OOMKilled). Node memory consumption spikes past the 2Gi limit when processing batch webhook deliveries.",
      status: IssueStatus.OPEN,
      priority: IssuePriority.HIGH,
      category: IssueCategory.SOFTWARE,
      department: "DevOps & Cloud SRE",
      source: "API_MONITOR",
      affectedUrl: "k8s://us-east-2.production.cluster/worker-ingestion-deployment",
      location: "EKS Cluster us-east-2 (Worker Pool A)",
      serviceAssetId: "asset-k8s-cluster",
      reporterId: "sarah-admin",
      assigneeId: "david-it-manager",
      slaDeadline: new Date(Date.now() + 35 * 60 * 1000), // in 35 mins
      slaBreached: false,
      aiSummary: "Kafka consumer pod memory leak causing Kubernetes kernel OOM killer trigger (Exit Code 137).",
      aiSuggestedAction: "1. Patch deployment memory limit from 2Gi to 4Gi in Terraform helm release.\n2. Implement stream backpressure throttling on webhook ingestion batch parser.\n3. Take Node.js heap snapshot to identify buffer retention leak.",
      aiRootCause: "Unbounded in-memory buffering of uncompressed JSON webhook payloads during traffic burst.",
      aiConfidence: 0.94,
    },
    {
      id: "iss-4",
      title: "PostgreSQL connection pool exhaustion on primary replica",
      description: "Prisma client reporting: 'Timed out fetching a connection from the pool'. Active client connections hit 100/100 limit due to unindexed query on issue audit trail table.",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.URGENT,
      category: IssueCategory.SOFTWARE,
      department: "Database & Platform Infrastructure",
      source: "API_MONITOR",
      affectedUrl: "postgres://ep-frosty-dream.neon.tech:5432/neondb",
      location: "Neon Serverless Postgres (Pool: Transaction)",
      serviceAssetId: "asset-postgres-db",
      reporterId: "marcus-manager",
      assigneeId: "priya-tech",
      slaDeadline: new Date(Date.now() - 5 * 60 * 1000), // 5 min past SLA!
      slaBreached: true,
      aiSummary: "Connection leak and query lock contention exhausting PostgreSQL PgBouncer pool.",
      aiSuggestedAction: "1. Terminate idle in-transaction connections using `pg_terminate_backend()`.\n2. Add missing composite index on `(department, createdAt)`.\n3. Increase PgBouncer pool size limit to 200 in Neon dashboard.",
      aiRootCause: "Sequential table scan on 2.4M audit trail rows causing query latency >12s, holding client sockets open.",
      aiConfidence: 0.95,
    },
    {
      id: "iss-5",
      title: "Intermittent JWT signature verification failure on mobile token refresh",
      description: "Mobile app users unexpectedly logged out after 15 minutes. Key rotation JWKS endpoint returning stale 404 cache responses on secondary Cloudflare CDN edge.",
      status: IssueStatus.RESOLVED,
      priority: IssuePriority.MEDIUM,
      category: IssueCategory.SOFTWARE,
      department: "Backend & Core APIs",
      source: "MOBILE_APP",
      affectedUrl: "https://auth.workmate.ai/.well-known/jwks.json",
      location: "Auth0 / Custom Go Identity Gateway",
      serviceAssetId: "asset-auth-service",
      reporterId: "demo-user",
      assigneeId: "alex-tech",
      resolutionNotes: "Flushed stale Redis JWKS cache key and synchronized public key rotation grace period to 1 hour across all CDN edge locations.",
      aiSummary: "JWKS public key cache invalidation race condition between primary auth service and edge CDN proxy.",
      aiSuggestedAction: "Purge Cloudflare edge cache for /.well-known/jwks.json and enforce Cache-Control max-age=300.",
      aiRootCause: "Stale edge cache served previous RSA public key during automated bi-weekly rotation.",
      aiConfidence: 0.93,
      resolvedAt: new Date(),
    },
  ];

  for (const iss of issuesData) {
    await prisma.issue.create({ data: iss });
  }
  console.log(`✓ Seeded ${issuesData.length} fresh software incident tickets with AI triage.`);

  // 4. Engineering Collaboration Comments
  const commentsData = [
    {
      id: "comm-1",
      issueId: "iss-1",
      authorId: "marcus-manager",
      content: "Circuit breaker activated. Diverted 80% checkout volume to Stripe secondary rail. Drop rate returned to <0.1%.",
      isAiGenerated: false,
    },
    {
      id: "comm-2",
      issueId: "iss-1",
      authorId: "sarah-admin",
      content: "WorkMate AI Copilot: Downstream merchant bank acknowledged upstream fiber outage in us-east datacenter. ETA for full restoration is 45 minutes.",
      isAiGenerated: true,
    },
    {
      id: "comm-3",
      issueId: "iss-4",
      authorId: "priya-tech",
      content: "Ran EXPLAIN ANALYZE on query. Adding index idx_issue_dept_created. Sequential scans will drop from 12s to 4ms.",
      isAiGenerated: false,
    },
  ];

  for (const c of commentsData) {
    await prisma.comment.create({ data: c });
  }
  console.log(`✓ Seeded ${commentsData.length} software engineering collaboration comments.`);

  // 5. Software Engineering Tasks
  const tasksData = [
    {
      id: "task-1",
      title: "Deploy Terraform update to scale billing worker pods to 12 replicas",
      description: "Update replicas in kubernetes/helm/billing-service.yaml and apply CI/CD deployment.",
      status: TaskStatus.IN_PROGRESS,
      priority: 3,
      category: "DevOps & Cloud SRE",
      ownerId: "david-it-manager",
      issueId: "iss-1",
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
      id: "task-2",
      title: "Hotfix React component dynamic import with ssr: false for analytics chart",
      description: "Prevent browser timezone hydration mismatch by dynamic loading client chart component.",
      status: TaskStatus.TODO,
      priority: 2,
      category: "Frontend & Mobile Engineering",
      ownerId: "alex-tech",
      issueId: "iss-2",
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
    },
    {
      id: "task-3",
      title: "Execute migration for composite index on issue audit trail table",
      description: "Run prisma db push / SQL migration: CREATE INDEX CONCURRENTLY idx_issue_dept_created.",
      status: TaskStatus.DONE,
      priority: 3,
      category: "Database & Platform Infrastructure",
      ownerId: "priya-tech",
      issueId: "iss-4",
    },
  ];

  for (const t of tasksData) {
    await prisma.task.create({ data: t });
  }
  console.log(`✓ Seeded ${tasksData.length} software engineering remediation tasks.`);

  console.log("WorkMate AI Software Engineering dataset seeded successfully!");
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
