# Phase 28: Logging & Observability - Research

**Researched:** 2026-03-01
**Domain:** Structured logging, observability, production debugging
**Confidence:** HIGH

## Summary

Phase 28 aims to complete migration from `console.error` to structured Pino logging, achieving 100% coverage (up from 98%). The codebase has strong logging infrastructure already in place (Pino, Sentry integration, request ID tracking via middleware), but 49 `console.error` calls remain scattered across client components, error boundaries, and scripts. The migration requires systematic replacement with structured logging patterns while maintaining Sentry correlation via request IDs.

**Current state:**
- ✅ Pino configured with environment-based formatters (JSON in prod, pretty in dev)
- ✅ `apiRequestLogger` utility provides request-scoped logging
- ✅ Request ID generation in middleware (`x-request-id` header)
- ✅ Sentry configured with `pinoIntegration` and user context
- ❌ 49 `console.error` calls bypass structured logging and Sentry correlation
- ❌ Client-side errors lack request ID propagation
- ❌ No systematic error context capture (user ID, endpoint, operation)

**Primary recommendation:** Implement a tiered migration strategy: (1) Create client-side logger utility with Sentry integration, (2) Replace API route `console.error` with `apiRequestLogger.error()`, (3) Replace component errors with client logger, (4) Add request ID to all Pino error logs, (5) Verify Sentry correlation via smoke test.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino | 10.2.0 | Structured logging | Industry standard for Node.js - 5x faster than Winston, async-first, JSON-native |
| pino-pretty | 13.1.3 | Dev pretty-printing | Official Pino development tool for human-readable logs |
| @sentry/nextjs | 10.32.1 | Error monitoring | De facto standard for production error tracking in Next.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sentry.pinoIntegration | Built-in (10.18.0+) | Pino-Sentry bridge | Always - captures Pino logs as Sentry logs/events |
| @vercel/otel | Built-in | OpenTelemetry | Already configured for distributed tracing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pino | Winston | Winston is heavier (5x slower), but has more transports. Pino's performance critical for high-throughput APIs |
| Sentry pinoIntegration | pino-sentry (npm) | Third-party package - official integration preferred for long-term support |
| Manual request IDs | AsyncLocalStorage | More complex for Next.js App Router - header propagation simpler and works with middleware |

**Installation:**
```bash
# Already installed - no new packages needed
pnpm install pino pino-pretty @sentry/nextjs
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── logger.ts              # Base logger config + createRequestLogger
├── api-logging.ts         # apiRequestLogger utility (server-side)
├── audit/
│   └── logger.ts          # Audit log integration
└── sentry.ts              # Sentry helpers (breadcrumbs)

app/
├── (chat)/api/*/route.ts  # Use apiRequestLogger.error()
└── instrumentation.ts     # Sentry init with pinoIntegration
```

### Pattern 1: API Route Request-Scoped Logging
**What:** Every API route creates a request-scoped logger with automatic timing and request ID
**When to use:** All API routes (already implemented in `/api/chat`)
**Example:**
```typescript
// Source: /home/qualia/Projects/Live-Projects/aibossbrainz/lib/api-logging.ts
export function apiRequestLogger(route: string) {
  const startTime = Date.now();
  let childLogger: Logger;
  let requestId: string | undefined;

  return {
    start(context?: { userId?: string; requestId?: string }) {
      requestId = context?.requestId || crypto.randomUUID().slice(0, 8);
      childLogger = baseLogger.child({
        requestId,
        route,
        ...(context?.userId && { userId: context.userId }),
      });
      childLogger.info({ route, phase: "start" }, `Request started: ${route}`);
    },

    error(error: unknown, context?: Record<string, unknown>) {
      const duration = Date.now() - startTime;
      const errorContext = {
        route,
        phase: "error",
        duration,
        ...context,
        error: error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            }
          : { error: String(error) },
      };
      childLogger?.error(errorContext, `Request failed: ${route}`);
    },
  };
}
```

### Pattern 2: Middleware Request ID Generation
**What:** Middleware generates unique request ID and adds to response headers
**When to use:** All requests (already implemented)
**Example:**
```typescript
// Source: /home/qualia/Projects/Live-Projects/aibossbrainz/lib/supabase/middleware.ts
export function generateRequestId(request: NextRequest): string {
  const vercelId = request.headers.get("x-vercel-id");
  if (vercelId) return vercelId;
  return crypto.randomUUID();
}

export async function updateSession(request: NextRequest) {
  const requestId = generateRequestId(request);
  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set("x-request-id", requestId);
  // ...
}
```

