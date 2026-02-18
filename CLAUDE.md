# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Alecci Media AI Chatbot** - Executive personality-driven AI consultancy platform. Fork of Vercel's Chat SDK with three executive personas (Alexandria, Kim, Collaborative) providing specialized business consulting.

**Supabase Project:** `esymbjpzjjkffpfqukxw`

## Commands

```bash
pnpm dev              # Dev server with Turbopack (localhost:3000)
pnpm build            # Production build
pnpm lint             # Ultracite linter (Biome-based)
pnpm format           # Ultracite formatter

# Testing (Playwright)
pnpm test                                                  # Run all tests
export PLAYWRIGHT=True && pnpm exec playwright test tests/e2e/chat.test.ts  # Single test
pnpm exec playwright test --project=e2e                    # E2E tests only
pnpm exec playwright test --project=routes                 # API route tests only
```

## Architecture

### Tech Stack
- **Framework:** Next.js 15.6+ (App Router, React 19, TypeScript)
- **AI:** Vercel AI SDK 5.x with OpenRouter (Gemini 3 Flash)
- **Database:** Supabase (Postgres with RLS)
- **Auth:** Supabase Auth
- **Storage:** Vercel Blob
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Voice:** ElevenLabs TTS
- **Monitoring:** Sentry

### AI Models (`lib/ai/providers.ts`)

All models use OpenRouter with `google/gemini-3-flash-preview`:
- `chat-model` - Main chat responses
- `chat-model-reasoning` - Complex reasoning tasks
- `artifact-model` - Document generation
- `title-model` - Title generation

### Executive Personality System (`lib/bot-personalities.ts`)

Three personas with distinct system prompts and styling:
- **Alexandria** - CMO, brand strategist (rose gradient)
- **Kim** - CSO, sales/revenue (red gradient)
- **Collaborative** - Both executives together (mixed gradient)

Focus modes: `default`, `business_analysis`, `pricing`, `key_messaging`, `customer_journey`, `social_media`, `launch_strategy`

Note: `social_media` is only available for `alexandria` and `collaborative` (not `kim`).

### Key Directories

```
app/
├── (auth)/           # Supabase Auth routes
├── (chat)/           # Main app (authenticated)
│   ├── api/          # Route handlers: chat, voice, analytics, reactions
│   ├── analytics/    # Usage dashboard
│   └── reports/      # Reports library
lib/
├── ai/
│   ├── providers.ts      # OpenRouter config
│   ├── prompts.ts        # System prompt builder
│   ├── topic-classifier.ts
│   ├── knowledge-base.ts # Per-executive knowledge loading
│   └── tools/            # createDocument, webSearch, etc.
├── bot-personalities.ts  # Executive personas + focus modes
├── db/queries.ts         # All Supabase query functions
├── stripe/url.ts         # Shared Stripe URL utility (getValidAppUrl + domain allowlist)
├── supabase/             # Supabase client creation
└── security/             # Rate limiting, CSRF (withCsrf), input validation
components/
├── chat.tsx              # Main chat interface
├── executive-switch.tsx  # Persona selector
├── focus-mode-selector.tsx
├── message.tsx           # Executive-styled messages
└── voice-player-button.tsx
```

### Database Tables (Supabase)

Key tables in `lib/supabase/types.ts`:
- `User` - Synced from Supabase Auth
- `Chat` - Conversations with `topic`, `topicColor`, `isPinned`, `lastContext`
- `Message_v2` - Messages with `botType`, `parts`, `attachments`
- `Document` - AI artifacts (text, code, image, sheet)
- `Vote_v2`, `MessageReaction` - Feedback
- `ExecutiveMemory` - Per-user executive tracking
- `UserAnalytics` - Usage metrics

All tables have RLS enabled. See `supabase/migrations/` for schema.

### Chat Flow (`app/(chat)/api/chat/route.ts`)

1. Validate with Zod schema
2. Check rate limits (Redis → DB fallback)
3. Truncate to 60 messages (first + recent)
4. Load knowledge base for selected executive
5. Build system prompt (persona + focus mode + knowledge)
6. Stream via AI SDK with tools
7. Auto-classify topic on new chats
8. Save messages to Supabase

