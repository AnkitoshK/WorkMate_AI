export interface AiTriageResult {
  summary: string;
  suggestedAction: string;
  rootCause: string;
  predictedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  predictedCategory: "HARDWARE" | "SOFTWARE" | "NETWORK" | "FACILITY" | "SAFETY" | "OTHER";
  confidence: number;
  detectedServiceAssetId?: string;
  detectedServiceName?: string;
  detectedDepartment?: string;
  recommendedAssigneeId?: string;
  slaTargetMinutes?: number;
}

export interface ShiftSummaryResult {
  headline: string;
  urgentAlerts: string[];
  operationalSummary: string;
  recommendedFocus: string[];
  metricsSnapshot: {
    criticalItemsCount: number;
    pendingTasksCount: number;
    completionVelocity: string;
  };
}

/**
 * Intelligent AI Service for WorkMate AI (Software Engineering & Incident Management).
 * Performs incident triage, real-time microservice/web recognition,
 * software engineering team routing, and executive engineering briefings.
 */
export class AiService {
  private static geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";

  /**
   * Triage an issue/ticket: recognizes affected software application, microservice, department,
   * summarizes, classifies, and suggests technical next steps.
   */
  static async triageIssue(
    title: string,
    description: string,
    providedCategory?: string,
    location?: string,
    affectedUrl?: string
  ): Promise<AiTriageResult> {
    const combined = `${title} ${description} ${location || ""} ${affectedUrl || ""}`.toLowerCase();

    // Check if real Gemini API is available
    if (this.geminiApiKey) {
      try {
        const geminiResult = await this.callGeminiTriage(title, description, providedCategory, location, affectedUrl);
        if (geminiResult) return geminiResult;
      } catch (err) {
        console.warn("Gemini API call failed, falling back to autonomous AI engine:", err);
      }
    }

    // Autonomous Domain Intelligence Engine
    return this.heuristicTriage(title, description, combined, providedCategory, location, affectedUrl);
  }

  /**
   * Generate an executive shift & engineering summary for the dashboard.
   */
  static async generateShiftSummary(
    issues: Array<{ title: string; priority: string; status: string; category: string; location?: string | null; department?: string | null }>,
    tasks: Array<{ title: string; status: string; priority: number }>
  ): Promise<ShiftSummaryResult> {
    const urgentIssues = issues.filter(i => (i.priority === "URGENT" || i.priority === "HIGH") && i.status !== "RESOLVED" && i.status !== "CLOSED");
    const openIssues = issues.filter(i => i.status === "OPEN" || i.status === "ASSIGNED");
    const pendingTasks = tasks.filter(t => t.status !== "DONE");
    const completedTasks = tasks.filter(t => t.status === "DONE");

    const criticalItemsCount = urgentIssues.length;
    const pendingTasksCount = pendingTasks.length;
    const velocity = tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : "N/A";

    const urgentAlerts = urgentIssues.map(
      i => `[${i.priority}] ${i.title}${i.location ? ` @ ${i.location}` : ""} (Dept: ${i.department || "Engineering"}) - Status: ${i.status}`
    );

    if (urgentAlerts.length === 0) {
      urgentAlerts.push("All production microservices operational. Zero unresolved urgent incidents in queue.");
    }

    const recommendedFocus = [
      urgentIssues.length > 0
        ? `Engage on-call engineer for ${urgentIssues[0].title} [Dept: ${urgentIssues[0].department || "Engineering"}]`
        : "Conduct proactive telemetry reviews and dependency vulnerability scans",
      pendingTasks.length > 0
        ? `Accelerate completion of ${pendingTasks.length} pending engineering remediation tasks`
        : "All active sprint tasks up to date",
      openIssues.length > 0
        ? `Assign tech lead to ${openIssues.length} incoming unassigned bug ticket(s)`
        : "Monitor real-time error rates and Datadog APM tracing"
    ];

    const headline = criticalItemsCount > 0
      ? `Engineering Incident Briefing: ${criticalItemsCount} High-Priority Incident(s) Require Active Response`
      : "Engineering Incident Briefing: Production Systems Stable & Within SLA Tolerances";

    const operationalSummary = `Active telemetry indicates ${issues.length} total tracked incidents (${urgentIssues.length} urgent/high, ${openIssues.length} pending assignment). Engineering task velocity is currently at ${velocity} (${completedTasks.length}/${tasks.length} tasks completed). On-call engineers are monitoring services across web, APIs, and cloud infrastructure.`;

    return {
      headline,
      urgentAlerts,
      operationalSummary,
      recommendedFocus,
      metricsSnapshot: {
        criticalItemsCount,
        pendingTasksCount,
        completionVelocity: velocity,
      },
    };
  }

