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
}
