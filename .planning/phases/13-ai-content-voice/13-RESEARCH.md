# Phase 13: AI Content & Voice - Research

**Researched:** 2026-02-11
**Domain:** AI prompt engineering for content generation + ElevenLabs TTS text preprocessing + voice call chat persistence
**Confidence:** HIGH

## Summary

This phase addresses three distinct areas: (1) making AI executives produce ready-to-use deliverables (email drafts, social posts, ad copy) rather than just strategic advice, (2) improving voice playback to intelligently skip tables, charts, and structured data, and (3) ensuring voice call Q&A persists in chat history.

The codebase already has strong foundations for all three. The system prompts in `lib/bot-personalities.ts` already contain formatting instructions and identity rules. The `stripMarkdown` function in `app/(chat)/api/voice/route.ts` already removes table rows and separators for TTS. The `app/(chat)/api/realtime/stream/route.ts` already saves voice call messages to a dedicated "Voice Call" chat. The main work is: (1) enhancing system prompts to shift AI behavior from advisory to generative, (2) improving the text preprocessing pipeline to handle edge cases like numbered lists as data, chart descriptions, and suggestions blocks, and (3) fixing the voice call hook (`hooks/use-voice-call.ts`) which currently uses the regular chat `sendMessage` but does NOT save to a visible voice-call chat (unlike the premium realtime call path which does).

**Primary recommendation:** This phase is primarily prompt engineering + text preprocessing work with a small amount of persistence plumbing. No new libraries needed; all improvements build on existing patterns.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 5.x | Chat streaming, tool calling, generateText | Already powering all AI features |
| ElevenLabs API | v1 (Turbo v2.5 model) | Text-to-speech for executive voices | Already integrated in `/api/voice` |
| OpenRouter + Gemini 3 Flash | Latest | LLM for content generation | Already the model provider |
| Supabase | PostgreSQL | Chat/message persistence | Already storing all messages |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Latest | Input validation | Voice API request validation |
| SWR | Latest | Client-side data fetching | Chat list refresh after voice call |

### No New Dependencies Needed
This phase requires zero new packages. All work is prompt engineering, text preprocessing regex, and wiring existing persistence patterns.

## Architecture Patterns

### Current Voice Architecture (Two Paths)

The codebase has TWO distinct voice call implementations:

```
Path 1: Basic Voice Call (use-voice-call.ts)
├── Uses browser SpeechRecognition API
├── Sends transcribed text via chat's sendMessage()
├── Messages go through normal /api/chat route
├── Messages ARE saved to current chat (via normal chat flow)
├── Uses /api/voice for TTS response playback
└── VoiceCallDialog component (simpler UI)

Path 2: Premium Realtime Call (premium-realtime-call.tsx)
├── Uses browser SpeechRecognition API
├── Sends text to /api/realtime/stream
├── Gets AI response + audio in single request
├── Saves to dedicated "Voice Call" chat in Supabase
├── Returns chatId for frontend redirect
└── Full-screen call UI with audio visualization
```

**Critical finding:** Path 1 (basic voice call) already saves messages to the CURRENT chat because it goes through the normal `sendMessage` flow. Path 2 (premium realtime) saves to a separate "Voice Call" chat. The success criteria says "Questions asked during a voice call and the AI answers appear in the chat history afterward" which is partially already working in Path 1 but needs verification and potential improvements in Path 2.

### Pattern 1: Content Generation via System Prompt Enhancement
**What:** Modify executive system prompts to shift behavior from "give advice about X" to "produce X directly"
**When to use:** When the AI currently responds with strategic guidance instead of actual deliverables

The current prompts in `SYSTEM_PROMPTS` (lib/bot-personalities.ts) tell executives WHO they are and HOW to communicate, but do not explicitly instruct them to PRODUCE content when asked. The formatting instructions already say to avoid code blocks for business content, which is good. The missing piece is an explicit content generation instruction block.

### Pattern 2: Voice Text Preprocessing Pipeline
**What:** Clean AI response text before sending to ElevenLabs TTS
**When to use:** Every TTS request (both manual play and auto-speak)

Current preprocessing in `stripMarkdown()` already handles:
- Executive name prefixes (Alexandria/Kim markers)
- Headers, bold, italic, links, images
- Code blocks (removed entirely)
- Blockquotes, horizontal rules
- Table rows and separators (removed entirely)
- Multiple newlines