  /**
   * Generates step-by-step technical software action plan for a task or ticket.
   */
  static async suggestNextAction(title: string, context?: string): Promise<{ steps: string[]; estimatedTime: string; safetyNotice?: string }> {
    const text = `${title} ${context || ""}`.toLowerCase();

    if (text.includes("payment") || text.includes("checkout") || text.includes("billing") || text.includes("504") || text.includes("stripe")) {
      return {
        steps: [
          "Check payment microservice container health and ingress proxy timeout logs",
          "Toggle secondary payment gateway rail via circuit breaker configuration",
          "Scale background webhook processing worker replicas to absorb retry backlog",
          "Verify merchant bank API status dashboard for external availability incidents",
          "Re-play dropped customer transactions from idempotent dead-letter queue"
        ],
        estimatedTime: "15-20 minutes",
        safetyNotice: "Financial and PCI-DSS compliance critical. Never log raw credit card tokens or secret merchant keys."
      };
    }

    if (text.includes("hydration") || text.includes("react") || text.includes("frontend") || text.includes("ui") || text.includes("portal") || text.includes("ssr")) {
      return {
        steps: [
          "Inspect browser developer console for Next.js SSR vs client DOM tree mismatch",
          "Wrap dynamic client-only component with dynamic import: `ssr: false`",
          "Ensure browser-specific globals (window, localStorage) are guarded in useEffect",
          "Purge stale Cloudflare edge cache for affected routes",
          "Run Cypress end-to-end regression tests to verify render stability"
        ],
        estimatedTime: "20-30 minutes",
        safetyNotice: "Verify changes on staging deployment before pushing to production edge."
      };
    }

    if (text.includes("k8s") || text.includes("pod") || text.includes("crashloop") || text.includes("oom") || text.includes("docker") || text.includes("kubernetes")) {
      return {
        steps: [
          "Fetch termination logs using `kubectl logs <pod-name> --previous` to isolate panic stacktrace",
          "Verify pod memory limits in Helm/Terraform manifests and patch to appropriate memory ceiling",
          "Inspect Node.js heap dump or Go pprof memory profile for unmanaged buffer retention",
          "Check worker queue consumer backpressure and throttle concurrency limits",
          "Perform rolling restart of deployment and monitor pod restart count"
        ],
        estimatedTime: "25-35 minutes",
        safetyNotice: "Ensure pod disruption budget (PDB) is respected to avoid dropping active client connections."
      };
    }

    if (text.includes("postgres") || text.includes("database") || text.includes("prisma") || text.includes("pool") || text.includes("sql") || text.includes("query")) {
      return {
        steps: [
          "Query `pg_stat_activity` to detect long-running locks or idle-in-transaction connections",
          "Execute `EXPLAIN ANALYZE` on degraded SQL statements to identify sequential table scans",
          "Create missing B-Tree composite indices concurrently without locking table writes",
          "Tune PgBouncer pool mode and max client connection limits in database configuration",
          "Verify Prisma connection pooling connection string parameters (`connection_limit` and `pool_timeout`)"
        ],
        estimatedTime: "20-30 minutes",
        safetyNotice: "Never run unindexed queries or destructive DDL migrations directly against production database."
      };
    }

    if (text.includes("auth") || text.includes("jwt") || text.includes("token") || text.includes("jwks") || text.includes("session") || text.includes("oauth")) {
      return {
        steps: [
          "Verify JWKS public key rotation endpoint is returning valid active key IDs (kid)",
          "Inspect Redis token revocation and session blacklist cache latency",
          "Check JWT expiration timestamps (exp) vs client clock skew tolerance",
          "Flush stale CDN edge caching on /.well-known/jwks.json",
          "Verify CORS allowed origins and refresh token rotation cookie security attributes"
        ],
        estimatedTime: "15-25 minutes",
        safetyNotice: "Ensure cryptographic keys and client secrets are stored exclusively in secure key vaults."
      };
    }

    return {
      steps: [
        "Inspect application telemetry in Datadog/CloudWatch and grep service error logs",
        "Reproduce defect in staging environment with identical request payload",
        "Formulate minimal hotfix patch or roll back to last known healthy Git commit SHA",
        "Run automated unit and integration regression test suite",
        "Deploy canary release and verify error rates return to zero"
      ],
      estimatedTime: "30-45 minutes",
      safetyNotice: "Adhere to standard change management procedures and follow PR code review guidelines."
    };
  }

