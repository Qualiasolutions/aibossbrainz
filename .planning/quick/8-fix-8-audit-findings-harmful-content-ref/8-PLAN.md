---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/bot-personalities.ts
  - lib/safety/canary.ts
  - lib/ai/tools/web-search.ts
  - lib/ai/tools/strategy-canvas.ts
  - app/(chat)/api/realtime/route.ts
  - app/(chat)/api/realtime/stream/route.ts
  - app/(chat)/api/voice/route.ts
  - package.json
  - supabase/migrations/20260223000100_add_voice_request_count.sql
  - lib/analytics/queries.ts
autonomous: true
user_setup:
  - service: supabase
    why: "New migration for voiceRequestCount column and updated RPC"
    dashboard_config:
      - task: "Run migration 20260223000100_add_voice_request_count.sql in SQL Editor"
        location: "Supabase Dashboard -> SQL Editor"

must_haves:
  truths:
    - "System prompts contain explicit harmful content refusal instructions"
    - "System prompts contain professional advice disclaimers for legal/financial/medical"
    - "jsPDF is updated to ^4.2.0 with no vulnerabilities"
    - "Canary token hash uses 16 hex chars (2^64 keyspace) instead of 8"
    - "Web search results are sanitized with full sanitizePromptContent instead of minimal sanitizeSnippet"
    - "Strategy canvas items have .max(500) per string and .max(10) on array"
    - "Both realtime routes record voice analytics via after() callback"
    - "Voice rate limit DB fallback uses voiceRequestCount instead of voiceMinutes"
  artifacts:
    - path: "lib/bot-personalities.ts"
      provides: "CONTENT SAFETY RULES and PROFESSIONAL ADVICE DISCLAIMERS in IDENTITY_RULES"
      contains: "CONTENT SAFETY RULES"
    - path: "lib/safety/canary.ts"
      provides: "Extended canary hash"
      contains: ".slice(0, 16)"
    - path: "lib/ai/tools/web-search.ts"
      provides: "Full prompt content sanitization on search results"
      contains: "sanitizePromptContent"
    - path: "lib/ai/tools/strategy-canvas.ts"
      provides: "Bounded input validation"
      contains: ".max(500)).max(10)"
    - path: "app/(chat)/api/realtime/route.ts"
      provides: "Voice analytics recording"
      contains: "recordAnalytics"
    - path: "app/(chat)/api/realtime/stream/route.ts"
      provides: "Voice analytics recording"
      contains: "recordAnalytics"
    - path: "supabase/migrations/20260223000100_add_voice_request_count.sql"
      provides: "voiceRequestCount column and updated RPC"
  key_links:
    - from: "app/(chat)/api/realtime/route.ts"
      to: "lib/analytics/queries.ts"
      via: "after(() => recordAnalytics(...))"
      pattern: "recordAnalytics.*voice"
    - from: "app/(chat)/api/realtime/stream/route.ts"
      to: "lib/analytics/queries.ts"
      via: "after(() => recordAnalytics(...))"
      pattern: "recordAnalytics.*voice"
    - from: "lib/ai/tools/web-search.ts"
      to: "lib/ai/prompts.ts"
      via: "import sanitizePromptContent"
      pattern: "import.*sanitizePromptContent.*from.*prompts"
---

<objective>
Fix 8 audit findings from AI Production Audit (CRIT-2, HIGH-1, HIGH-2, MED-1, MED-2, MED-3, MED-7, MED-8).

Purpose: Close remaining security, safety, and observability gaps identified in the production audit to move from 88/100 score toward 95+.
Output: Hardened system prompts, updated dependencies, improved input validation, complete voice analytics tracking, and correct rate limit DB fallback.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AI-PRODUCTION-AUDIT.md
@lib/bot-personalities.ts
@lib/safety/canary.ts
@lib/ai/tools/web-search.ts
@lib/ai/tools/strategy-canvas.ts
@app/(chat)/api/realtime/route.ts
@app/(chat)/api/realtime/stream/route.ts
@app/(chat)/api/voice/route.ts
@lib/analytics/queries.ts
@lib/ai/prompts.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: System prompt safety + dependency update + quick code fixes (CRIT-2, HIGH-1, HIGH-2, MED-1, MED-2, MED-3)</name>
  <files>
    lib/bot-personalities.ts
    lib/safety/canary.ts
    lib/ai/tools/web-search.ts
    lib/ai/tools/strategy-canvas.ts
    package.json
  </files>
  <action>
