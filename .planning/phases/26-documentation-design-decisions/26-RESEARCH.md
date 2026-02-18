# Phase 26: Documentation & Design Decisions - Research

**Researched:** 2026-02-18
**Domain:** Code documentation, design decision records, CLAUDE.md accuracy
**Confidence:** HIGH

## Summary

Phase 26 is a documentation-only phase. No new features, no code logic changes. The goal is to document 10 informational audit findings (I-1 through I-10) as intentional design decisions, considered enhancements, or accepted trade-offs. Each finding maps to a DOC requirement.

This phase breaks into three categories: (1) documenting existing intentional behavior via code comments and CLAUDE.md updates (DOC-01, DOC-02, DOC-03, DOC-05, DOC-08), (2) evaluating options and recording accept/defer decisions (DOC-04, DOC-06, DOC-09, DOC-10), and (3) fixing a factual inaccuracy in CLAUDE.md (DOC-07). No libraries to install, no database migrations, no runtime changes.

The codebase investigation reveals that most of these "findings" are already handled correctly -- they just lack documentation explaining WHY. The focus mode mismatch (DOC-07) is the only actual bug: CLAUDE.md lists `brand_crisis`, `launch_campaign`, `pipeline_audit`, `deal_closing`, `market_entry`, `team_scaling` but the implementation uses `default`, `business_analysis`, `pricing`, `key_messaging`, `customer_journey`, `social_media`, `launch_strategy`.

**Primary recommendation:** Add inline code comments at each decision point, update CLAUDE.md with a new "Design Decisions" section, and fix the focus modes list. No code logic changes needed.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Code comments | N/A | Inline documentation at decision points | First place developers look for rationale |
| CLAUDE.md | N/A | Project-level AI assistant context | Already the canonical documentation for this project |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| JSDoc `@remarks` | Extended rationale in function docstrings | For decisions that need multi-line explanation |
| `// DESIGN:` comment prefix | Inline design decision marker | For quick searchability across codebase |

No npm packages needed for this phase.

## Architecture Patterns

### Pattern 1: Design Decision Comments
**What:** Standardized inline comments that explain WHY a design choice was made, not just WHAT the code does.
**When to use:** At every point where a conscious trade-off was made that future developers might question.

**Convention:**
```typescript
// DESIGN(DOC-XX): [Brief rationale]
// [Optional: link to audit finding or longer explanation]
```

**Example (DOC-01 - updateDocumentPrompt):**
```typescript
// DESIGN(DOC-01): Code content uses lighter sanitization (XML delimiters only)
// rather than full sanitizePromptContent(). Aggressive sanitization mangles
// code delimiters (```, ===, ---) which are valid code content. The XML
// wrapper with do_not_follow_instructions_in_content="true" provides
// sufficient prompt injection protection for code artifacts.
if (type === "code") {
  return `...`;
}
```

### Pattern 2: CLAUDE.md Design Decisions Section
**What:** A dedicated section in CLAUDE.md documenting intentional trade-offs that audits might flag.
**When to use:** For decisions that affect multiple files or represent project-wide choices.

**Structure:**
```markdown
### Design Decisions (Audit Acknowledgements)

#### [Topic] (DOC-XX)
**Decision:** [What was decided]
**Rationale:** [Why]
**Status:** Accepted / Deferred to v2
```

### Anti-Patterns to Avoid
- **Documenting in separate files only:** Comments belong IN the code, not just in external docs. Developers hitting the code should see the rationale immediately.
- **Over-documenting:** Don't write paragraphs. 1-3 lines per decision point is sufficient inline. Use CLAUDE.md for longer explanations.
- **Documenting WHAT instead of WHY:** "This function returns null for unauthenticated users" is useless. "Returns null instead of 403 because the subscribe page polls this endpoint before auth completes" is useful.

## Requirement-by-Requirement Analysis

### DOC-01: updateDocumentPrompt Code Handling (I-1)
**Current state:** `lib/ai/prompts.ts:276-310` -- The `updateDocumentPrompt` function already handles code differently from text/sheet content. Code gets XML wrapper only; text/sheet gets full `sanitizePromptContent()`.

**Finding:** This is an intentional trade-off. The code comment at line 294 already says "Lighter sanitization for code" but doesn't explain WHY aggressive sanitization breaks code.

**Action:** Add a `// DESIGN(DOC-01)` comment explaining that `sanitizePromptContent()` mangles code delimiters (`---`, `===`, triple backticks) which are legitimate code content. The XML wrapper with `do_not_follow_instructions_in_content` attribute provides sufficient injection protection.