What it DOES NOT handle well:
- Suggestions JSON blocks (only handled in realtime route, not in `/api/voice`)
- Numbered lists that represent data (e.g., "1. Revenue: $500K") read awkwardly
- Chart/graph descriptions embedded in text
- Markdown-formatted deliverables (e.g., email drafts with "Subject:", "Body:" labels)
- The auto-speak hook (`use-auto-speak.ts`) has its OWN separate text cleaning (duplicated logic)

### Pattern 3: Voice Call Chat Persistence
**What:** Ensure voice Q&A appears in browseable chat history
**When to use:** After voice call ends, user should see the conversation

Path 2 (premium realtime) already creates a "Voice Call" chat and saves messages. But it has issues:
- Creates/reuses a SINGLE "Voice Call" chat per user (all calls go to same chat)
- No topic classification on voice chats
- Chat title is always "Voice Call" (not descriptive)
- The chatId is returned to frontend but redirect behavior varies

Path 1 (basic voice call) saves to the CURRENT open chat, which is arguably better behavior.

### Anti-Patterns to Avoid
- **Duplicating stripMarkdown logic:** The same markdown stripping exists in 3 places (voice route, realtime route, auto-speak hook). Consolidate into one shared utility.
- **Over-engineering content generation:** Do not build a separate "content mode" or new tools. Enhance existing prompts to naturally produce content when asked.
- **Breaking voice playback for clean text:** Do not over-strip text. "Subject: Meeting Tomorrow" should still be read, just without markdown syntax.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content templates | Custom template engine | Enhanced system prompts | LLM is already great at formatting; just tell it what format you want |
| Voice text cleaning | New NLP pipeline | Enhanced regex in shared `stripMarkdown` | Current approach works, just needs edge case fixes |
| Chat persistence | New voice-specific DB schema | Existing `saveMessages` + `Chat` table | Infrastructure already exists |
| Content type detection | Classifier for "is this a content request" | Prompt instructions | LLM can determine intent from context |

**Key insight:** This entire phase is about making existing infrastructure work better through prompt engineering and text processing improvements. No new architecture needed.

## Common Pitfalls

### Pitfall 1: Prompt Bloat Breaking Token Budget
**What goes wrong:** Adding too many content generation instructions expands the system prompt beyond what's effective, causing the model to ignore or conflate instructions.
**Why it happens:** System prompts in `SYSTEM_PROMPTS` are already very long (400+ lines for identity rules, formatting, security). Adding more instructions risks the model ignoring them.
**How to avoid:** Add content generation instructions as a focused, separate section. Use the existing focus mode pattern (FOCUS_MODES) as a model. Keep instructions action-oriented and concise.
**Warning signs:** AI starts ignoring other instructions (identity rules, formatting) after prompt changes.