### Pattern 3: Sentry Correlation with Pino
**What:** Sentry pinoIntegration automatically captures Pino logs as Sentry events
**When to use:** Production environments (already configured)
**Example:**
```typescript
// Source: /home/qualia/Projects/Live-Projects/aibossbrainz/instrumentation.ts
Sentry.init({
  dsn: env.SENTRY_DSN,
  enableLogs: true,
  integrations: [
    Sentry.pinoIntegration({
      error: { levels: ["error", "fatal"] },  // Capture as Sentry events
      log: { levels: ["info", "warn", "error"] },  // Send to Sentry logs
    }),
  ],
});
```

### Pattern 4: Client-Side Error Logging (NEW - needed for this phase)
**What:** Client components need structured logging without server-side Pino
**When to use:** React components, hooks, error boundaries
**Example:**
```typescript
// NEW: lib/client-logger.ts (to be created)
import * as Sentry from "@sentry/nextjs";

export function logClientError(
  error: unknown,
  context: {
    component?: string;
    action?: string;
    userId?: string;
    [key: string]: unknown;
  }
) {
  // Always send to Sentry in production
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      tags: {
        component: context.component,
        action: context.action,
      },
      extra: context,
    });
  }

  // Development: still use console for visibility
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context.component}] ${context.action}:`, error, context);
  }
}

// Usage:
logClientError(err, {
  component: "PaywallModal",
  action: "checkout_failed",
  userId: user?.id,
});
```

### Anti-Patterns to Avoid
- **Calling logger in client components:** Pino is server-only. Use Sentry SDK directly on client.
- **Logging before apiLog.start():** Creates logs without request ID - defeats correlation.
- **Mixing console.error with structured logging:** Inconsistent log format breaks parsing/alerting.
- **Over-logging in client boundaries:** Error boundaries re-render - avoid duplicate logs per error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log aggregation | Custom log shipper | Vercel built-in (stdout → Vercel Logs) | Vercel automatically aggregates stdout JSON logs - no custom shipper needed |
| Request ID propagation | Custom context manager | Middleware + headers | AsyncLocalStorage unreliable in Next.js App Router - headers are standard |
| Error deduplication | Custom error tracking | Sentry fingerprinting | Sentry dedupes by stack trace + context - mature implementation |
| PII redaction in logs | Regex-based scrubber | Pino serializers + redact | Pino has built-in `redact` feature - battle-tested for compliance |
| Log level filtering | Custom if-statements | Pino level config | Pino handles level filtering performantly - skips serialization for disabled levels |

**Key insight:** Observability platforms (Vercel, Sentry) provide infrastructure. Your code should emit well-structured logs and let the platform handle aggregation, alerting, and correlation. Building custom log infrastructure creates maintenance burden without value-add.

## Common Pitfalls

### Pitfall 1: Client vs Server Logging Confusion
**What goes wrong:** Importing `lib/logger.ts` (Pino) in client components crashes with "server-only" error.
**Why it happens:** Pino uses Node.js APIs (fs, streams) unavailable in browser runtime.
**How to avoid:**
- Mark `lib/logger.ts` with `import "server-only";` directive (already done)
- Create separate `lib/client-logger.ts` using Sentry SDK for browser errors
- Lint rule: Flag Pino imports in `components/` or `hooks/`
**Warning signs:** Build errors mentioning "Module not found: Can't resolve 'fs'" or "server-only" violations.

### Pitfall 2: Missing Request ID in Error Logs
**What goes wrong:** Error logs lack `requestId` field, making Sentry correlation impossible.
**Why it happens:** Using base `logger.error()` instead of request-scoped child logger.
**How to avoid:**
- API routes: Always use `apiRequestLogger.error()` (has requestId from `.start()`)
- Middleware errors: Use `getRequestLogger(request)` to create child logger
- Background jobs: Generate synthetic requestId with `crypto.randomUUID()`
**Warning signs:** Sentry events without request context, inability to trace full request lifecycle.

### Pitfall 3: Sentry Event Flood from console.error
**What goes wrong:** Sentry captures `console.error` calls as events via `consoleLoggingIntegration`, consuming error quota rapidly.
**Why it happens:** Current config: `Sentry.consoleLoggingIntegration({ levels: ["error"] })` (in `instrumentation.ts:85`)
**How to avoid:**
- Remove console.error calls from production code
- If console.error necessary (e.g., error boundaries), add Sentry context first: `Sentry.captureException(error)`
- Consider rate limiting via `beforeSend` hook if unavoidable
**Warning signs:** Sentry quota exhausted, duplicate events for same error (console + Pino).

### Pitfall 4: Losing Stack Traces in Error Logs
**What goes wrong:** Error logged as `{ error: "[object Object]" }` - no stack trace, no context.
**Why it happens:** Passing error directly to JSON serialization without structure.
**How to avoid:**
- Use Pino's `err` serializer: `logger.error({ err: error }, "Message")`
- For non-Error objects: `logger.error({ error: error instanceof Error ? error : String(error) }, "Message")`
- apiRequestLogger already handles this (see Pattern 1)
**Warning signs:** Sentry events with "Unknown error" message, inability to identify error source.

### Pitfall 5: Development Logs Overwhelming Console
**What goes wrong:** Pretty-printed logs flood terminal during development, hiding React errors.
**Why it happens:** `LOG_LEVEL=debug` + `pino-pretty` logs every request/response.
**How to avoid:**
- Default to `LOG_LEVEL=info` in `.env.local`
- Use `LOG_LEVEL=debug` selectively when debugging specific issues
- Consider filtering routes: `if (route.includes('/api/chat')) apiLog.start()`
**Warning signs:** Cannot see React stack traces, terminal scrolls too fast to read.

### Pitfall 6: Async Logging Race Conditions on Crash
**What goes wrong:** Application crashes before error log is flushed to disk/network.
**Why it happens:** Pino is async by default - buffers logs for performance.
**How to avoid:**
- Use `pino.final()` for fatal errors: creates synchronous logger for last message before exit
- In process.on('uncaughtException'): flush with `logger.flush()` if available
- Vercel serverless: Less critical (logs flushed on function termination)
**Warning signs:** Missing logs for crashes, last log entry before crash not recorded.

## Code Examples

Verified patterns from existing codebase:

### API Route Error Handling (Server-Side)
```typescript
// Source: app/(chat)/api/chat/route.ts (current best practice)
export const POST = withCsrf(async (request: Request) => {
  const apiLog = apiRequestLogger("/api/chat");
  apiLog.start();

  try {
    // ... request handling ...
    apiLog.success({ messageCount: 5 });
    return new Response(stream);
  } catch (error) {
    apiLog.error(error, {
      userId: user?.id,
      chatId: body.id,
      operation: "chat_stream"
    });
    return new Response("Internal error", { status: 500 });
  }
});
```

### Component Error (Client-Side - Target Pattern)
```typescript
// Target: Replace console.error with Sentry SDK
// Before:
try {
  await checkoutAction();
} catch (error) {
  console.error("Checkout error:", error);  // ❌ Lost in prod, no Sentry correlation
}

