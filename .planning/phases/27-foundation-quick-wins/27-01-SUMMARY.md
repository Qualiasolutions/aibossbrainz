---
phase: 27
plan: 01
subsystem: code-quality
tags: [linting, build-optimization, pre-commit-hooks, automation]
requires: []
provides:
  - Pre-commit lint hooks blocking dirty commits
  - Build-time console removal (production)
  - Bundle size analysis capability
affects:
  - Developer workflow (pre-commit checks)
  - Production bundle size (console removal)
  - Build process (bundle analyzer optional)
tech_stack:
  added:
    - husky: "9.1.7"
    - "@next/bundle-analyzer": "16.1.6"
  patterns:
    - Pre-commit hooks with Biome auto-fix
    - SWC compiler removeConsole configuration
    - Wrapper composition (withBundleAnalyzer → withSentryConfig)
key_files:
  created:
    - .husky/pre-commit
  modified:
    - lib/admin/queries.ts
    - next.config.ts
    - package.json
key_decisions:
  - decision: Preserve console.error and console.warn in production
    rationale: Sentry captures these for error tracking
    implemented_in: next.config.ts
    reference: compiler.removeConsole.exclude
  - decision: Bundle analyzer disabled by default
    rationale: Avoid 30% build time overhead in normal builds
    implemented_in: next.config.ts
    reference: "ANALYZE=true env var flag"
  - decision: Pre-commit hook auto-fixes (not blocks)
    rationale: Biome --write flag auto-fixes safe issues and re-stages
    implemented_in: .husky/pre-commit
    reference: "Biome 2.0+ handles re-staging automatically"
metrics:
  duration: "4min 21s"
  started: "2026-02-28T21:37:10Z"
  completed: "2026-02-28T21:41:31Z"
  tasks_completed: 2
  commits: 2
  files_modified: 5
---

# Phase 27 Plan 01: Code Quality Automation

**One-liner:** Automated lint enforcement via pre-commit hooks with build-time console removal and bundle analysis capability

## Performance

**Duration:** 4min 21s (2026-02-28T21:37:10Z → 2026-02-28T21:41:31Z)

**Task breakdown:**
- Task 1 (Fix lint + build config): ~2min
- Task 2 (Pre-commit hooks): ~2min

**Files touched:** 5 (2 created, 3 modified)

## Accomplishments

### Code Quality Gates

1. **Pre-commit lint enforcement** - Husky hooks run Biome on staged files with auto-fix
2. **QUAL-01 fixed** - Formatting error at lib/admin/queries.ts:206 resolved
3. **Build optimization** - SWC removeConsole configured (preserves error/warn for Sentry)
4. **Bundle monitoring** - Bundle analyzer available via `ANALYZE=true pnpm build`

### Quality Improvements

- Zero new lint errors introduced (verified with pnpm lint)
- TypeScript compilation passes (verified with npx tsc --noEmit)
- Pre-commit hook tested and working (auto-fixed test lint error)

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2d886ac | Fix lint error and configure build optimizations |
| 2 | 938e92f | Set up pre-commit lint hooks |

## Files Created/Modified

### Created
- `.husky/pre-commit` - Biome pre-commit hook with auto-fix (113 bytes, executable)

### Modified
- `lib/admin/queries.ts` - Fixed formatting at line 206 (stripeSubscriptionId object)
- `next.config.ts` - Added compiler.removeConsole + withBundleAnalyzer wrapper
- `package.json` - Added husky + @next/bundle-analyzer devDependencies
- `pnpm-lock.yaml` - Lockfile updates for new dependencies

## Decisions Made

### 1. Console Preservation Strategy
**Context:** SWC removeConsole removes all console.* by default
**Decision:** Exclude error/warn to preserve Sentry error capture
**Implementation:** `compiler.removeConsole.exclude: ['error', 'warn']`
**Rationale:** v1.4 decision preserved client-side console in lib/utils.ts and lib/audio-manager.ts. Production builds remove log/debug/info while Sentry still captures errors via excluded methods.

### 2. Bundle Analyzer Default Disabled
**Context:** Bundle analyzer adds ~30% to build time
**Decision:** Enabled only via `ANALYZE=true` env var
**Implementation:** `withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })`
**Rationale:** Analysis is diagnostic, not needed for every build. Flag-based activation prevents CI/CD slowdown.

### 3. Auto-fix vs Block Strategy
**Context:** Pre-commit hooks can block commits or auto-fix issues
**Decision:** Auto-fix with `--write` flag, re-stage changes automatically
**Implementation:** `.husky/pre-commit` with `biome check --write --staged`
**Rationale:** Biome 2.0+ handles re-staging. Auto-fix reduces friction (developer doesn't need to manually fix + re-add). Unsafe fixes still require manual approval.

## Deviations from Plan

**None** - Plan executed exactly as written. No bugs found, no missing critical functionality, no blockers encountered.

## Issues Encountered

### Pre-existing Lint Errors
**Issue:** scripts/convert-avatars-to-webp.ts has 4 remaining lint errors
**Impact:** None on plan execution (not in scope)
**Resolution:** Noted for future cleanup. Errors are style-only (useNodejsImportProtocol, useTemplate, noUnusedVariables).

## Next Phase Readiness

**Phase 27 Plan 02 (Bundle Analysis)** - Ready to proceed
- Bundle analyzer configured and available via `ANALYZE=true`
- No blockers

**Future Phase Dependencies:**
- Pre-commit hooks will enforce lint quality for all future plans
- Console removal reduces production noise (Sentry only)
- Bundle analysis enables performance monitoring

## Self-Check: PASSED

### Created Files Verification
```bash
✓ .husky/pre-commit exists (113 bytes, executable)
```

### Modified Files Verification
```bash
✓ lib/admin/queries.ts line 206 fixed (multi-line object formatting)
✓ next.config.ts contains compiler.removeConsole config
✓ next.config.ts contains withBundleAnalyzer wrapper
✓ package.json contains husky: ^9.1.7
✓ package.json contains @next/bundle-analyzer: ^16.1.6
```

### Commit Verification
```bash
✓ Commit 2d886ac exists (Task 1: fix lint + build config)
✓ Commit 938e92f exists (Task 2: pre-commit hooks)
```

### Functional Verification
```bash
✓ pnpm lint returns errors only in scripts/ (not in target files)
✓ npx tsc --noEmit passes with zero errors
✓ Pre-commit hook is executable and contains correct Biome command
✓ Pre-commit hook tested with temporary lint error (auto-fixed)
```

---

*Execution mode: yolo (auto-approve)*
*Executor: claude-sonnet-4.5-20250929*
*Plan source: .planning/phases/27-foundation-quick-wins/27-01-PLAN.md*