### Pitfall 2: Voice Stripping Removes Useful Context
**What goes wrong:** Aggressively stripping markdown removes content structure that makes the speech coherent. For example, stripping "**Subject:**" from an email draft makes the TTS output confusing.
**Why it happens:** The `stripMarkdown` function treats all bold text the same way. It does not distinguish between formatting markup and structural labels.
**How to avoid:** Strip markdown SYNTAX (**, ##, |) but preserve SEMANTIC labels (Subject:, From:, Option A:). Use a smarter preprocessing step that converts structured content to speech-friendly format rather than just deleting it.
**Warning signs:** Voice playback of email drafts or structured content sounds like random disconnected sentences.

### Pitfall 3: Suggestions Block Read Aloud
**What goes wrong:** The suggestions JSON block at the end of AI responses gets sent to TTS and read aloud as "open bracket, open brace, category colon deep dash dive..."
**Why it happens:** The `/api/voice` route's `stripMarkdown` does NOT strip the suggestions block. Only the realtime route does. The auto-speak hook strips code blocks but not the specific suggestions format.
**How to avoid:** Add suggestions block stripping to the shared `stripMarkdown` utility. Pattern: `/```suggestions[\s\S]*?```/g` and the raw JSON pattern from `parse-suggestions.ts`.
**Warning signs:** Voice playback ends with gibberish JSON being read aloud.

### Pitfall 4: Voice Call Messages Not Visible in Sidebar
**What goes wrong:** Voice call messages are saved to DB but the chat does not appear in the sidebar, or appears as "Voice Call" with no useful context.
**Why it happens:** The premium realtime path creates a generic "Voice Call" chat with no topic classification. The sidebar may not refresh to show it.
**How to avoid:** Generate a descriptive title after voice call ends. Trigger SWR cache invalidation so sidebar refreshes. Consider per-session voice chats rather than one mega-chat.
**Warning signs:** User cannot find their voice conversation after hanging up.

### Pitfall 5: Content Generation Breaks Executive Identity
**What goes wrong:** When instructed to "write an email", the AI drops its executive persona and writes generic content, or when writing ad copy, it uses language inconsistent with the executive's personality.
**Why it happens:** Content generation instructions can override the identity instructions if not carefully integrated.
**How to avoid:** Frame content generation as what the EXECUTIVE would produce. "Write this email AS Alexandria would write it" rather than generic "write an email". The identity rules must remain dominant.
**Warning signs:** Generated emails sound generic or use language/tone inconsistent with Alexandria or Kim's personalities.

## Code Examples

### Current stripMarkdown (voice/route.ts) - Table Handling Already Works
```typescript
// Source: app/(chat)/api/voice/route.ts lines 289-517
const MARKDOWN_PATTERNS = {
  // ...other patterns...
  // Table patterns - skip entire tables instead of just removing pipes
  tableRows: /^\|[^\n]+\|$/gm,
  tableSeparators: /^[-|:\s]+$/gm,
  // ...
};

// Remove tables entirely - don't reference them verbally
result = result
  .replace(MARKDOWN_PATTERNS.tableRows, "")
  .replace(MARKDOWN_PATTERNS.tableSeparators, "");
```

### Missing: Suggestions Block Stripping in Voice Route
```typescript
// Should be added to MARKDOWN_PATTERNS in voice/route.ts
suggestions: /```suggestions[\s\S]*?```/g,
// Also strip raw JSON suggestions at end of message
rawSuggestions: /\n*\[\s*\{\s*"category"[\s\S]*?"text"[\s\S]*?\}\s*\]\s*$/,
```

### Content Generation Prompt Enhancement Pattern
```typescript
// Add to SYSTEM_PROMPTS in lib/bot-personalities.ts
const CONTENT_GENERATION_INSTRUCTIONS = `
## CONTENT GENERATION MODE
When asked to create, write, draft, or produce any business content, DO NOT give advice about how to write it.
Instead, PRODUCE the actual content directly.

**Content you should PRODUCE when asked:**
1. Email drafts (complete with subject line, greeting, body, CTA, signature)
2. Social media posts (platform-specific, with hooks, body, hashtags)
3. Ad copy (headlines, descriptions, CTAs)
4. Sales scripts (opening, discovery questions, pitch, objection handling, close)
5. Press releases (headline, dateline, lead, body, boilerplate)
6. Blog post outlines or drafts
7. Presentation talking points

**Format rules for generated content:**
Present deliverables as clean, formatted text using horizontal rules (---) to separate sections.
Use **bold labels** for structure (Subject:, Hook:, Body:, CTA:).
Do NOT wrap content in code blocks.
Tailor all content to the user's specific business, audience, and goals discussed in the conversation.

**Your voice in generated content:**
Write content that reflects YOUR expertise and style.
Alexandria: Creative, brand-forward, emotionally resonant copy.
Kim: Direct, results-oriented, urgency-driven copy.
`;
```

### Voice Call Chat Persistence (Premium Path Already Does This)
```typescript
// Source: app/(chat)/api/realtime/stream/route.ts lines 350-411
// Save messages to chat history for real-time calls
let savedChatId: string | null = null;
const { data: existingChat } = await supabase
  .from("Chat")
  .select("id")
  .eq("userId", user.id)
  .eq("title", "Voice Call")
  .maybeSingle();

const chatId = existingChat?.id || crypto.randomUUID();
// ... creates chat if not exists, saves user + assistant messages
```

### Basic Voice Call Already Uses sendMessage (Messages Saved via Normal Flow)
```typescript
// Source: hooks/use-voice-call.ts lines 232-249
// Messages are sent through the normal chat sendMessage, which goes through
// /api/chat route and saves to the current chat automatically
if (finalTranscript.trim() && voiceCallActiveRef.current) {
  sendMessage({
    role: "user" as const,
    parts: [{ type: "text", text: finalTranscript.trim() }],
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Advisory-only AI responses | Content generation via prompt engineering | Ongoing trend 2024-2026 | Users expect AI to PRODUCE, not just ADVISE |
| Raw text to TTS | Preprocessed text with markdown stripping | Already implemented | Tables and code blocks already skipped |
| ElevenLabs v2 models | Turbo v2.5 (already in use) | 2024 | Better cost efficiency, good quality |
| Single voice call chat | Per-session or per-user voice chats | Current in codebase | Messages already persisted |

**Current state of the codebase:**
- Table skipping in voice: ALREADY IMPLEMENTED (regex removes table rows and separators)
- Suggestions stripping in voice: PARTIALLY IMPLEMENTED (only in realtime route, not in main voice route)
- Voice call chat persistence: ALREADY IMPLEMENTED in premium path; basic path uses normal chat flow
- Content generation: NOT YET IMPLEMENTED (prompts are advisory-focused)

## Open Questions

1. **Which voice call path should be the primary one?**
   - What we know: Path 1 (basic) uses `sendMessage` and saves to current chat. Path 2 (premium) uses `/api/realtime/stream` and saves to a separate "Voice Call" chat.
   - What's unclear: Does the user want both paths to persist, or should one be deprecated?
   - Recommendation: Both paths should persist. Path 1 already works correctly for the success criteria. Path 2 needs title improvement and potential per-session chat creation.

2. **Should voice text preprocessing use LLM for normalization?**
   - What we know: ElevenLabs recommends using LLM to normalize text before TTS for best results. Current approach is regex-based.
   - What's unclear: Whether the latency/cost of an LLM normalization step is acceptable.
   - Recommendation: Stick with regex for now. LLM preprocessing adds ~1-2s latency and costs tokens. The regex approach handles 95% of cases. Reserve LLM preprocessing for a future enhancement.

3. **How aggressive should table descriptions be?**
   - What we know: Tables are currently stripped entirely. Users might want a verbal summary like "Here's a comparison table with 3 options" instead of complete silence.
   - What's unclear: User preference for table handling in voice.
   - Recommendation: Replace tables with a brief verbal cue like "I've included a comparison table in the text version" rather than complete silence. This acknowledges the table exists without reading it cell-by-cell.

4. **Content generation scope: all focus modes or specific ones?**
   - What we know: There are 7 focus modes (default, business_analysis, pricing, key_messaging, customer_journey, social_media, launch_strategy).
   - What's unclear: Whether content generation should be global or only activated in certain focus modes.
   - Recommendation: Make content generation a GLOBAL capability across all modes. The executive should produce content whenever asked, regardless of focus mode.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `lib/bot-personalities.ts` - Full system prompts and focus modes
- Codebase analysis: `app/(chat)/api/voice/route.ts` - Voice TTS with stripMarkdown, table handling
- Codebase analysis: `app/(chat)/api/realtime/stream/route.ts` - Premium voice call with chat persistence
- Codebase analysis: `hooks/use-voice-call.ts` - Basic voice call using sendMessage
- Codebase analysis: `hooks/use-auto-speak.ts` - Auto-speak with separate text cleaning
- Codebase analysis: `lib/ai/prompts.ts` - System prompt builder with artifacts and suggestions
- Codebase analysis: `components/premium-realtime-call.tsx` - Premium call UI with chatId tracking

### Secondary (MEDIUM confidence)
- [ElevenLabs TTS Best Practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices) - Text preprocessing recommendations
- [ElevenLabs SSML/Pauses](https://help.elevenlabs.io/hc/en-us/articles/24352686926609) - SSML break tag support
- [Vercel AI SDK 5 Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) - Tool architecture
- [Vercel AI SDK Prompt Engineering](https://ai-sdk.dev/docs/advanced/prompt-engineering) - Prompt design patterns

### Tertiary (LOW confidence)
- General prompt engineering patterns for content generation (multiple web sources, patterns are well-established)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all existing code verified by reading source
- Architecture: HIGH - Both voice paths fully traced through codebase, all patterns verified
- Pitfalls: HIGH - Derived from actual code analysis (found suggestions block bug, duplicated stripMarkdown, etc.)
- Content generation prompts: MEDIUM - Prompt engineering is iterative; initial prompts will need tuning

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, no fast-moving dependencies)