### Rate Limits (`lib/ai/entitlements.ts`)

- Guest: 50/day
- Regular: 500/day
- Premium: 2000/day

## Environment Variables

Required:
- `AUTH_SECRET` - NextAuth secret
- `OPENROUTER_API_KEY` - AI model access
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (intentionally client-exposed; security relies on RLS, not ID obscurity)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (intentionally client-exposed; RLS enforces access control)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-side only, never expose)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob
- `STRIPE_SECRET_KEY` - Stripe API key (server-side only)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `NEXT_PUBLIC_APP_URL` - Production URL (exactly `https://bossbrainz.aleccimedia.com`, no trailing slash)

Optional:
- `REDIS_URL` - Rate limiting (falls back to DB) + resumable stream recovery (without Redis, interrupted streams cannot be resumed)
- `TAVILY_API_KEY` - Enhanced web search
- `ELEVENLABS_API_KEY` - Text-to-speech

## Supabase Migrations

Apply via Supabase Dashboard SQL Editor in order:
1. `supabase/migrations/01_create_tables.sql`
2. `supabase/migrations/02_enable_rls.sql`

See `supabase/README.md` for details.

## Testing

Playwright config: `playwright.config.ts`
- **e2e/** - End-to-end chat flows
- **routes/** - API route tests
- **fixtures.ts, helpers.ts** - Test utilities

Dev server auto-starts on `pnpm test`.

## Critical Implementation Notes (DO NOT BREAK)

### Stripe Integration (`lib/stripe/`, `app/api/stripe/`)

- **URL construction**: All Stripe checkout/portal URLs MUST use the `URL` API with `searchParams.set()` for proper encoding. Never manually concatenate query params. The shared utility `lib/stripe/url.ts` → `getValidAppUrl()` handles URL construction with a domain allowlist.
- **Domain allowlist**: `ALLOWED_HOSTS` in `lib/stripe/url.ts` controls valid redirect domains. Production: `bossbrainz.aleccimedia.com`. This prevents open redirect attacks via Origin header.
- **CSRF protection**: Both `app/api/stripe/checkout/route.ts` and `app/api/stripe/portal/route.ts` are wrapped with `withCsrf()` from `lib/security/with-csrf.ts`. The subscribe page (`app/(auth)/subscribe/page.tsx`) sends the CSRF token via `X-CSRF-Token` header. DO NOT remove CSRF from these routes.
- **Webhook idempotency**: `app/api/stripe/webhook/route.ts` checks if a subscription event was already processed via `isAlreadyProcessed()` before updating the User record. This prevents duplicate activations.
- **Subscription type validation**: `validateSubscriptionType()` in the webhook validates against `["monthly", "annual", "lifetime"]` only.
- **Portal URL**: The subscription API (`app/(chat)/api/subscription/route.ts`) uses `getValidAppUrl()` for portal return URLs. Do NOT hardcode `localhost:3000`.
- **Auth callback plan validation**: `app/auth/callback/route.ts` validates the `plan` query param against `["monthly", "annual", "lifetime"]` before redirecting to subscribe page.

### Environment Variables (Vercel)

- **`NEXT_PUBLIC_APP_URL`**: Must be exactly `https://bossbrainz.aleccimedia.com` with NO trailing slash, NO whitespace, NO extra characters. The `getValidAppUrl()` function sanitizes it (trim + strip trailing slashes) but do NOT rely on that as the only safety net.
- **CAUTION with `vercel env add`**: When setting env vars via CLI, use `printf 'value' | vercel env add VAR_NAME production` to avoid interactive prompt characters leaking into the value. Never use `echo` with interactive Vercel prompts.

### Onboarding System (`components/onboarding-modal.tsx`)

- **Single source of truth**: `OnboardingModal` is the ONLY onboarding component. It is rendered in `components/chat.tsx`.
- **DO NOT create additional welcome/onboarding modals or tutorials.** The old `WelcomeModal` and `WelcomeTutorial` were deliberately deleted because they caused duplicate overlapping modals and used unreliable localStorage gating.
- **Gate mechanism**: Checks `onboardedAt` field on the User table via `GET /api/profile`. Only shows if `onboardedAt` is null. Sets `onboardedAt` via `POST /api/profile` → `updateUserProfile()` on form completion.
- **Non-dismissable**: The modal blocks escape key, outside clicks, and has no close button. User MUST complete the 4-step flow (welcome → meet-team → profile → success).
- **DB-backed**: Works across all browsers/devices for the same authenticated user. No localStorage dependency.

### Security Patterns

- **CSRF**: All state-changing API routes that handle sensitive operations (Stripe, profile updates) use `withCsrf()` wrapper. Client-side uses `useCsrf()` hook → `csrfFetch()` for requests.
- **Rate limiting**: `lib/security/` - Redis primary, DB fallback. Limits in `lib/ai/entitlements.ts`.
- **Input validation**: All API routes validate with Zod schemas. See individual route files.

### Design Decisions (Audit Acknowledgements)

These patterns were reviewed during the AI Production Audit and confirmed as intentional. Each has a `// DESIGN(DOC-XX)` comment at the code decision point.

#### CSRF Token Endpoint Unauthenticated (DOC-02)
**Decision:** `/api/csrf` serves tokens without requiring authentication.
**Rationale:** CSRF tokens must be available before auth completes (subscribe page during checkout, login forms). The double-submit pattern (HMAC-signed token in httpOnly cookie + request header) provides security independent of auth state.

#### Subscription GET Graceful Degradation (DOC-03)
**Decision:** `GET /api/subscription` returns `{ isActive: false }` for unauthenticated users instead of 401.
**Rationale:** The subscribe page polls this endpoint after Stripe checkout. During the webhook-to-auth race window, a 401 would break the payment completion flow.

#### Payment Failure Notifications (DOC-04)
**Decision:** `invoice.payment_failed` webhook logs a warning only -- no user or admin notification.
**Rationale:** Stripe handles user-facing dunning (retry emails) automatically. Custom notifications would duplicate and potentially conflict. Admin payment failure dashboard deferred to v2.

#### Focus Mode Client-State Only (DOC-06)
**Decision:** Focus mode is `useState` only -- resets on page reload, not persisted.
**Rationale:** Focus mode is a session-level preference. Persistence (localStorage or per-chat DB column) deferred to v2 pending user feedback.

#### Supabase ID Exposure (DOC-08)
**Decision:** Supabase project ID and anon key are intentionally in `NEXT_PUBLIC_` environment variables.
**Rationale:** Standard Supabase architecture. Security relies on Row-Level Security (RLS) policies on every table, not obscurity of the project ID or anon key.

#### X-XSS-Protection Disabled (DOC-09)
**Decision:** `X-XSS-Protection: 0` set in `vercel.json` instead of enabling it.
**Rationale:** The XSS Auditor is deprecated and removed from all modern browsers. Setting it to `1` can create side-channel data leak vulnerabilities in legacy browsers (per OWASP). CSP provides actual XSS protection.

#### ElevenLabs Cost Estimation (DOC-10)
**Decision:** Voice cost tracked as estimated minutes (`chars / 750`), not exact character-level billing.
**Rationale:** Provides directional usage data. Actual ElevenLabs costs monitored via their dashboard. Rate limiting (500 voice requests/day for regular users) provides cost protection. Character-level tracking with `AICostLog` integration deferred to v2.

### Streaming PII Scan Limitation

- **Detection-only**: The post-hoc PII scan in `app/(chat)/api/chat/route.ts` (onFinish callback) runs AFTER content has been streamed to the client. It can detect and log PII occurrences but CANNOT redact or recall already-streamed text.
- **Why**: Vercel AI SDK streams tokens incrementally to the client. There is no middleware hook to intercept and modify individual tokens before they reach the client in streaming mode. The `safetyMiddleware` in `lib/safety/output-guard.ts` only works on non-streaming (`generateText`) responses.
- **Mitigation**: PII is redacted from user messages before storage (in `saveMessages`). The streaming scan serves as an alert mechanism for unexpected PII in AI responses, triggering security event logs for investigation.
- **DO NOT** attempt to add blocking PII redaction to the streaming path -- it would require buffering the entire response (defeating streaming latency benefits) or modifying the AI SDK transport layer.

## Roadmap

See `ROADMAP.md` for features and `PROGRESS.md` for status.
