# Roadmap: AI Boss Brainz

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped before GSD tracking)
- ✅ **v1.1 Alexandria Requests** - Phases 6-10 (shipped 2026-02-02)
- ✅ **v1.2 Client Feedback Sweep** - Phases 11-15 (shipped 2026-02-11)
- ✅ **v1.3 AI Production Hardening** - Phases 16-20 (shipped 2026-02-18)
- ✅ **v1.4 Audit Remediation** - Phases 21-26 (shipped 2026-02-18)
- 🚧 **v1.5 Audit & Performance Fixes** - Phases 27-31 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP - SHIPPED (before GSD tracking)</summary>

User authentication, AI personas, focus modes, chat with history, strategy canvases, voice playback, subscriptions, admin panel, landing page, support tickets.

</details>

<details>
<summary>✅ v1.1 Alexandria Requests - SHIPPED 2026-02-02</summary>

Bug fixes (admin panel, unpin), branding updates, billing documentation, Mailchimp integration, documentation assets for email marketing.

</details>

<details>
<summary>✅ v1.2 Client Feedback Sweep - SHIPPED 2026-02-11</summary>

Auth hardening, PDF/copy export quality, AI content generation, voice call fixes, homepage/SEO updates, billing portal, Fireflies KB ingestion, analytics user categories, multi-select reactions.

</details>

<details>
<summary>✅ v1.3 AI Production Hardening - SHIPPED 2026-02-18</summary>

Model resilience with OpenRouter fallback, security hardening (XSS, middleware allowlist, input validation), PII redaction, voice quality improvements, 98% structured logging coverage, AI cost tracking and alerting.

</details>

<details>
<summary>✅ v1.4 Audit Remediation - SHIPPED 2026-02-18</summary>

Prompt injection sanitization, subscription enforcement on voice/realtime, webhook idempotency, model resilience with circuit breakers, security validation, pagination, cost controls, design decision documentation.

Phases 21-26, 13 plans total. All 50 audit findings remediated.

</details>

### 🚧 v1.5 Audit & Performance Fixes (In Progress)

**Milestone Goal:** Improve code quality and page performance based on comprehensive audit findings. Reduce LCP times from 2-4s to under 1.5s on key routes. Achieve RES scores of 80+ on subscribe page, 95+ on new chat page.

**Phase Numbering:** Continues from v1.4 (starts at 27)

**Depth:** Standard (5 phases)

**Coverage:** 18/18 requirements mapped ✓

---

#### Phase 27: Foundation & Quick Wins

**Goal:** Establish performance baselines and deliver immediate improvements with minimal risk

**Depends on:** Nothing (first phase)

**Requirements:** QUAL-01, QUAL-06, PERF-01, PERF-02, PERF-07, MON-01

**Success Criteria** (what must be TRUE):
  1. Developer can view bundle size report showing client/server/edge bundles with component-level breakdown
  2. Subscribe page loads avatar images in WebP format instead of PNG (verified in Network tab)
  3. Production build console output contains zero debug/log statements (only error/warn preserved for Sentry)
  4. Pre-commit hook blocks commits containing new lint errors
  5. Developer has documented baseline metrics (bundle sizes, current LCP times) for comparison

**Plans:** 2 plans in 1 wave

Plans:
- [x] 27-01-PLAN.md — Code quality automation and build optimization
- [x] 27-02-PLAN.md — Image optimization and baseline metrics

---

#### Phase 28: Logging & Observability

**Goal:** Complete migration to structured logging for production debugging capability

**Depends on:** Phase 27

**Requirements:** QUAL-02

**Success Criteria** (what must be TRUE):
  1. Production logs contain zero console.error calls (100% Pino coverage, up from 98%)
  2. All error logs include request ID for Sentry correlation
  3. Structured logs capture error context (user ID, endpoint, operation) in consistent format
  4. Developer can filter production logs by request ID to trace full request lifecycle

**Plans:** 1 plan in 1 wave

Plans:
- [x] 28-01-PLAN.md — Client-side logging migration with Sentry integration

---

#### Phase 29: File Splitting & Refactoring

**Goal:** Reduce large files to maintainable sizes with clear module boundaries

**Depends on:** Phase 28 (logging complete before refactoring to track errors)

**Requirements:** QUAL-03, QUAL-04, QUAL-05

**Success Criteria** (what must be TRUE):
  1. Admin landing page verified as already optimal (308 lines with modular components)
  2. Icons.tsx (1274 lines, 54 icons) split into 6 category files with direct exports (NO barrel index)
  3. Icon consumers (~20 files) migrated to direct category imports for tree-shaking
  4. Onboarding modal (1063 lines) refactored into 9 files with React Context pattern
  5. TypeScript compilation succeeds with zero errors after all splits
  6. Bundle analyzer verifies tree-shaking effectiveness and no circular dependencies

**Plans:** 4 plans in 4 waves (sequential execution)

Plans:
- [x] 29-01-PLAN.md — Split icons.tsx into 6 semantic category files
- [x] 29-02-PLAN.md — Migrate icon consumers to direct category imports
- [x] 29-03-PLAN.md — Split onboarding modal into step components with shared context
- [x] 29-04-PLAN.md — Delete deprecated files and verify bundle improvements

---

#### Phase 30: Dynamic Import Expansion

**Goal:** Reduce initial bundle size through lazy loading of heavy components

**Depends on:** Phase 29 (files split before applying dynamic imports)

**Requirements:** PERF-03, PERF-04, PERF-05, PERF-06

**Success Criteria** (what must be TRUE):
  1. New chat page FCP bundle reduces by 30-40% (target: 500KB → 300KB)
  2. Admin analytics charts load on-demand when user navigates to analytics section
  3. Subscribe page uses native select instead of Radix Select (lighter bundle)
  4. Geist fonts subset to latin-only and preload key weights (400, 500, 600)
  5. Stripe payment flow completes successfully in production build (no code-splitting breakage)

**Plans:** 4 plans in 3 waves

Plans:
- [ ] 30-01-PLAN.md — Baseline bundle analysis and Chat component dynamic imports
- [ ] 30-02-PLAN.md — Font optimization and native select replacement
- [ ] 30-03-PLAN.md — Admin analytics dynamic imports
- [ ] 30-04-PLAN.md — Production verification and bundle comparison

---

#### Phase 31: Validation & Monitoring

**Goal:** Verify performance goals achieved and establish ongoing monitoring

**Depends on:** Phase 30 (all optimizations complete)

**Requirements:** MON-02, MON-03, MON-04, MON-05

**Success Criteria** (what must be TRUE):
  1. Lighthouse CI reports Performance score >90 on subscribe and new chat pages
  2. Subscribe page LCP measures <1.5s in production (improved from 3.66s)
  3. Subscribe page achieves RES score of 80+ (Lighthouse metric)
  4. New chat page achieves RES score of 95+
  5. CI fails builds when bundle size exceeds defined threshold (prevents regressions)

**Plans:** TBD

Plans:
- [ ] 31-01: TBD

---

## Progress

**Execution Order:** Phases 27 → 28 → 29 → 30 → 31

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 27. Foundation & Quick Wins | 2/2 | ✓ Complete | 2026-02-28 |
| 28. Logging & Observability | 1/1 | ✓ Complete | 2026-03-01 |
| 29. File Splitting & Refactoring | 4/4 | ✓ Complete | 2026-03-01 |
| 30. Dynamic Import Expansion | 0/0 | Not started | - |
| 31. Validation & Monitoring | 0/0 | Not started | - |

---

*Roadmap created: 2026-02-28*
*Milestone: v1.5 Audit & Performance Fixes*