// After:
import * as Sentry from "@sentry/nextjs";

try {
  await checkoutAction();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: "PaywallModal", action: "checkout" },
    extra: { userId: user?.id, plan: selectedPlan },
  });
  // Optional: Still log to console in dev
  if (process.env.NODE_ENV === "development") {
    console.error("Checkout error:", error);
  }
}
```

### Error Boundary (Client-Side - Target Pattern)
```typescript
// Source: components/error-boundary.tsx (current)
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error("ErrorBoundary caught an error:", error, errorInfo);  // ❌
}

// Target:
import * as Sentry from "@sentry/nextjs";

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  Sentry.captureException(error, {
    tags: { boundary: "RootErrorBoundary" },
    extra: {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    },
  });
}
```

### Background Job Logging (Server-Side - Target Pattern)
```typescript
// Target: Cron jobs, webhooks without HTTP request
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const jobId = crypto.randomUUID();
  const jobLogger = logger.child({
    jobId,
    job: "cost-check",
    source: "cron"
  });

  jobLogger.info("Job started");

  try {
    // ... job work ...
    jobLogger.info({ processed: 150 }, "Job completed");
  } catch (error) {
    jobLogger.error({ err: error, phase: "execution" }, "Job failed");
    throw error;  // Let Vercel/Sentry catch for alerting
  }
}
```

### Audit Log Integration
```typescript
// Source: lib/audit/logger.ts (already using structured logging)
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    // ... Supabase insert ...
    if (error) {
      logger.error(  // ✅ Already using Pino
        {
          err: error,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
        },
        "Failed to write audit log",
      );
    }
  } catch (error) {
    logger.error(  // ✅ Already using Pino
      { err: error, action: input.action, resource: input.resource },
      "Exception during audit logging",
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.error everywhere | Pino structured logging | 2024-2025 (98% migrated) | Machine-parseable logs, Sentry correlation, production debugging capability |
| Manual request tracking | Middleware-generated request IDs | Current implementation | Every request has unique ID in headers + logs |
| Separate Sentry calls | Pino + pinoIntegration | Sentry 10.18.0+ (2024) | Single logging call → both Pino JSON + Sentry event |
| Winston + bunyan ecosystem | Pino dominance | 2022-2023 | Pino now de facto standard for Node.js performance-critical apps |
| Manual log correlation | OpenTelemetry traces | Current (Vercel OTel) | Distributed tracing across services (already configured) |

**Deprecated/outdated:**
- **pino-sentry (npm package):** Replaced by official `Sentry.pinoIntegration()` in @sentry/nextjs 10.18.0+
- **Custom log transports in serverless:** Vercel auto-ingests stdout JSON - custom transports add overhead
- **File-based logging on Vercel:** Ephemeral filesystem - logs must go to stdout for persistence

## Open Questions

1. **Should client-side logs also emit to Vercel Analytics?**
   - What we know: Sentry captures client errors; Vercel Analytics has custom events API
   - What's unclear: Whether duplicating to Vercel Analytics provides value (redundant with Sentry)
   - Recommendation: Start with Sentry only. Vercel Analytics better for business metrics (page views, conversions) than error logging.

2. **How to handle console.error in scripts/ folder?**
   - What we know: Scripts run outside Next.js (conversion scripts, Playwright tests)
   - What's unclear: Whether scripts need production logging (they're dev-time utilities)
   - Recommendation: Keep console.error for scripts - they're not production code. Focus migration on app/ and lib/.

3. **Rate limiting for error logs?**
   - What we know: Error flood can exhaust Sentry quota and create alert fatigue
   - What's unclear: Whether to implement app-level rate limiting or rely on Sentry's deduplication
   - Recommendation: Trust Sentry's fingerprinting for now. If quota issues arise, add `beforeSend` sampling (e.g., 10% for "Failed to fetch" errors).

4. **How to test Sentry correlation in development?**
   - What we know: Sentry disabled in NODE_ENV=development
   - What's unclear: Best way to verify request ID → Sentry event correlation works
   - Recommendation: Create smoke test script that temporarily enables Sentry in dev, triggers error with known requestId, queries Sentry API to verify correlation.

## Sources

### Primary (HIGH confidence)
- [Pino Logger Complete Guide (SigNoz)](https://signoz.io/guides/pino-logger/) - Official Pino documentation and best practices
- [Sentry Pino Integration Docs](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/pino/) - Official integration configuration
- Existing codebase: `/lib/logger.ts`, `/lib/api-logging.ts`, `/lib/supabase/middleware.ts` - Current implementation patterns

### Secondary (MEDIUM confidence)
- [Structured Logging for Next.js (Arcjet)](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) - Next.js-specific patterns
- [Pino Next.js Example (GitHub)](https://github.com/pinojs/pino-nextjs-example) - Official Pino example for Next.js
- [Better Stack: Complete Guide to Pino Logging](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) - Production best practices
- [Next.js Logging Best Practices (Prateeksha)](https://prateeksha.com/blog/nextjs-logging-best-practices-structured-logs-production) - Console.log vs structured logging
- [Building Production Observability Stack 2026 (Medium)](https://medium.com/@krishnafattepurkar/building-a-production-ready-observability-stack-the-complete-2026-guide-9ec6e7e06da2) - Observability architecture
- [Avoiding console.log in Production (DEV)](https://dev.to/franklinthaker/avoiding-consolelog-in-production-best-practices-for-robust-logging-5me) - Migration rationale
- [Node.js Logging Best Practices (Better Stack)](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/) - 11 production best practices
- [Migrating to Structured Logs (Datable)](https://www.datable.io/post/migrate-unstructured-logs) - Migration strategy

### Tertiary (LOW confidence)
- WebSearch results on correlation IDs - General patterns, not Pino-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pino and Sentry are installed, configured, and working in production
- Architecture: HIGH - Existing patterns verified in codebase, only client-side pattern is new
- Pitfalls: MEDIUM - Based on codebase observation + web research, but not battle-tested in this specific app yet
- Migration strategy: HIGH - Codebase already 98% migrated, patterns proven to work

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (30 days - stable stack, no major version changes expected)

**Key findings for planner:**
1. Infrastructure already excellent - focus is systematic console.error removal, not rearchitecture
2. Client vs server logging split is critical (Pino server-only, Sentry client-side)
3. Request ID propagation already works - just need to ensure error logs include it
4. 49 console.error occurrences catalogued - mostly in components/hooks (33), some in API routes (8), scripts (8)
5. Verification should test request ID → Sentry correlation, not just "logs appear"
