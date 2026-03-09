# Plan: 22 — fix: enable cross-chat memory recall

**Mode:** quick (--fix, no-plan)
**Created:** 2026-03-09

## Task 1: Fix cross-chat memory recall

**What:** Executives can't recall previous conversations because personalization (which loads conversation summaries) is gated behind `messageText.length > 100 || messageCount > 2`. New chats with short questions like "what did we discuss last time?" never load summaries.

**Root Cause:** Three compounding issues:
1. `lib/ai/prompts.ts:205-206` — Personalization gate too aggressive, blocks loading for short messages in new chats
2. `lib/ai/conversation-summarizer.ts:43` — Requires 2+ user messages to summarize, but most chats are single-exchange
3. `app/(chat)/api/chat/route.ts:594-596` — Summary generation only triggers at 4+ messages

**Fix:**
1. Remove the aggressive personalization gate — always load for authenticated users (isSimpleMessage early return already handles greetings)
2. Lower summarizer threshold from 2 user messages to 1 user + 1 assistant
3. Lower summary trigger from 4+ messages to 2+ messages
4. Add explicit instruction in PREVIOUS CONVERSATIONS section telling AI to reference summaries naturally

**Files:** `lib/ai/prompts.ts`, `lib/ai/personalization.ts`, `lib/ai/conversation-summarizer.ts`, `app/(chat)/api/chat/route.ts`
**Done when:** Changes applied and tsc passes
