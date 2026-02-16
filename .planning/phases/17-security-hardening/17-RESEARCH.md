# Phase 17: Security Hardening - Research

**Researched:** 2026-02-16
**Domain:** Next.js security patterns (XSS, auth bypass, input validation, information disclosure)
**Confidence:** HIGH

## Summary

Phase 17 addresses four specific security findings from the production audit (AI-PRODUCTION-AUDIT.md): C-8, H-2, H-4, and H-10. Each finding maps to a concrete, well-scoped fix with no new dependencies required. The project already has Zod (3.25.76), `next/script` available via Next.js 15.5.11, and established auth patterns via Supabase middleware.

The four fixes are independent of each other with no ordering dependencies. SEC-01 replaces a `dangerouslySetInnerHTML` script tag with the `next/script` component using inline children syntax. SEC-02 converts the blanket `/api/` bypass in middleware to an explicit allowlist. SEC-03 adds Zod validation schemas to the two realtime route handlers. SEC-04 strips internal service names from the unauthenticated health endpoint.

**Primary recommendation:** Each fix is a surgical change to a single file (or two files for SEC-03). No new packages needed. Use existing project patterns (Zod schemas, Supabase auth checks, `ChatSDKError` responses).

## Standard Stack

### Core (Already Installed -- No Changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.11 | Framework, `next/script` component | Already in project |
| zod | 3.25.76 | Input validation schemas | Already used in 20+ route files |
| @supabase/ssr | (installed) | Auth middleware | Already the auth layer |

### Supporting (Already Installed -- No Changes)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-themes | 0.3.x | Theme management (dark/light) | Already handles theme class toggling |

**No new packages need to be installed for this phase.**

## Architecture Patterns

### Pattern 1: Next.js Script Component for Inline Scripts (SEC-01)

**What:** Replace `<script dangerouslySetInnerHTML>` with `<Script id="..." strategy="beforeInteractive">` using inline children syntax.

**Why `beforeInteractive`:** The theme-color meta tag script must execute before paint to avoid a flash of incorrect browser chrome color. The `beforeInteractive` strategy injects into `<head>` server-side, before any hydration. This is the correct strategy for theme initialization scripts in root layout.

**Key constraint:** Inline scripts using the `<Script>` component MUST have an `id` prop for Next.js to track and optimize them. The `beforeInteractive` strategy is valid ONLY in `app/layout.tsx` (root layout).

**Hydration issue (resolved):** GitHub issue #51242 reported hydration errors with `beforeInteractive` in App Router. This was closed/fixed as of April 2024, and Next.js 15.5.11 is well past that fix.

**Current code (app/layout.tsx lines 113-119):**
```tsx
<head>
  <script
    // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
    dangerouslySetInnerHTML={{
      __html: THEME_COLOR_SCRIPT,
    }}
  />
</head>
```

**Target code:**
```tsx
import Script from "next/script";

// In the JSX, inside <html> but the strategy ensures head injection:
<Script id="theme-color-init" strategy="beforeInteractive">
  {THEME_COLOR_SCRIPT}
</Script>
```

