# Summary: 22 — fix: enable cross-chat memory recall

**Status:** Complete
**Date:** 2026-03-09

## Problem

Users asking "can you remember our last conversation?" got responses like "I don't recall a previous conversation with you" despite 66 conversation summaries existing in the database.

## Root Cause

Three compounding gates prevented conversation memory from reaching the AI:

1. **Personalization gate** (`lib/ai/prompts.ts:205-206`): Only loaded personalization (including conversation summaries) when `messageText.length > 100 || messageCount > 2`. A new chat asking "what did we discuss?" (50 chars, 0 prior messages) would never load summaries.

2. **Summarizer minimum** (`lib/ai/conversation-summarizer.ts:43`): Required 2+ user messages to generate a summary, but most chats are single-exchange (1 user + 1 assistant message).

3. **Summary trigger** (`app/(chat)/api/chat/route.ts:594-596`): Only generated summaries at messageCount >= 4, missing short but meaningful conversations.

## Changes

| File | Change |
|------|--------|
| `lib/ai/prompts.ts` | Removed aggressive gate — now loads personalization for all authenticated non-greeting messages |
| `lib/ai/personalization.ts` | Added explicit instruction in PREVIOUS CONVERSATIONS section telling AI to reference summaries naturally |
| `lib/ai/conversation-summarizer.ts` | Lowered threshold from 2 user messages to 1 user + 1 assistant |
| `app/(chat)/api/chat/route.ts` | Lowered summary trigger from 4+ to 2+ messages |

## Verification

- `npx tsc --noEmit` passes clean
- No new dependencies or migrations required