**Confidence:** HIGH -- verified by reading `lib/ai/prompts.ts`

### DOC-02: CSRF Token Design (I-2)
**Current state:** `app/(chat)/api/csrf/route.ts` serves CSRF tokens via unauthenticated GET endpoint. The `useCsrf` hook in `hooks/use-csrf.ts` fetches tokens on client mount.

**Finding:** The CSRF endpoint is intentionally unauthenticated. CSRF tokens must be available BEFORE the user authenticates (e.g., subscribe page, login forms). The token is HMAC-signed (`random.hash(random+secret)`) and set as httpOnly/strict cookie, so even if obtained by an attacker, it only works with the matching cookie (double-submit pattern).

**Action:** Add comment in `app/(chat)/api/csrf/route.ts` explaining the unauthenticated design and add a note in CLAUDE.md's Security Patterns section.

**Confidence:** HIGH -- verified by reading `lib/security/csrf.ts` and `app/(chat)/api/csrf/route.ts`

### DOC-03: Subscription GET Behavior (I-3)
**Current state:** `app/(chat)/api/subscription/route.ts` lines 89-98 -- GET returns `{ isActive: false, ... }` for unauthenticated users instead of a 401 error.

**Finding:** This is intentional. The subscribe page (`app/(auth)/subscribe/page.tsx`) polls this endpoint after Stripe checkout to detect when the webhook has activated the subscription. During this polling window, the auth session may not be fully established yet. Returning 401 would break the payment flow.

**Action:** Add inline comment at lines 89-98 explaining the polling use case. Reference the subscribe page.

**Confidence:** HIGH -- verified by reading the route and the comment already says "needed for subscribe page polling"

### DOC-04: Payment Failure Notifications (I-4)
**Current state:** `app/api/stripe/webhook/route.ts` lines 509-513 -- `invoice.payment_failed` is handled but only logs a warning. No user notification is sent.

**Finding:** Stripe handles dunning (retry emails) automatically via their built-in dunning functionality. Adding custom payment failure emails would duplicate Stripe's built-in behavior and could confuse users with conflicting communications. However, adding an admin notification for failed payments would be valuable for visibility.

**Action:** Document as "Accepted with enhancement deferred" -- Stripe handles user-facing dunning emails. Add a `// DESIGN(DOC-04)` comment. Consider deferring admin notification for failed payments to v2.

**Confidence:** HIGH -- Stripe's dunning behavior is well-documented

### DOC-05: Stream Recovery Redis Requirement (I-5)
**Current state:** `app/(chat)/api/chat/route.ts` lines 106-122 -- `getStreamContext()` creates a `ResumableStreamContext` from the `resumable-stream` package (v2.0.0+). If `REDIS_URL` is missing, it logs info and returns null. The stream endpoint (`app/(chat)/api/chat/[id]/stream/route.ts` line 23) returns 204 if no stream context.