**Source:** [Next.js Script Component docs (v16.1.6)](https://nextjs.org/docs/app/api-reference/components/script) -- inline children syntax with `id` prop, [Next.js Inline Scripts guide](https://nextjs.org/docs/app/guides/scripts) -- confirms children syntax: `<Script id="show-banner">{...}</Script>`

### Pattern 2: Middleware Allowlist for API Routes (SEC-02)

**What:** Replace the blanket `request.nextUrl.pathname.startsWith("/api/")` bypass with an explicit allowlist of API routes that genuinely need unauthenticated access.

**Current code (lib/supabase/middleware.ts line 128):**
```typescript
// Allow public routes and API routes
if (isPublicRoute || request.nextUrl.pathname.startsWith("/api/")) {
  return supabaseResponse;
}
```

**Problem:** Any new API route added under `app/api/` is automatically public without auth. If a developer forgets to add individual auth checks inside the handler, the route is completely exposed.

**Target pattern -- explicit allowlist:**
```typescript
// API routes that must be accessible without authentication
const publicApiRoutes = [
  "/api/auth",           // Supabase auth callbacks
  "/api/stripe/webhook", // Stripe sends webhooks without user auth
  "/api/health",         // Monitoring probes (returns only status boolean after SEC-04)
  "/api/demo/chat",      // Demo endpoint for unauthenticated users
  "/api/admin/landing-page", // GET is public (renders landing page)
  "/api/cron/",          // Vercel cron jobs (have own CRON_SECRET auth)
];

const isPublicApiRoute = publicApiRoutes.some(
  (route) => request.nextUrl.pathname === route
    || request.nextUrl.pathname.startsWith(`${route}/`)
);

// Only bypass auth for explicitly listed API routes
if (isPublicRoute || isPublicApiRoute) {
  return supabaseResponse;
}
```

**API routes inventory (app/api/):**
| Route | Needs Public Access | Reason |
|-------|-------------------|--------|
| `/api/auth` | YES | Supabase auth callbacks |
| `/api/stripe/webhook` | YES | Stripe webhook delivery |
| `/api/stripe/checkout` | NO | Has own auth via `withCsrf` + `createClient` |
| `/api/stripe/portal` | NO | Has own auth via `withCsrf` + `createClient` |
| `/api/health` | YES | Monitoring probes (sanitized in SEC-04) |
| `/api/demo/chat` | YES | Demo for unauthenticated visitors |
| `/api/admin/landing-page` GET | YES | Public landing page content |
| `/api/admin/landing-page` POST | NO | Admin-only, has `isUserAdmin` check |
| `/api/admin/mailchimp/backfill` | NO | Admin-only |
| `/api/admin/knowledge-base/fireflies` | NO | Admin-only |
| `/api/cron/expire-subscriptions` | YES | Vercel cron (has own `CRON_SECRET` check) |
| `/api/cron/cleanup-deleted-data` | YES | Vercel cron (has own auth) |

**Note on (chat)/api routes:** Routes under `app/(chat)/api/` are already protected by the `(chat)` layout which checks auth. They are NOT under the `/api/` path in the URL -- Next.js route groups `(chat)` are invisible in the URL. So `app/(chat)/api/chat/route.ts` maps to `/api/chat`, which means it IS under the `/api/` prefix. The middleware allowlist must account for this. All `(chat)/api/` routes have their own auth checks internally, but defense-in-depth means the middleware should only allow known-public ones through.

**Critical insight:** The `app/(chat)/api/` routes map to URL paths like `/api/chat`, `/api/realtime`, `/api/voice` etc. These are NOT public -- they all require auth internally. The middleware must redirect unauthenticated users to login for these routes, rather than letting them through to get a 401 from the handler. This is defense-in-depth.

### Pattern 3: Zod Validation for Realtime Routes (SEC-03)

**What:** Add Zod schemas to validate the request body in both realtime route handlers, matching the pattern already used extensively in the project.

**Current code (both realtime routes):**
```typescript
const { message, botType = "collaborative" } = await request.json();

if (!message || typeof message !== "string") {
  return new ChatSDKError("bad_request:api").toResponse();
}
```

**Problem:** No length limit on `message`. An attacker can send a massive string that gets passed to the AI model, consuming tokens and causing DoS.

**Target pattern (using existing project conventions):**
```typescript
import { z } from "zod";

const realtimeRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
  botType: z.enum(["alexandria", "kim", "collaborative"]).default("collaborative"),
  chatId: z.string().uuid().optional(), // Only in stream route
});

// In the handler:
const parseResult = realtimeRequestSchema.safeParse(await request.json());
if (!parseResult.success) {
  return new ChatSDKError("bad_request:api").toResponse();
}
const { message, botType, chatId } = parseResult.data;
```

**Message length limit rationale:** The chat schema uses `max(10000)`. For realtime/voice, 5000 characters is generous (voice messages are short). The AI response is already capped at 400-500 `maxOutputTokens`, so input should be proportionally limited.

**Reference:** The existing `app/(chat)/api/chat/schema.ts` uses exactly this pattern with `.safeParse()`.

### Pattern 4: Health Endpoint Information Minimization (SEC-04)

**What:** Either require authentication OR strip internal service names from the response.

**Current response (unauthenticated):**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-16T...",
  "services": {
    "database": { "status": "up" },
    "ai-gateway": { "status": "up" },
    "elevenlabs": { "status": "up" }
  }
}
```

**Problem:** Exposes internal service topology (database, ai-gateway, elevenlabs) to anyone. Attackers learn what services the app depends on and can target them.

**Recommended approach -- two-tier response:**
```typescript
export async function GET(request: Request) {
  // Run all health checks (same as before)
  // ...

  // Check if authenticated user is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Authenticated: return full details
    return NextResponse.json({ status: overall, timestamp, services }, { status: overall === "healthy" ? 200 : 503 });
  }

  // Unauthenticated: return only status boolean
  return NextResponse.json(
    { status: overall === "healthy" ? "ok" : "degraded" },
    { status: overall === "healthy" ? 200 : 503 }
  );
}
```

**Why two-tier over auth-only:** Health endpoints are commonly used by external monitoring services (UptimeRobot, Vercel, load balancers) that cannot authenticate. Requiring auth would break monitoring. A two-tier approach preserves monitoring compatibility while hiding internal details.

### Anti-Patterns to Avoid

- **Anti-pattern: Moving theme script to an external .js file.** While some guides suggest `strategy="beforeInteractive" src="/theme-init.js"`, this adds an extra HTTP request for a tiny script. Inline children syntax is correct here.
- **Anti-pattern: Using a blocklist for API routes.** "Block everything except these" (allowlist) is safer than "allow everything except these" (blocklist). New routes default to protected.
- **Anti-pattern: Wrapping request.json() in try/catch without Zod.** Manual validation misses edge cases. Zod handles type coercion, missing fields, and length limits in one declaration.
- **Anti-pattern: Requiring auth on health endpoint and breaking monitoring.** Two-tier is the standard pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request body validation | Manual `typeof` checks | Zod `z.object().safeParse()` | Zod catches all edge cases, provides typed output |
| Inline script injection | Raw `<script dangerouslySetInnerHTML>` | `next/script` with inline children | Next.js tracks, optimizes, and safely injects |
| Route auth gating | Per-handler auth only | Middleware allowlist + per-handler auth | Defense in depth; middleware is the first gate |

**Key insight:** All four fixes use patterns already established in the codebase. No new abstractions needed.

## Common Pitfalls

### Pitfall 1: Forgetting the `id` prop on inline Script
**What goes wrong:** Next.js silently fails to optimize/track inline scripts without an `id` prop. In development, you may get a warning; in production, the script may not execute correctly.
**Why it happens:** The `id` is easy to forget because raw `<script>` tags don't require it.
**How to avoid:** Always add `id="descriptive-name"` to inline `<Script>` components.
**Warning signs:** Script not executing, console warnings about missing id.

### Pitfall 2: The `(chat)` route group URL mapping
**What goes wrong:** Developers assume `app/(chat)/api/realtime/route.ts` maps to a different URL than `/api/realtime`. It does NOT -- the `(chat)` group is invisible in URLs.
**Why it happens:** Route groups are a folder convention, not a URL segment.
**How to avoid:** When building the allowlist, list actual URL paths, not file system paths. Test with `curl` against the actual URL.
**Warning signs:** Routes unexpectedly blocked or unexpectedly public.

### Pitfall 3: Breaking Stripe webhooks with middleware auth
**What goes wrong:** If `/api/stripe/webhook` is not in the public API allowlist, Stripe webhook delivery fails because Stripe cannot authenticate as a user.
**Why it happens:** Stripe webhooks have their own signature verification (not Supabase auth).
**How to avoid:** Ensure `/api/stripe/webhook` is always in the public API allowlist. Same for cron routes that use `CRON_SECRET`.
**Warning signs:** Stripe webhook events failing, subscriptions not activating.

### Pitfall 4: `beforeInteractive` placement in layout
**What goes wrong:** Placing `<Script strategy="beforeInteractive">` outside the root layout causes it to be ignored or throw errors.
**Why it happens:** `beforeInteractive` is only valid in `app/layout.tsx` (root layout).
**How to avoid:** Keep it in the root layout. Place it inside the `<html>` tag (it auto-injects into `<head>` regardless of position).
**Warning signs:** Script not executing, build warnings.

### Pitfall 5: Overly strict message length limit breaking legitimate use
**What goes wrong:** Setting message max length too low (e.g., 500 chars) blocks users pasting business context into voice chat.
**Why it happens:** Over-correction for the DoS risk.
**How to avoid:** Use 5000 chars for realtime (generous for voice). The main chat already uses 10000.
**Warning signs:** Users reporting "message too long" errors in voice mode.

### Pitfall 6: Health endpoint returning different HTTP status codes
**What goes wrong:** Changing the 503 status code for degraded state breaks monitoring tools that expect specific status codes.
**Why it happens:** Refactoring the response shape without preserving HTTP semantics.
**How to avoid:** Keep 200 for healthy, 503 for degraded. Only change the response body, not status codes.
**Warning signs:** Monitoring false alerts after deployment.

## Code Examples

### SEC-01: Replace dangerouslySetInnerHTML with next/script

```tsx
// Source: https://nextjs.org/docs/app/guides/scripts#inline-scripts
// File: app/layout.tsx

