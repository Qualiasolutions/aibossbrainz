# Requirements: AI Boss Brainz v1.5

**Defined:** 2026-02-28
**Core Value:** Founders get instant, actionable sales and marketing strategy from AI executives who remember context and deliver frameworks-based guidance.

## v1.5 Requirements

Requirements for performance optimization and code quality improvements. Each maps to roadmap phases.

### Code Quality

- [ ] **QUAL-01**: Fix lint formatting error in lib/admin/queries.ts:206
- [ ] **QUAL-02**: Replace 20 console.error calls with Pino structured logging
- [ ] **QUAL-03**: Split admin landing page (1540 lines) into maintainable components
- [ ] **QUAL-04**: Split icons.tsx (1274 lines) into category-based modules
- [ ] **QUAL-05**: Split onboarding modal (1059 lines) into step components
- [ ] **QUAL-06**: Add pre-commit lint hooks to prevent future errors

### Performance Optimization

- [ ] **PERF-01**: Compress avatar PNGs to WebP format (alex-avatar.png, kim-avatar.png, collaborative-avatar.png)
- [ ] **PERF-02**: Add priority prop to above-fold avatar images
- [ ] **PERF-03**: Code-split Chat component with dynamic import on /new route
- [ ] **PERF-04**: Replace Radix Select with native select on subscribe page
- [ ] **PERF-05**: Dynamic import heavy admin components (analytics charts, artifact renderers)
- [ ] **PERF-06**: Subset Geist fonts to latin-only and preload key weights
- [ ] **PERF-07**: Configure SWC compiler to remove console statements in production

### Monitoring & Validation

- [ ] **MON-01**: Install @next/bundle-analyzer and establish baseline metrics
- [ ] **MON-02**: Configure Lighthouse CI with Core Web Vitals targets (LCP <1.5s, INP <200ms)
- [ ] **MON-03**: Add CI bundle size monitoring to prevent regressions
- [ ] **MON-04**: Validate LCP improvement from 3.66s to <1.5s on subscribe page
- [ ] **MON-05**: Verify RES score improvement to 80+ on subscribe, 95+ on /new

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Performance

- **PERF-08**: Implement request-level performance tracking with OpenTelemetry
- **PERF-09**: Custom performance monitoring dashboard beyond Vercel Analytics
- **PERF-10**: Automated component performance profiling in development

### Enhanced Quality

- **QUAL-07**: Automated circular dependency detection in CI
- **QUAL-08**: Advanced ESLint rules for React 19 best practices

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Sharp as npm dependency | Conflicts with Vercel auto-install, unnecessary |
| Babel plugins for console removal | Next.js 15 uses SWC compiler, Babel disables SWC optimization |
| Custom image CDN | Next.js + Vercel sufficient for requirements |
| Database migrations to split existing data | No data structure changes required |
| Mobile app optimization | Web-first approach maintained |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QUAL-01 | TBD | Pending |
| QUAL-02 | TBD | Pending |
| QUAL-03 | TBD | Pending |
| QUAL-04 | TBD | Pending |
| QUAL-05 | TBD | Pending |
| QUAL-06 | TBD | Pending |
| PERF-01 | TBD | Pending |
| PERF-02 | TBD | Pending |
| PERF-03 | TBD | Pending |
| PERF-04 | TBD | Pending |
| PERF-05 | TBD | Pending |
| PERF-06 | TBD | Pending |
| PERF-07 | TBD | Pending |
| MON-01 | TBD | Pending |
| MON-02 | TBD | Pending |
| MON-03 | TBD | Pending |
| MON-04 | TBD | Pending |
| MON-05 | TBD | Pending |

**Coverage:**
- v1.5 requirements: 18 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial definition*