**CRIT-2 -- Harmful content refusal in bot-personalities.ts:**
Add a new `CONTENT_SAFETY_RULES` constant (same pattern as `IDENTITY_RULES`, `HUMAN_ESCALATION_INSTRUCTIONS`) with this exact content:

```
## CONTENT SAFETY RULES
You MUST refuse to generate content involving:
1. Malware, hacking tools, or exploitation code
2. Self-harm, suicide methods, or eating disorder promotion
3. Drug manufacturing or illegal substance procurement
4. Weapons construction or violent attack planning
5. Harassment, doxxing, or targeted abuse content
6. Child exploitation or CSAM in any form
7. Fraud schemes, phishing templates, or social engineering scripts

When refusing, respond: "I can't help with that. Let me know if there's something else I can assist with regarding your business needs."
```

Inject `${CONTENT_SAFETY_RULES}` into the `IDENTITY_RULES` constant, right after the `CREATIVE WRITING JAILBREAK PROTECTION` section (before `PRICING & LIABILITY RESTRICTIONS`). This keeps all safety rules grouped together.

**HIGH-2 -- Professional advice disclaimers in bot-personalities.ts:**
Add a new `PROFESSIONAL_ADVICE_DISCLAIMERS` constant:

```
## PROFESSIONAL ADVICE DISCLAIMERS
For any questions involving legal, financial, tax, medical, or regulatory advice:
1. Provide general educational information only
2. Include the disclaimer: "This is general information only, not professional [legal/financial/medical] advice. Please consult a qualified professional for your specific situation."
3. Never recommend specific legal actions, investment decisions, or medical treatments
```

Inject `${PROFESSIONAL_ADVICE_DISCLAIMERS}` into `IDENTITY_RULES`, right after the new `CONTENT SAFETY RULES` section (before `PRICING & LIABILITY RESTRICTIONS`).

**HIGH-1 -- Update jsPDF in package.json:**
Change `"jspdf": "^4.1.0"` to `"jspdf": "^4.2.0"` in package.json. Then run `pnpm install` to update the lockfile.

**MED-1 -- Extend canary hash in canary.ts:**
In `lib/safety/canary.ts` line 25, change `.slice(0, 8)` to `.slice(0, 16)`. Update the JSDoc comment on line 20 to say "first 16 hex chars" instead of "first 8 hex chars".

**MED-2 -- Replace sanitizeSnippet with sanitizePromptContent in web-search.ts:**
1. Add import at top: `import { sanitizePromptContent } from "@/lib/ai/prompts";`
2. Delete the `sanitizeSnippet()` function (lines 274-281).
3. Replace both usages on lines 310 and 312: change `sanitizeSnippet(...)` to `sanitizePromptContent(...)`.

NOTE: `sanitizePromptContent` is exported from `lib/ai/prompts.ts` which has `import "server-only"` at the top. The `web-search.ts` tool only runs server-side (inside API route handlers), so this import is safe. However, check that `web-search.ts` does not already import from a "server-only" restricted module -- if it does not, and this causes build issues, the alternative is to extract `sanitizePromptContent` into a shared utility. But since web-search is a server-side AI tool, it should work fine.

**MED-3 -- Add input length validation to strategy-canvas.ts:**
In `lib/ai/tools/strategy-canvas.ts` line 87, change:
```
items: z.array(z.string())
```
to:
```
items: z.array(z.string().max(500)).max(10)
```
Keep the existing `.describe(...)` chain after `.max(10)`.
  </action>
  <verify>
1. `pnpm build` passes with no errors
2. Grep for `CONTENT SAFETY RULES` in lib/bot-personalities.ts confirms presence
3. Grep for `PROFESSIONAL ADVICE DISCLAIMERS` in lib/bot-personalities.ts confirms presence
4. Grep for `.slice(0, 16)` in lib/safety/canary.ts confirms updated hash length
5. Grep for `sanitizeSnippet` in lib/ai/tools/web-search.ts returns 0 matches
6. Grep for `sanitizePromptContent` in lib/ai/tools/web-search.ts confirms usage
7. Grep for `.max(500)).max(10)` in lib/ai/tools/strategy-canvas.ts confirms bounded input
8. `pnpm list jspdf` shows version >= 4.2.0
  </verify>
  <done>