import Script from "next/script";

// THEME_COLOR_SCRIPT constant stays the same (lines 80-96)

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Script id="theme-color-init" strategy="beforeInteractive">
          {THEME_COLOR_SCRIPT}
        </Script>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
          enableSystem={false}
        >
          <Toaster position="top-center" />
          <Suspense>{children}</Suspense>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Note:** The `<head>` tag is removed entirely since `next/script` with `beforeInteractive` auto-injects into `<head>`. The biome-ignore comment is also removed since `dangerouslySetInnerHTML` is no longer used.

### SEC-02: Middleware allowlist

```typescript
// Source: Existing middleware pattern in lib/supabase/middleware.ts
// File: lib/supabase/middleware.ts

// Replace line 128's blanket /api/ bypass with:

// API routes that are accessible without user authentication.
// All other /api/ routes require an authenticated session.
// NOTE: Some of these routes have their own auth (CRON_SECRET, Stripe signatures).
const publicApiRoutes = [
  "/api/auth",              // Supabase auth callbacks
  "/api/stripe/webhook",    // Stripe webhook (has signature verification)
  "/api/health",            // Monitoring probes (returns minimal info)
  "/api/demo/chat",         // Demo chat for unauthenticated visitors
  "/api/admin/landing-page",// Landing page content (GET is public)
  "/api/cron/",             // Vercel cron jobs (have CRON_SECRET auth)
];

const isPublicApiRoute = request.nextUrl.pathname.startsWith("/api/") &&
  publicApiRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`)
  );

