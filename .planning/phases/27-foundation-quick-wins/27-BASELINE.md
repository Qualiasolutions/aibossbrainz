# Phase 27 Performance Baseline

**Date:** 2026-02-28
**Purpose:** Document baseline metrics before Phase 27-31 optimizations for validation in Phase 31
**Next.js Version:** 15.5.11
**Node Version:** v25.6.1
**Build Tool:** Turbopack (Next.js 15 default)

---

## Bundle Size Metrics

### Shared Client Bundles
- **Total First Load JS (shared):** 226 kB
  - `chunks/62042-631c5abbd2bf98d5.js`: 125 kB
  - `chunks/9fe9470e-db7a5a5a2dfdd4a2.js`: 54.4 kB
  - `chunks/e406df73-ec35d5d49d660afc.js`: 37.1 kB
  - Other shared chunks: 9.77 kB

### Middleware
- **Middleware bundle:** 200 kB

### Top 10 Largest Routes (by First Load JS)

| Route | Page Size | First Load JS | Notes |
|-------|-----------|---------------|-------|
| `/chat/[id]` | 413 B | **1.06 MB** | Main chat interface (largest) |
| `/new` | 412 B | **1.06 MB** | New chat page (same bundle as /chat/[id]) |
| `/history` | 9.02 kB | 340 kB | Chat history page |
| `/admin/users/[id]` | 3.48 kB | 331 kB | User detail page |
| `/reports` | 4.92 kB | 323 kB | Reports library |
| `/executives` | 535 B | 313 kB | Executive selector |
| `/forgot-password` | 1.97 kB | 311 kB | Password reset page |
| `/reset-password` | 2.77 kB | 312 kB | Password reset confirm |
| `/signup` | 3.09 kB | 312 kB | Signup page |
| `/admin/landing-page` | 11.4 kB | 307 kB | CMS landing page editor |

**Key Observation:** The main chat routes (`/chat/[id]` and `/new`) are significantly larger at **1.06 MB** — this is the primary optimization target for Phase 30 (Dynamic Imports).

### Static vs Dynamic Routes
- **Total routes:** 80
- **Static routes:** 15 (prerendered)
- **Dynamic routes:** 59 (server-rendered)
- **API routes:** 27

---

## Image Size Metrics

### Avatar Images (WebP Conversion - Plan 27-02)

| File | PNG Size (before) | WebP Size (after) | Reduction |
|------|-------------------|-------------------|-----------|
| alex-avatar | 1.10 MB | 47 KB | **95.9%** |
| kim-avatar | 1.20 MB | 56 KB | **95.5%** |
| collaborative-avatar | 1.75 MB | 82 KB | **95.5%** |
| **Total** | **4.05 MB** | **185 KB** | **95.6%** |

**Impact:** Avatar images reduced from 4 MB to 185 KB total.

---

## Build Performance

### Build Metrics (from `pnpm build`)
- **Compilation time:** 74s (first build), 60s (cached build with analyzer)
- **Static page generation:** 65 pages generated
- **Build warnings:**
  - Mismatching @next/swc version (15.5.7 vs 15.5.11)
  - OpenTelemetry Edge Runtime compatibility warnings (Sentry)
  - Webpack big string serialization warnings (188 kB, 139 kB, 131 kB)

### Bundle Analyzer Reports Generated
- `.next/analyze/client.html` — Client-side bundle analysis
- `.next/analyze/nodejs.html` — Node.js server bundle analysis
- `.next/analyze/edge.html` — Edge runtime bundle analysis

---

## Performance Targets for Phase 31 Validation

### Expected Improvements by Phase 31:

| Metric | Baseline | Target | Phase |
|--------|----------|--------|-------|
| Main chat First Load JS | 1.06 MB | <500 kB | 30 (Dynamic Imports) |
| Shared bundle size | 226 kB | <200 kB | 28 (Tree-shaking) |
| Avatar image sizes | 4.05 MB (PNG) | 185 KB (WebP) | **27-02 ✅** |
| Build time | 74s | <60s | 29 (Turbopack config) |
| LCP (homepage) | TBD | <2.5s | 31 (Validation) |
| TBT (main chat) | TBD | <200ms | 31 (Validation) |

**Note on LCP/TBT:** These require browser-based Lighthouse testing in production. Run Lighthouse audit in Phase 31 against production deployment to capture actual user-facing metrics.

---

## Next Steps

1. **Phase 27-03:** Implement caching headers
2. **Phase 28:** Apply tree-shaking optimizations
3. **Phase 29:** Optimize Turbopack build config
4. **Phase 30:** Implement dynamic imports for chat routes
5. **Phase 31:** Run Lighthouse audit to measure LCP, TBT, CLS improvements

---

## Notes

- Bundle analyzer successfully configured via `@next/bundle-analyzer` (Plan 27-01)
- WebP conversion reduced avatar payload by **95.6%** (Plan 27-02)
- Main optimization focus should be `/chat/[id]` route (1.06 MB First Load JS)
- Consider code-splitting the shared 125 kB chunk in Phase 28
- OpenTelemetry/Sentry edge warnings are expected (Sentry uses Node.js APIs in edge runtime) — not a blocker

**Baseline captured:** 2026-02-28 23:42 UTC
**Signed off by:** Phase 27 executor (automated)