System prompts include harmful content refusal rules and professional advice disclaimers. jsPDF updated to ^4.2.0. Canary hash extended to 16 hex chars. Web search uses full sanitizePromptContent. Strategy canvas has bounded input validation.
  </done>
</task>

<task type="auto">
  <name>Task 2: Voice analytics tracking + rate limit DB fallback fix (MED-7, MED-8)</name>
  <files>
    app/(chat)/api/realtime/route.ts
    app/(chat)/api/realtime/stream/route.ts
    app/(chat)/api/voice/route.ts
    lib/analytics/queries.ts
    supabase/migrations/20260223000100_add_voice_request_count.sql
  </files>
  <action>
**MED-8 -- Add voiceRequestCount column and update RPC:**

Create migration `supabase/migrations/20260223000100_add_voice_request_count.sql`:
```sql
-- Add voiceRequestCount column to UserAnalytics for accurate DB-fallback rate limiting
-- MED-8: voiceMinutes != request count, need separate counter
ALTER TABLE "UserAnalytics" ADD COLUMN IF NOT EXISTS "voiceRequestCount" JSONB DEFAULT '0';

-- Update record_user_analytics RPC to accept and increment voiceRequestCount
CREATE OR REPLACE FUNCTION record_user_analytics(
  p_user_id TEXT,
  p_date TEXT,
  p_message_count INT DEFAULT 0,
  p_token_usage INT DEFAULT 0,
  p_voice_minutes INT DEFAULT 0,
  p_export_count INT DEFAULT 0,
  p_voice_request_count INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO "UserAnalytics" ("userId", date, "messageCount", "tokenUsage", "voiceMinutes", "exportCount", "voiceRequestCount")
  VALUES (
    p_user_id,
    p_date,
    to_jsonb(p_message_count),
    to_jsonb(p_token_usage),
    to_jsonb(p_voice_minutes),
    to_jsonb(p_export_count),
    to_jsonb(p_voice_request_count)
  )
  ON CONFLICT ("userId", date)
  DO UPDATE SET
    "messageCount" = to_jsonb(COALESCE(("UserAnalytics"."messageCount")::int, 0) + p_message_count),
    "tokenUsage" = to_jsonb(COALESCE(("UserAnalytics"."tokenUsage")::int, 0) + p_token_usage),
    "voiceMinutes" = to_jsonb(COALESCE(("UserAnalytics"."voiceMinutes")::int, 0) + p_voice_minutes),
    "exportCount" = to_jsonb(COALESCE(("UserAnalytics"."exportCount")::int, 0) + p_export_count),
    "voiceRequestCount" = to_jsonb(COALESCE(("UserAnalytics"."voiceRequestCount")::int, 0) + p_voice_request_count),
    "updatedAt" = NOW();
END;
$$;
```

**Update lib/analytics/queries.ts -- recordAnalytics function:**
Add a new type `"voice_request"` to the union, and add a new parameter in the RPC call:
```typescript
export async function recordAnalytics(
  userId: string,
  type: "message" | "token" | "voice" | "export" | "voice_request",
  value: number = 1,
): Promise<void> {
```
In the RPC call params, add:
```
p_voice_request_count: type === "voice_request" ? value : 0,
```

**MED-7 -- Add voice analytics to realtime routes:**

In `app/(chat)/api/realtime/route.ts`:
1. Add imports: `import { after } from "next/server";` and `import { recordAnalytics } from "@/lib/analytics/queries";`
2. After the successful `apiLog.success(...)` call (line ~221) and before the `return Response.json(...)`, add:
```typescript
// Record voice analytics for realtime route (MED-7)
if (responseText) {
  const cleanTextLength = stripMarkdownForTTS(responseText).length;
  const estimatedMinutes = Math.max(1, Math.ceil(cleanTextLength / 750));
  after(() => {
    recordAnalytics(user.id, "voice", estimatedMinutes);
    recordAnalytics(user.id, "voice_request", 1);
  });
}
```
Also add `import { stripMarkdownForTTS } from "@/lib/voice/strip-markdown-tts";` if not already imported (check first -- it IS already imported in the stream route but may not be in the base route).

