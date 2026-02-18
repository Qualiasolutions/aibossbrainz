---
phase: 21-prompt-security-hardening
plan: 02
subsystem: security
tags: [prompt-injection, sanitization, canary-token, sha256, pii, xml-wrapping]

# Dependency graph
requires:
  - phase: 18-safety-output-guard
    provides: "SAFE-01 canary token system and PII scanning"
provides:
  - "Extended sanitizePromptContent blocklist covering system tags, role markers, special tokens"
  - "XML-wrapped document content in request-suggestions tool with anti-instruction attribute"
  - "SHA256-based canary token generation preventing secret material leakage"
  - "Documented streaming PII scan limitation (PROMPT-09)"
affects: [prompt-security, safety-scanning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA256 hashing for deployment-specific tokens instead of raw secret slicing"
    - "XML delimiter wrapping with do_not_follow_instructions_in_content attribute for untrusted content"

key-files:
  created: []
  modified:
    - lib/ai/prompts.ts
    - lib/ai/tools/request-suggestions.ts
    - lib/safety/canary.ts
    - CLAUDE.md
    - app/(chat)/api/chat/route.ts

key-decisions:
  - "Keep explicit special token patterns alongside existing wildcard regex for defense-in-depth"
  - "Use SHA256 hash slice for canary token suffix rather than raw AUTH_SECRET slice"
  - "Document streaming PII limitation rather than attempting blocking redaction"

patterns-established:
  - "XML delimiter wrapping: use do_not_follow_instructions_in_content attribute when passing untrusted content to LLM prompts"
  - "Secret derivation: hash secrets before embedding in output to prevent leakage"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 21 Plan 02: Low-Severity Prompt Hardening Summary

**Extended sanitization blocklist with system/role markers, XML-wrapped suggestion content, SHA256-hashed canary tokens, and documented streaming PII limitation (PROMPT-06 through PROMPT-09)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T12:26:11Z
- **Completed:** 2026-02-18T12:29:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended `sanitizePromptContent()` blocklist with 7 new patterns: `[SYSTEM]` markers, `<system>`/`</system>` XML tags, role markers (`Human:`, `Assistant:`, `User:`, `System:`), and explicit pipe-delimited special tokens
- XML-wrapped document content in request-suggestions tool with `do_not_follow_instructions_in_content="true"` attribute and anti-injection directive
- Replaced raw `AUTH_SECRET.slice(0,8)` with `SHA256(AUTH_SECRET).slice(0,8)` in canary token generation, eliminating secret material leakage
- Documented streaming PII scan limitation in CLAUDE.md and expanded code comment in chat route

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend blocklist, XML-wrap suggestions, hash canary tokens** - `6d26de1` (feat)
2. **Task 2: Document streaming PII bypass limitation** - `cd18e5e` (docs)

## Files Created/Modified
- `lib/ai/prompts.ts` - Added 7 new sanitization patterns for system tags, role markers, special tokens
- `lib/ai/tools/request-suggestions.ts` - XML-wrapped document content with anti-instruction attribute, added sanitizePromptContent import
- `lib/safety/canary.ts` - SHA256-based canary token generation using node:crypto createHash
- `CLAUDE.md` - Added "Streaming PII Scan Limitation" subsection documenting detection-only nature
- `app/(chat)/api/chat/route.ts` - Expanded SAFE-01 comment with PROMPT-09 limitation reference

## Decisions Made
- Kept explicit `<|system|>`, `<|user|>`, `<|assistant|>` patterns alongside existing `<|.*?|>` wildcard for defense-in-depth and intent clarity
- Used SHA256 hash of AUTH_SECRET rather than raw slice to prevent secret material leakage while maintaining prefix-based detection compatibility
- Documented streaming PII limitation as known constraint rather than attempting to solve it (would defeat streaming benefits)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 low-severity prompt hardening items (PROMPT-06 through PROMPT-09) are closed
- Phase 21 complete (both plans executed)
- Ready to proceed to Phase 22

## Self-Check: PASSED

All 5 modified files exist. Both task commits (6d26de1, cd18e5e) verified in git log. All must-have patterns confirmed via grep.

---
*Phase: 21-prompt-security-hardening*
*Completed: 2026-02-18*