**Finding:** Resumable streams require Redis. Without Redis, stream resumption silently degrades -- interrupted streams cannot be recovered. The app works fine without Redis (streams just aren't resumable), but this is undocumented.

**Action:** Add comment in `getStreamContext()` and document in CLAUDE.md under Environment Variables that `REDIS_URL` enables resumable streams, and without it, interrupted responses cannot be recovered mid-stream.

**Confidence:** HIGH -- verified by reading the code and the `resumable-stream` package requirement

### DOC-06: Focus Mode Persistence (I-6)
**Current state:** `components/chat.tsx` line 127 -- `const [focusMode, setFocusMode] = useState<FocusMode>("default")`. Focus mode is client-side React state only. It resets to "default" on page reload or navigation.

**Evaluation:**
- **localStorage:** Simple, zero-cost, persists across reloads within same browser. Drawback: not synced across devices/browsers.
- **Database (per-chat):** Store `focusMode` on the Chat record. Persists across devices. Adds a DB column and migration. More complex.
- **Database (per-user preference):** Store last-used focus mode on User record. Simpler than per-chat but less granular.

**Recommendation:** Accept current behavior (client-state only) for v1. Focus mode is a session-level preference, not critical data. Users select it at the start of a conversation and it persists for the duration of that tab session. Document the decision and defer persistence to v2 if user feedback requests it.

**Confidence:** HIGH -- straightforward state management analysis

### DOC-07: Update CLAUDE.md Focus Modes (I-7)
**Current state (CLAUDE.md line 53):**
```
Focus modes: `default`, `brand_crisis`, `launch_campaign`, `pipeline_audit`, `deal_closing`, `market_entry`, `team_scaling`
```

**Actual implementation (`lib/bot-personalities.ts` lines 4-11):**
```typescript
export type FocusMode =
  | "default"
  | "business_analysis"
  | "pricing"
  | "key_messaging"
  | "customer_journey"
  | "social_media"
  | "launch_strategy";
```

**Finding:** CLAUDE.md is completely wrong. None of the listed focus modes match the actual implementation. This is a factual error, not a design decision.

**Action:** Replace the focus modes line in CLAUDE.md with the actual values from `lib/bot-personalities.ts`. Also note that `social_media` is only available for `alexandria` and `collaborative` (not `kim`).

**Confidence:** HIGH -- verified by reading both files

### DOC-08: Supabase ID Exposure (I-8)
**Current state:** The Supabase project ID (`esymbjpzjjkffpfqukxw`) appears in:
- `CLAUDE.md` line 9
- `package.json` gen:types script
- `vercel.json` CSP connect-src directive
- Client-side code via `NEXT_PUBLIC_SUPABASE_URL`

**Finding:** This is by-design. Supabase project IDs and anon keys are explicitly designed to be public (they're in `NEXT_PUBLIC_` env vars). Security comes from RLS policies on every table (verified in audit passing checks), not from hiding the project ID. This is standard Supabase architecture.

**Action:** Add a brief acknowledgement in CLAUDE.md's Environment Variables section explaining that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally client-exposed and security relies on RLS, not obscurity.

**Confidence:** HIGH -- this is standard Supabase architecture per official docs

### DOC-09: XSS-Protection Header (I-9)
**Current state:** `vercel.json` defines security headers but does NOT include `X-XSS-Protection`. No explicit `X-XSS-Protection: 0` is set.

**Finding:** Per OWASP and MDN (verified 2026), `X-XSS-Protection` is deprecated. The XSS Auditor was removed from all major browsers. Setting `X-XSS-Protection: 1` can actually CREATE vulnerabilities (side-channel data leaks, selective script blocking). The recommended action is either:
- Set `X-XSS-Protection: 0` explicitly to disable legacy auditors in ancient browsers
- Omit it entirely (acceptable since CSP is already in place)

This project already has a comprehensive CSP in `vercel.json`. The CSP includes `script-src 'self' 'unsafe-inline'` which provides the actual XSS protection.

**Action:** Add `X-XSS-Protection: 0` to `vercel.json` headers as a one-line addition. Document the rationale in a comment or CLAUDE.md.

**Confidence:** HIGH -- verified with OWASP and MDN current recommendations

### DOC-10: ElevenLabs Cost Tracking (I-10)
**Current state:** The voice API (`app/(chat)/api/voice/route.ts`) tracks voice usage via `recordAnalytics(user.id, "voice", estimatedMinutes)` using estimated minutes from text length (`Math.ceil(cleanText.length / 750)`). There is NO character-level logging or cost-in-dollars tracking for ElevenLabs specifically.

AI model costs ARE tracked in `lib/cost/tracker.ts` with the `AICostLog` table, daily cron checks, and admin notifications. ElevenLabs has no equivalent.

**ElevenLabs pricing context:** ElevenLabs bills per character (1 credit = 1 character for Multilingual v2). The current tracking estimates minutes, not characters -- this is inaccurate for cost projection.

**Evaluation:**
- **Accept current state:** The `voiceMinutes` estimate gives directional data. Real ElevenLabs costs can be monitored via their dashboard.
- **Enhance (v2):** Log actual character count per TTS request to `AICostLog` (or a new `VoiceCostLog` table) with estimated cost based on `$0.30/1000 chars` (Creator plan rate). Include in daily cost-check cron.

**Recommendation:** Accept current behavior for v1. The existing rate limiting (500 voice requests/day) provides cost protection. ElevenLabs dashboard provides actual billing data. Document the gap and defer character-level cost tracking to v2.

**Confidence:** HIGH -- verified by reading voice route and cost tracker code

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design decision tracking | ADR framework/tooling | Inline comments + CLAUDE.md section | This project already uses CLAUDE.md as its canonical reference. Adding a separate ADR system adds complexity for 10 items. |
| XSS protection | Custom middleware | `vercel.json` header config | Vercel handles headers declaratively; no runtime overhead |

**Key insight:** This is a documentation phase. The temptation is to over-engineer a documentation system. Use what already exists (code comments, CLAUDE.md) and add to it.

## Common Pitfalls

### Pitfall 1: Documenting in External Files Only
**What goes wrong:** Design decisions documented in `.md` files nobody reads. Future developers hit the code, see the "questionable" pattern, and change it without finding the rationale.
**Why it happens:** Tendency to write documentation separately from code.
**How to avoid:** Every design decision MUST have an inline code comment at the decision point. CLAUDE.md provides the longer explanation.
**Warning signs:** PR reviews asking "why does this work this way?" about a documented decision.

### Pitfall 2: Treating "Document" as "Justify"
**What goes wrong:** Writing defensive documentation that over-explains. A one-line comment becomes a paragraph.
**Why it happens:** Audit findings feel like criticism requiring defense.
**How to avoid:** State the decision and rationale concisely. 1-3 lines inline, 3-5 lines in CLAUDE.md. If it needs more, the decision itself may need re-evaluation.
**Warning signs:** Comments longer than the code they describe.

### Pitfall 3: Forgetting to Update CLAUDE.md Accuracy
**What goes wrong:** Adding new documentation but not fixing the existing incorrect information (DOC-07 focus modes mismatch).
**Why it happens:** Focus on adding new content rather than auditing existing content.
**How to avoid:** DOC-07 must be completed first or in the same task as other CLAUDE.md updates.
**Warning signs:** CLAUDE.md sections that contradict the codebase.

### Pitfall 4: Mixing Documentation with Code Changes
**What goes wrong:** Phase scope creep -- "while we're documenting the payment failure handling, let's also add the admin notification."
**Why it happens:** Documentation reveals enhancement opportunities.
**How to avoid:** Strict scope: comments and CLAUDE.md updates only. Any code behavior changes are deferred with explicit "Deferred to v2" notes.
**Warning signs:** Modified `.ts` files beyond comment additions.

## Code Examples

### Example 1: Inline Design Decision Comment
```typescript
// Source: verified pattern from codebase analysis
// In app/(chat)/api/subscription/route.ts

// DESIGN(DOC-03): Returns graceful empty response for unauthenticated users
// instead of 401. The subscribe page polls this endpoint after Stripe checkout
// to detect subscription activation. During this window, the auth session may
// not be fully established. A 401 would break the payment completion flow.
if (authError || !user || !user.email) {
  return Response.json({
    isActive: false,
    subscriptionType: null,
    // ...
  });
}
```

### Example 2: CLAUDE.md Design Decisions Section
```markdown
### Design Decisions

#### CSRF Token Endpoint (DOC-02)
The `/api/csrf` endpoint is intentionally unauthenticated. CSRF tokens must be
available before authentication (subscribe page, login). Security relies on
the double-submit pattern: HMAC-signed token in both httpOnly cookie and
request header must match.

#### Supabase ID Exposure (DOC-08)
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are intentionally
client-exposed. This is standard Supabase architecture. Security relies on
Row-Level Security (RLS) policies on every table, not obscurity of the project ID.
```

### Example 3: Focus Modes Fix (DOC-07)
```markdown
<!-- Before (WRONG): -->
Focus modes: `default`, `brand_crisis`, `launch_campaign`, `pipeline_audit`,
`deal_closing`, `market_entry`, `team_scaling`

<!-- After (CORRECT): -->
Focus modes: `default`, `business_analysis`, `pricing`, `key_messaging`,
`customer_journey`, `social_media`, `launch_strategy`

Note: `social_media` is only available for `alexandria` and `collaborative`.
```

### Example 4: vercel.json XSS-Protection Header (DOC-09)
```json
{
  "key": "X-XSS-Protection",
  "value": "0"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `X-XSS-Protection: 1; mode=block` | `X-XSS-Protection: 0` or omit entirely | ~2019 (Chrome removed XSS Auditor) | Header can CREATE vulnerabilities in legacy browsers |
| ElevenLabs character billing | ElevenLabs credit system | 2025 | 1 credit = 1 char for Multilingual v2, 0.5 for Turbo |
| Separate ADR docs | Inline comments + project docs | Industry trend | Collocated docs have higher read rates |

## Open Questions

1. **Should `X-XSS-Protection: 0` be added?**
   - What we know: OWASP recommends explicit `0` to disable legacy XSS auditors. CSP already provides protection.
   - What's unclear: Whether the one-line header addition counts as "documentation only" or a "code change."
   - Recommendation: Add it -- it's a single config line in `vercel.json`, not a logic change. Document the rationale.

2. **Should payment failure admin notifications be added now or deferred?**
   - What we know: Stripe handles user-facing dunning. Admin visibility for failed payments would be useful.
   - What's unclear: Whether adding `sendAdminNotification()` in the webhook handler exceeds phase scope.
   - Recommendation: Defer to v2. This phase documents the decision, not implements it.

## Sources

### Primary (HIGH confidence)
- Codebase files directly read and verified:
  - `lib/ai/prompts.ts` -- updateDocumentPrompt behavior (DOC-01)
  - `lib/security/csrf.ts` + `app/(chat)/api/csrf/route.ts` -- CSRF design (DOC-02)
  - `app/(chat)/api/subscription/route.ts` -- Subscription GET behavior (DOC-03)
  - `app/api/stripe/webhook/route.ts` -- Payment failure handling (DOC-04)
  - `app/(chat)/api/chat/route.ts` -- Stream recovery (DOC-05)
  - `components/chat.tsx` -- Focus mode state (DOC-06)
  - `lib/bot-personalities.ts` vs CLAUDE.md -- Focus modes mismatch (DOC-07)
  - `lib/env.ts` + `vercel.json` -- Supabase ID exposure (DOC-08)
  - `vercel.json` -- Security headers (DOC-09)
  - `app/(chat)/api/voice/route.ts` + `lib/cost/tracker.ts` -- Voice cost tracking (DOC-10)

### Secondary (MEDIUM confidence)
- [MDN X-XSS-Protection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection) -- Header deprecation status
- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) -- Security header recommendations
- [ElevenLabs Usage Analytics](https://elevenlabs.io/docs/overview/administration/usage-analytics) -- Billing model

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Documentation patterns: HIGH -- straightforward inline comments and CLAUDE.md updates
- DOC-07 focus modes fix: HIGH -- exact mismatch verified between CLAUDE.md and lib/bot-personalities.ts
- DOC-09 XSS header: HIGH -- OWASP + MDN confirm deprecation
- DOC-04/DOC-10 accept/defer decisions: HIGH -- clear trade-off analysis with evidence

**Research date:** 2026-02-18
**Valid until:** 2026-06-18 (documentation phase, no fast-moving dependencies)