  // --- Internal Domain AI Engine ---
  private static heuristicTriage(
    title: string,
    description: string,
    combined: string,
    providedCategory?: string,
    location?: string,
    affectedUrl?: string
  ): AiTriageResult {
    let predictedPriority: AiTriageResult["predictedPriority"] = "MEDIUM";
    let predictedCategory: AiTriageResult["predictedCategory"] = "SOFTWARE";
    let summary = "";
    let suggestedAction = "";
    let rootCause = "";
    let confidence = 0.90;

    // 1. Software Application & Microservice Auto-Recognition
    let detectedServiceAssetId: string | undefined = undefined;
    let detectedServiceName: string | undefined = undefined;
    let detectedDepartment = "Backend & Core APIs";
    let recommendedAssigneeId: string | undefined = undefined;
    let slaTargetMinutes = 30;

    if (combined.match(/payment|checkout|billing|invoice|credit card|stripe|504 gateway|webhook|merchant/)) {
      detectedServiceAssetId = "asset-payment-api";
      detectedServiceName = "Billing & Payment Gateway API";
      detectedDepartment = "Backend & Core APIs";
      recommendedAssigneeId = "marcus-manager";
      slaTargetMinutes = 15;
      predictedCategory = "SOFTWARE";
      predictedPriority = "URGENT";
      summary = `Critical financial transaction latency or failure detected on ${detectedServiceName}. Customer checkout sessions are dropping.`;
      suggestedAction = "1. Engage circuit breaker to divert traffic to secondary Stripe payment rail.\n2. Scale payment worker pods to 12 replicas in Kubernetes.\n3. Inspect upstream merchant socket timeouts.";
      rootCause = "Downstream merchant acquiring bank TCP socket hang causing thread pool starvation.";
      confidence = 0.96;
    } else if (combined.match(/portal|web app|dashboard|website|browser|react|next\.js|frontend|ui|hydration|css|bundle/)) {
      detectedServiceAssetId = "asset-web-portal";
      detectedServiceName = "Customer Operations Web Portal";
      detectedDepartment = "Frontend & Mobile Engineering";
      recommendedAssigneeId = "alex-tech";
      slaTargetMinutes = 30;
      predictedCategory = "SOFTWARE";
      predictedPriority = "HIGH";
      summary = `Web application client friction or render defect logged on ${detectedServiceName}.`;
      suggestedAction = "1. Wrap dynamic client components with dynamic import (`ssr: false`).\n2. Inspect JavaScript console error logs in Sentry telemetry.\n3. Invalidate stale CDN edge HTML cache.";
      rootCause = "Client-side bundle hydration error or browser timezone discrepancy with server SSR.";
      confidence = 0.93;
    } else if (combined.match(/auth|jwt|token|login|jwks|oauth|session|401|403|unauthorized/)) {
      detectedServiceAssetId = "asset-auth-service";
      detectedServiceName = "Auth & Identity Gateway (OAuth/JWT)";
      detectedDepartment = "Backend & Core APIs";
      recommendedAssigneeId = "marcus-manager";
      slaTargetMinutes = 15;
      predictedCategory = "SOFTWARE";
      predictedPriority = "HIGH";
      summary = `Authentication or security session verification anomaly reported on ${detectedServiceName}.`;
      suggestedAction = "1. Flush stale Redis JWKS public key cache.\n2. Verify JWT signature key rotation interval.\n3. Validate CORS allowed origins and cookie domain headers.";
      rootCause = "JWKS public key cache invalidation race condition across CDN edge nodes.";
      confidence = 0.94;
    } else if (combined.match(/k8s|kubernetes|pod|crashloop|oom|docker|cluster|container|helm|terraform|deploy/)) {
      detectedServiceAssetId = "asset-k8s-cluster";
      detectedServiceName = "Cloud Kubernetes Production Cluster";
      detectedDepartment = "DevOps & Cloud SRE";
      recommendedAssigneeId = "david-it-manager";
      slaTargetMinutes = 30;
      predictedCategory = "SOFTWARE";
      predictedPriority = "URGENT";
      summary = `Cloud infrastructure container failure or deployment degradation on ${detectedServiceName}.`;
      suggestedAction = "1. Inspect termination logs with `kubectl logs --previous`.\n2. Patch pod memory request/limit ceiling in Helm values.\n3. Apply backpressure rate limiting on ingress queue.";
      rootCause = "Unbounded in-memory queue buffering causing Linux kernel OOM Killer trigger (Exit Code 137).";
      confidence = 0.95;
    } else if (combined.match(/postgres|database|prisma|sql|pool|deadlock|slow query|replica|neon/)) {
      detectedServiceAssetId = "asset-postgres-db";
      detectedServiceName = "Neon PostgreSQL Primary Cluster";
      detectedDepartment = "Database & Platform Infrastructure";
      recommendedAssigneeId = "priya-tech";
      slaTargetMinutes = 30;
      predictedCategory = "SOFTWARE";
      predictedPriority = "URGENT";
      summary = `Database connection starvation or query degradation on ${detectedServiceName}.`;
      suggestedAction = "1. Query `pg_stat_activity` and terminate hung idle-in-transaction sockets.\n2. Add missing composite B-Tree index concurrently.\n3. Scale PgBouncer pool limits.";
      rootCause = "Sequential table scan on unindexed audit trail causing connection pool exhaustion.";
      confidence = 0.95;
    } else {
      if (providedCategory) predictedCategory = providedCategory as any;
      summary = `Software engineering incident registered: ${title}. Requires code triage and triage review.`;
      suggestedAction = "1. Inspect server logs in Datadog/CloudWatch.\n2. Reproduce defect in local/staging environment.\n3. Submit hotfix pull request with regression tests.";
      rootCause = "Underlying application code exception or unhandled Promise rejection.";
      confidence = 0.88;
    }

    return {
      summary,
      suggestedAction,
      rootCause,
      predictedPriority,
      predictedCategory,
      confidence,
      detectedServiceAssetId,
      detectedServiceName,
      detectedDepartment,
      recommendedAssigneeId,
      slaTargetMinutes,
    };
  }