In `app/(chat)/api/realtime/stream/route.ts`:
1. Add import: `import { recordAnalytics } from "@/lib/analytics/queries";`
2. Add `import { after } from "next/server";` if not already imported.
3. After `apiLog.success(...)` (line ~448) and before `return Response.json(...)`, add:
```typescript
// Record voice analytics for realtime stream route (MED-7)
if (responseText) {
  const cleanForEstimate = stripMarkdownForTTS(responseText);
  const estimatedMinutes = Math.max(1, Math.ceil(cleanForEstimate.length / 750));
  after(() => {
    recordAnalytics(user.id, "voice", estimatedMinutes);
    recordAnalytics(user.id, "voice_request", 1);
  });
}
```

**MED-8 -- Fix DB fallback in all three voice routes:**

In ALL THREE routes (`voice/route.ts`, `realtime/route.ts`, `realtime/stream/route.ts`), update the DB fallback section:
1. Change `.select("voiceMinutes")` to `.select("voiceRequestCount")`
2. Change the comparison from:
   ```
   if ((Number(data?.voiceMinutes) || 0) >= MAX_..._REQUESTS_PER_DAY)
   ```
   to:
   ```
   if ((Number(data?.voiceRequestCount) || 0) >= MAX_..._REQUESTS_PER_DAY)
   ```

Also in `voice/route.ts`, add a `recordAnalytics(user.id, "voice_request", 1)` call alongside each existing `recordAnalytics(user.id, "voice", estimatedMinutes)` call. There are 3 places where voice analytics are recorded (collaborative path line ~224, cached path line ~252, single voice path line ~323). At each place, add:
```typescript
after(() => {
  recordAnalytics(user.id, "voice", estimatedMinutes);
  recordAnalytics(user.id, "voice_request", 1);
});
```
(Replace the existing single `after(() => recordAnalytics(...))` calls.)
  </action>
  <verify>
1. `pnpm build` passes with no errors
2. Grep for `recordAnalytics` in `app/(chat)/api/realtime/route.ts` confirms presence
3. Grep for `recordAnalytics` in `app/(chat)/api/realtime/stream/route.ts` confirms presence
4. Grep for `voiceRequestCount` in all three voice routes confirms DB fallback uses request count
5. Grep for `voice_request` in `lib/analytics/queries.ts` confirms new type
6. Migration file exists at `supabase/migrations/20260223000100_add_voice_request_count.sql`
  </verify>
  <done>
Both realtime routes record voice analytics via after() callbacks. All three voice routes use voiceRequestCount (not voiceMinutes) for DB fallback rate limiting. Migration adds voiceRequestCount column and updates RPC to handle it. The voice_request type is tracked separately from voice minutes for accurate request counting.
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` completes successfully
2. `pnpm lint` passes (or only pre-existing warnings)
3. All 8 audit findings addressed:
   - CRIT-2: `grep "CONTENT SAFETY RULES" lib/bot-personalities.ts`
   - HIGH-1: `pnpm list jspdf` shows >= 4.2.0
   - HIGH-2: `grep "PROFESSIONAL ADVICE DISCLAIMERS" lib/bot-personalities.ts`
   - MED-1: `grep "slice(0, 16)" lib/safety/canary.ts`
   - MED-2: `grep "sanitizePromptContent" lib/ai/tools/web-search.ts`
   - MED-3: `grep "max(500)" lib/ai/tools/strategy-canvas.ts`
   - MED-7: `grep "recordAnalytics" app/(chat)/api/realtime/route.ts`
   - MED-8: `grep "voiceRequestCount" app/(chat)/api/voice/route.ts`
</verification>

<success_criteria>
- All 8 audit findings (CRIT-2, HIGH-1, HIGH-2, MED-1, MED-2, MED-3, MED-7, MED-8) are resolved
- Build passes cleanly
- No regressions introduced
- Migration file ready for Supabase Dashboard SQL Editor
</success_criteria>

<output>
After completion, create `.planning/quick/8-fix-8-audit-findings-harmful-content-ref/8-SUMMARY.md`
Update `.planning/STATE.md` with quick task 8 completion.
</output>