// Allow public page routes and explicitly listed public API routes
if (isPublicRoute || isPublicApiRoute) {
  return supabaseResponse;
}

// All other routes (including unlisted /api/ routes) require auth
```

### SEC-03: Zod validation for realtime routes

```typescript
// Source: Existing pattern from app/(chat)/api/chat/schema.ts
// File: app/(chat)/api/realtime/route.ts (and similar for stream/route.ts)

import { z } from "zod";

const realtimeRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message too long"),
  botType: z
    .enum(["alexandria", "kim", "collaborative"])
    .default("collaborative"),
});

// Inside the handler, replace manual validation with:
let parsed: z.infer<typeof realtimeRequestSchema>;
try {
  parsed = realtimeRequestSchema.parse(await request.json());
} catch {
  return new ChatSDKError("bad_request:api").toResponse();
}

const { message, botType } = parsed;
// Remove the old manual checks for message and botType
```

For the stream route, extend the schema:
```typescript
const realtimeStreamRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message too long"),
  botType: z
    .enum(["alexandria", "kim", "collaborative"])
    .default("collaborative"),
  chatId: z.string().uuid().optional(),
});
```

### SEC-04: Two-tier health endpoint

```typescript
// File: app/api/health/route.ts
import { NextResponse } from "next/server";
import { isCircuitOpen } from "@/lib/resilience";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  const services: Record<string, { status: "up" | "down" }> = {};
  let overall: "healthy" | "degraded" = "healthy";

  // Check Supabase connectivity
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("User").select("id").limit(1);
    services.database = { status: error ? "down" : "up" };
    if (error) overall = "degraded";
  } catch {
    services.database = { status: "down" };
    overall = "degraded";
  }

  // Check circuit breaker states
  const aiGatewayOpen = isCircuitOpen("ai-gateway");
  const elevenLabsOpen = isCircuitOpen("elevenlabs");

  services["ai-gateway"] = { status: aiGatewayOpen ? "down" : "up" };
  services.elevenlabs = { status: elevenLabsOpen ? "down" : "up" };

  if (aiGatewayOpen) overall = "degraded";

  const statusCode = overall === "healthy" ? 200 : 503;

  // Check if caller is authenticated -- return detailed info only for auth users
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Authenticated: full details
      return NextResponse.json(
        { status: overall, timestamp: new Date().toISOString(), services },
        { status: statusCode }
      );
    }
  } catch {
    // Auth check failed -- fall through to minimal response
  }

  // Unauthenticated: minimal response (no service names)
  return NextResponse.json(
    { status: overall === "healthy" ? "ok" : "degraded" },
    { status: statusCode }
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<script dangerouslySetInnerHTML>` | `<Script id="..." strategy="beforeInteractive">{...}</Script>` | Next.js 11+ (stable in 15.x) | Safer, tracked by Next.js |
| Blanket `/api/` bypass in middleware | Explicit allowlist of public API routes | Best practice, no version change | Defense-in-depth |
| Manual `typeof` checks for input | Zod `.safeParse()` schemas | Already adopted in this project | Consistent validation pattern |
| Full service details in health | Two-tier (auth/unauth) health response | Common pattern in production apps | Prevents information disclosure |

**CVE-2025-29927 note:** A critical Next.js middleware bypass via `x-middleware-subrequest` header was disclosed in early 2025, affecting versions 11.x-15.x. Vercel-hosted deployments are automatically protected. This project runs on Vercel, so it is not affected, but worth noting for awareness. Self-hosted deployments must patch.

## Open Questions

1. **Admin-only health details vs. any-authenticated-user details**
   - What we know: The code example above returns full details for any authenticated user.
   - What's unclear: Should only admins see full service details?
   - Recommendation: Start with any-authenticated-user (simpler). Admin-only can be added later if needed. Monitoring tools typically use unauthenticated probes anyway, so the authenticated path is mainly for developer debugging.

2. **Exact message length limit for realtime**
   - What we know: Main chat uses 10000 chars. Voice responses are capped at 400-500 tokens.
   - What's unclear: The perfect limit is debatable.
   - Recommendation: Use 5000 chars. This is generous for voice input while preventing abuse. Can be adjusted based on real usage data.

3. **Should `/api/admin/landing-page` GET remain public?**
   - What we know: The GET handler uses `createServiceClient()` (no user auth) to fetch landing page content for public rendering.
   - What's unclear: Whether the landing page fetch should go through a different mechanism.
   - Recommendation: Keep it public in the allowlist. The route is designed for public content. The POST handler has its own `isUserAdmin` check.

## Sources

### Primary (HIGH confidence)
- [Next.js Script Component API Reference (v16.1.6)](https://nextjs.org/docs/app/api-reference/components/script) -- inline children, `id` prop requirement, `beforeInteractive` strategy
- [Next.js Inline Scripts Guide](https://nextjs.org/docs/app/guides/scripts) -- confirmed children syntax `<Script id="...">{code}</Script>`
- Codebase files directly read: `app/layout.tsx`, `middleware.ts`, `lib/supabase/middleware.ts`, `app/(chat)/api/realtime/route.ts`, `app/(chat)/api/realtime/stream/route.ts`, `app/api/health/route.ts`, `app/(chat)/api/chat/schema.ts`
- `AI-PRODUCTION-AUDIT.md` -- findings C-8, H-2, H-4, H-10

### Secondary (MEDIUM confidence)
- [GitHub issue #51242](https://github.com/vercel/next.js/issues/51242) -- `beforeInteractive` hydration issue, closed/fixed April 2024
- [CVE-2025-29927 Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) -- middleware bypass via x-middleware-subrequest header
- [next-themes issue #78](https://github.com/pacocoursey/next-themes/issues/78) -- theme-color meta tag discussion

### Tertiary (LOW confidence)
- None. All findings are verified against official docs or codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, versions verified from installed packages
- Architecture: HIGH -- all four patterns are verified against official Next.js docs and existing codebase conventions
- Pitfalls: HIGH -- derived from direct codebase analysis and verified against known issues

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable patterns, no fast-moving dependencies)