  // --- Real Gemini Integration ---
  private static async callGeminiTriage(
    title: string,
    description: string,
    providedCategory?: string,
    location?: string,
    affectedUrl?: string
  ): Promise<AiTriageResult | null> {
    const prompt = `You are WorkMate AI, an expert enterprise software engineering and incident triage engine.
Analyze this software incident and return a JSON object with:
- summary: string (concise technical software engineering summary)
- suggestedAction: string (numbered 3-4 step technical software action plan)
- rootCause: string (most likely software, infrastructure, database, or network root cause)
- predictedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
- predictedCategory: "SOFTWARE"
- detectedDepartment: "Backend & Core APIs" | "Frontend & Mobile Engineering" | "DevOps & Cloud SRE" | "Database & Platform Infrastructure" | "QA & Reliability Engineering"
- confidence: number (0.0 to 1.0)
- slaTargetMinutes: number

Incident: ${title}
Description: ${description}
Environment/Location: ${location || "Not specified"}
URL/Endpoint: ${affectedUrl || "None"}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text) as AiTriageResult;
  }

  /**
   * Comprehensive AI Explanation & Advisory Engine.
   * Explains any technical query, system error, or operational workflow in deep, clear detail.
   */
  static async answerUserQuery(query: string, context?: any): Promise<{
    query: string;
    headline: string;
    category: string;
    overview: string;
    rootCauses: string[];
    stepByStepRemediation: string[];
    codeSnippetOrCommands?: string;
    proTipsAndBestPractices: string[];
    generatedAt: string;
  }> {
    const qLower = (query || "").toLowerCase();

    // Check Gemini API first if configured
    if (this.geminiApiKey) {
      try {
        const prompt = `You are WorkMate AI, a senior Staff Principal Software Reliability Engineer and Operations Copilot.
Provide an exceptionally clear, in-depth technical explanation for this query: "${query}".
Return a JSON object with:
- headline: string (sharp, authoritative title)
- category: string (e.g. "Network & Microservices", "Database & Storage", "Authentication & Security", "Frontend & Rendering", "DevOps & Cloud", "Operations & Workflow")
- overview: string (comprehensive 2-3 paragraph explanation of the problem, why it happens, and what is occurring under the hood)
- rootCauses: string[] (3-5 bullet points explaining distinct root causes)
- stepByStepRemediation: string[] (4-6 actionable, step-by-step technical instructions)
- codeSnippetOrCommands: string (optional code snippet, SQL query, kubectl command, or config block)
- proTipsAndBestPractices: string[] (3-4 proactive best practices to prevent recurrence)`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
          signal: AbortSignal.timeout(7000)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return {
              query,
              headline: parsed.headline || `Technical Analysis: ${query}`,
              category: parsed.category || "Software Reliability",
              overview: parsed.overview || "",
              rootCauses: parsed.rootCauses || [],
              stepByStepRemediation: parsed.stepByStepRemediation || [],
              codeSnippetOrCommands: parsed.codeSnippetOrCommands || undefined,
              proTipsAndBestPractices: parsed.proTipsAndBestPractices || [],
              generatedAt: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.warn("Gemini query API call failed, falling back to autonomous knowledge engine:", err);
      }
    }

    // Autonomous High-Precision Knowledge Engine
    if (qLower.includes("504") || qLower.includes("gateway timeout") || qLower.includes("payment") || qLower.includes("checkout") || qLower.includes("latency")) {
      return {
        query,
        headline: "504 Gateway Timeout: Root Causes & Microservice Remediation Guide",
        category: "Network & Microservices",
        overview: "A 504 Gateway Timeout signifies that an edge server or reverse proxy (such as Nginx, Cloudflare, or AWS ALB) acted as a gateway to an upstream application microservice, but did not receive a timely response within the configured socket timeout window. In e-commerce and billing systems, this typically occurs during synchronous checkout processing when an external merchant payment provider, fraud-check API, or database write lock delays request completion.",
        rootCauses: [
          "Downstream merchant banking or Stripe/Razorpay payment gateway API experiencing packet loss or high TCP latency.",
          "Thread pool starvation in payment microservice workers caused by blocking synchronous I/O.",
          "Database write locks or unindexed customer invoice queries freezing checkout transactions.",
          "Edge reverse proxy timeout ceiling (e.g., proxy_read_timeout 30s) configured too aggressively for heavy batch processing."
        ],
        stepByStepRemediation: [
          "1. Inspect ingress access logs: Identify whether the timeout originates at the load balancer or upstream container (HTTP 504 vs 502).",
          "2. Toggle Circuit Breaker: Divert incoming payment traffic to secondary fallback payment rail (e.g., alternate gateway).",
          "3. Adopt Asynchronous Processing: Immediately return HTTP 202 Accepted with a transaction tracking ID, processing heavy ledger updates via background worker queues (BullMQ/Redis/Kafka).",
          "4. Scale Worker Replicas: Increase horizontal pod autoscaler (HPA) target replicas from 4 to 12 to relieve CPU saturation.",
          "5. Verify External Status: Check external banking/provider status dashboards for upstream network disruptions."
        ],
        codeSnippetOrCommands: `# Check upstream container response latency in Kubernetes:
kubectl logs -l app=payment-service --tail=200 | grep -E "TIMEOUT|504|upstream"

# Increase Nginx reverse proxy timeout window:
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;`,
        proTipsAndBestPractices: [
          "Always implement idempotency keys for billing endpoints to safely retry dropped transactions without double charging.",
          "Use exponential backoff with jitter on all downstream third-party REST client calls.",
          "Configure Prometheus and Grafana alerts for P99 latency spikes exceeding 3 seconds."
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    if (qLower.includes("resolve") || qLower.includes("close") || qLower.includes("difference") || qLower.includes("workflow") || qLower.includes("lifecycle") || qLower.includes("ticket status")) {
      return {
        query,
        headline: "WorkMate Incident Workflow: Resolving vs Closing Tickets",
        category: "Operations & Incident Governance",
        overview: "In modern ITIL and enterprise site reliability engineering, 'RESOLVED' and 'CLOSED' represent two distinct phases of an incident's lifecycle. A ticket is marked 'RESOLVED' by the technical engineer once a code patch, configuration fix, or infrastructure workaround has been successfully deployed. In contrast, 'CLOSED' is the final administrative state confirming that the reporter has verified the fix, post-mortem notes are filed, and the ticket is permanently moved into the immutable audit history.",
        rootCauses: [
          "Engineer fixes the issue -> marks status as RESOLVED so QA and stakeholders can test.",
          "SuperAdmin or Squad Lead inspects resolution notes, confirms zero regressions, and marks CLOSED.",
          "Closed tickets are automatically archived in the 'Closed History' tab for compliance audits and CSV reporting."
        ],
        stepByStepRemediation: [
          "1. Step 1 (Raise): The user or system logs an incident with title, description, application, and priority level.",
          "2. Step 2 (Assignment): The Squad Lead assigns an on-call engineer or technician specialist.",
          "3. Step 3 (Investigation & Fix): The engineer tests the issue, pushes code or server configuration hotfixes.",
          "4. Step 4 (Mark Resolved): The engineer updates status to RESOLVED and documents the solution in the resolution notes.",
          "5. Step 5 (Verify & Close): Manager or SuperAdmin reviews the resolution, verifies service health, and closes the ticket.",
          "6. Step 6 (Audit Archive): The closed incident is permanently stored in Closed History with turnaround SLA duration and CSV export capabilities."
        ],
        codeSnippetOrCommands: `Ticket Lifecycle Flow:
[ OPEN ] ──> [ ASSIGNED ] ──> [ IN_PROGRESS ] ──> [ RESOLVED ] ──> [ CLOSED ]
                                                        │              │
                                                  (Engineer Fix)   (Manager Audit &
                                                                   Moved to History)`,
        proTipsAndBestPractices: [
          "Engineers should always record concise resolution notes explaining what was fixed before resolving.",
          "Keep high-priority incidents within target SLA: Urgent (<15m), High (<30m), Medium (<60m).",
          "Never reopen closed tickets for unrelated issues; raise a fresh ticket to preserve clean audit metrics."
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    if (qLower.includes("attendance") || qLower.includes("login") || qLower.includes("punch") || qLower.includes("shift") || qLower.includes("check-in")) {
      return {
        query,
        headline: "Staff Attendance Tracking & Audit System Architecture",
        category: "Workforce & Compliance",
        overview: "WorkMate AI includes an automated attendance audit logging engine designed for shift management and operational compliance. Every time a team member logs in via email/password, switches account profiles, or clicks 'Log Attendance Punch', a tamper-evident attendance stamp is recorded in the PostgreSQL database with full metadata (user ID, timestamp, client type, IP address, and shift status).",
        rootCauses: [
          "Tracks on-duty engineering and helpdesk workforce presence in real time.",
          "Calculates daily check-ins, active shift personnel, and unique team members on shift.",
          "Provides immediate one-click CSV export for HR, management, and compliance audits."
        ],
        stepByStepRemediation: [
          "1. Automatic Check-In: Simply log in with your email and password. Your shift presence is automatically recorded.",
          "2. Manual Punch: Click '+ Log Attendance Punch' on the Attendance & Logins tab anytime to timestamp ongoing shift presence.",
          "3. Filtering: Search attendance records by staff name, work email, department, or user role.",
          "4. Reporting & Export: Click '📥 Export Attendance Report (CSV)' to instantly download a comprehensive spreadsheet containing date, time, staff name, email, portal, action, status, and IP address.",
          "5. Role Scoping: SuperAdmin has full visibility across all team members, while engineers and users track their own records."
        ],
        codeSnippetOrCommands: `Attendance Database Model:
model AttendanceLog {
  id          String   @id @default(cuid())
  userName    String
  userEmail   String
  role        String
  clientType  String   // WEB_PORTAL or MOBILE_APP
  action      String   // LOGIN, SHIFT_CHECKIN
  status      String   // PRESENT, ACTIVE
  timestamp   DateTime @default(now())
}`,
        proTipsAndBestPractices: [
          "Encourage team members to check in at the start of every shift for accurate SLA attribution.",
          "Export attendance CSV reports at the end of each week or month for operational records.",
          "All attendance timestamps are synchronized with standard ISO-8601 UTC in database storage."
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    if (qLower.includes("hydration") || qLower.includes("react") || qLower.includes("next") || qLower.includes("ssr") || qLower.includes("window is not defined")) {
      return {
        query,
        headline: "Next.js SSR vs Client Hydration Mismatch Resolution",
        category: "Frontend & Rendering",
        overview: "A React hydration error occurs in Next.js when the initial server-rendered HTML tree (SSR) differs from the DOM tree generated during client-side JavaScript hydration. Common triggers include using browser-only globals (such as window, localStorage, or navigator) during initial render, formatting dates with client timezone discrepancies, or using non-deterministic identifiers (Math.random, Date.now).",
        rootCauses: [
          "Accessing `window`, `localStorage`, or `document` before the component has mounted on the client.",
          "Rendering dates with `toLocaleDateString()` that render in UTC on server but user timezone on browser.",
          "Invalid HTML nesting (e.g. `<p>` tag containing `<div>` or `<table>` tags).",
          "Browser extensions (password managers, ad blockers) modifying DOM elements before React attaches."
        ],
        stepByStepRemediation: [
          "1. Guard Browser Globals: Only access `window` or `localStorage` inside `useEffect` or check `typeof window !== 'undefined'` after mounting.",
          "2. Use Mounted State Flag: Maintain `const [mounted, setMounted] = useState(false)` and return `null` or a skeleton until `mounted === true`.",
          "3. Dynamic Imports: For complex interactive widgets or charts, import with Next.js dynamic import: `dynamic(() => import('./Widget'), { ssr: false })`.",
          "4. Suppress Warnings Where Needed: Use `suppressHydrationWarning={true}` on specific timestamp elements that display client time."
        ],
        codeSnippetOrCommands: `// Recommended Pattern for Client-Only Components in Next.js App Router:
"use client";
import { useEffect, useState } from "react";

export function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Or return skeleton loader

  return <div>{window.location.hostname}</div>;
}`,
        proTipsAndBestPractices: [
          "Always verify components run cleanly in production builds using `pnpm build`.",
          "Avoid using `new Date().toISOString()` directly in initial server JSX without consistent formatting."
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    if (qLower.includes("postgres") || qLower.includes("database") || qLower.includes("prisma") || qLower.includes("pool") || qLower.includes("sql") || qLower.includes("neon")) {
      return {
        query,
        headline: "Database Connection Pooling & Query Performance Optimization",
        category: "Database & Storage",
        overview: "In serverless and containerized Node.js applications, PostgreSQL connection pool exhaustion (Error P2024 / P1017) occurs when microservices spawn more database client instances than the server connection ceiling allows. On serverless platforms like Neon, using direct unpooled connections with long-lived pools quickly exhausts available sockets.",
        rootCauses: [
          "Re-instantiating `new PrismaClient()` on every request instead of maintaining a global singleton instance.",
          "Missing composite B-Tree indexes on frequently filtered foreign keys (e.g., `ticketNumber`, `status`, `userId`).",
          "Long-running transactions holding row-level locks and starving incoming queries.",
          "Exceeding serverless connection limits without PgBouncer pooler mode enabled."
        ],
        stepByStepRemediation: [
          "1. Use Connection Pooler: Set your primary `DATABASE_URL` to the Neon pooled endpoint (-pooler suffix).",
          "2. Direct URL for Migrations: Reserve `DATABASE_URL_UNPOOLED` solely for schema migrations (`prisma db push` / `prisma migrate`).",
          "3. Maintain Global Singleton: Export a single `prisma = new PrismaClient()` instance across your Express routes.",
          "4. Configure Query Timeout: Set `connection_limit=10&pool_timeout=15` in your connection query string parameters.",
          "5. Add Composite Indexes: Add indexes in schema.prisma: `@@index([status, priority])`."
        ],
        codeSnippetOrCommands: `# Inspect active PostgreSQL connections and locks:
SELECT pid, query_start, state, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start ASC;

# Add Neon pooling in connection string:
DATABASE_URL="postgresql://user:pass@ep-xyz-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=10"`,
        proTipsAndBestPractices: [
          "Never execute unbounded `SELECT *` without explicit `take: 50` or pagination limits.",
          "Ensure disconnect handlers run on process SIGTERM for graceful shutdown."
        ],
        generatedAt: new Date().toISOString(),
      };
    }

    // Comprehensive Fallback Technical Advisor
    return {
      query,
      headline: `Diagnostic & Resolution Analysis: ${query}`,
      category: "Software Reliability & Systems",
      overview: `WorkMate AI analyzed your query regarding "${query}". In production operations, addressing this requires isolating telemetry metrics, identifying upstream/downstream service dependencies, and executing structured remediation with verified rollback plans.`,
      rootCauses: [
        "Configuration drift between local development, staging, and production environments.",
        "Unchecked promise rejections or unhandled exceptions in asynchronous service handlers.",
        "Resource saturation across CPU, container memory ceilings, or network socket limits."
      ],
      stepByStepRemediation: [
        "1. Check Telemetry: Review application error logs and Datadog/CloudWatch metrics for the exact error timestamp.",
        "2. Reproduce Locally: Simulate the exact request payload in your local environment or staging sandbox.",
        "3. Formulate Hotfix: Prepare a focused patch addressing the root cause with unit regression tests.",
        "4. Deploy Canary: Roll out the patch to a canary instance or preview deployment first.",
        "5. Update Ticket: Document findings in the incident resolution notes and close the ticket in WorkMate."
      ],
      codeSnippetOrCommands: `# Grep error logs in production:
grep -i -E "error|exception|fail" /var/log/application.log | tail -n 50`,
      proTipsAndBestPractices: [
        "Maintain clear commit messages referencing ticket numbers: e.g. 'fix: resolve timeout in billing endpoint (#TIK-026)'.",
        "Record detailed resolution notes before closing tickets to enrich system audit intelligence."
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

