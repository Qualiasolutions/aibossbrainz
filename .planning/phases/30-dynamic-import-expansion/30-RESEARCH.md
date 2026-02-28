# Phase 30: Dynamic Import Expansion - Research

**Researched:** 2026-03-01
**Domain:** Next.js bundle optimization, code splitting, dynamic imports, font optimization
**Confidence:** HIGH

## Summary

Phase 30 focuses on reducing initial bundle size through strategic lazy loading of heavy components, optimizing font delivery, and replacing oversized UI libraries with lightweight alternatives. The goal is to reduce the new chat page First Contentful Paint (FCP) bundle from ~500KB to ~300KB (30-40% reduction) while maintaining full functionality and ensuring Stripe payment flows remain unbroken.

Next.js 15.6+ provides robust code-splitting infrastructure through `next/dynamic` (a composite of React.lazy + Suspense with SSR support), `@next/bundle-analyzer` for webpack projects, and the experimental Turbopack Bundle Analyzer (v16.1+). The project already has `@next/bundle-analyzer` installed and configured in `next.config.ts`, and uses `optimizePackageImports` for 23 heavy libraries.

**Primary recommendation:** Use `next/dynamic` with explicit `ssr: false` for client-only components, replace Radix Select with native `<select>` on subscribe page only, subset Geist fonts to latin with preload for key weights (400, 500, 600), and dynamically import admin analytics charts and artifact renderers on-demand.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/dynamic` | Next.js 15.6+ | Dynamic imports with SSR control | Built-in, composite of React.lazy + Suspense, supports SSR toggle |
| `@next/bundle-analyzer` | 16.1.6 | Webpack bundle analysis | Official Next.js plugin, installed, generates visual reports |
| `next/font` | Next.js 15.6+ | Font optimization with subsetting | Built-in, auto-optimizes fonts, removes external requests |
| `geist` (npm) | 1.3.1 | Vercel's Geist font family | Already installed, Next.js 15+ default font |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Turbopack Bundle Analyzer | Next.js 16.1+ | Experimental bundle analysis | Use `npx next experimental-analyze` for Turbopack builds |
| `React.lazy` | React 19 | Client-side lazy loading | Use only for client-only React apps (not Next.js) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next/dynamic` | `React.lazy` | React.lazy doesn't support SSR, no `loading` or `ssr` options |
| `@next/bundle-analyzer` | Turbopack analyzer | Turbopack analyzer is experimental (v16.1+), webpack analyzer is stable |
| Radix Select | Native `<select>` | Lose custom styling flexibility, gain ~29.5KB bundle reduction |

**Installation:**
```bash
# Already installed in package.json
pnpm install @next/bundle-analyzer  # v16.1.6 installed
pnpm install geist                   # v1.3.1 installed
```

## Architecture Patterns

### Recommended Dynamic Import Structure
```
app/
├── (chat)/
│   ├── api/chat/route.ts          # Keep server-side code bundled
│   └── [id]/page.tsx               # Dynamically import Chat component
├── (admin)/
│   └── admin/
│       └── analytics/page.tsx      # Dynamically import chart components
└── (auth)/
    └── subscribe/page.tsx          # Replace Radix Select with native
components/
├── chat.tsx                        # Heavy component → dynamic import target
├── admin/
│   └── analytics-charts.tsx        # Chart components → dynamic import
└── artifact/
    └── renderers/                  # Heavy renderers → dynamic import
```

### Pattern 1: Basic Dynamic Import with Loading Fallback
**What:** Lazy load client components with loading UI
**When to use:** Heavy components not needed on initial render
**Example:**
```typescript
// Source: https://nextjs.org/docs/pages/guides/lazy-loading
import dynamic from 'next/dynamic'

const Chat = dynamic(() => import('@/components/chat'), {
  loading: () => <div className="animate-pulse">Loading chat...</div>,
})

export default function ChatPage() {
  return <Chat />
}
```

### Pattern 2: Client-Only Component (SSR Disabled)
**What:** Load components that require browser APIs
**When to use:** Components using `window`, `document`, or browser-specific libraries
**Example:**
```typescript
// Source: https://nextjs.org/docs/pages/guides/lazy-loading
import dynamic from 'next/dynamic'

const VoicePlayer = dynamic(
  () => import('@/components/voice-player'),
  {
    ssr: false,
    loading: () => <div>Loading voice player...</div>
  }
)
```

### Pattern 3: Named Export Dynamic Import
**What:** Import specific named exports from modules
**When to use:** When module exports multiple components/functions
**Example:**
```typescript
// Source: https://nextjs.org/docs/pages/guides/lazy-loading
import dynamic from 'next/dynamic'

const AnalyticsChart = dynamic(() =>
  import('@/components/admin/charts').then((mod) => mod.UsageChart)
)
```

### Pattern 4: External Library Dynamic Import
**What:** Load heavy third-party libraries only when needed
**When to use:** Libraries only used in specific user interactions
**Example:**
```typescript
// Source: https://nextjs.org/docs/pages/guides/lazy-loading
import { useState } from 'react'

export default function SearchPage() {
  const [results, setResults] = useState()

  return (
    <input
      type="text"
      onChange={async (e) => {
        const { value } = e.currentTarget
        // Dynamically load fuse.js only when user types
        const Fuse = (await import('fuse.js')).default
        const fuse = new Fuse(data)
        setResults(fuse.search(value))
      }}
    />
  )
}
```

### Pattern 5: Font Subsetting and Preloading
**What:** Load only required font subsets and weights
**When to use:** Optimizing font delivery for production
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/fonts
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],        // Only load latin characters
  weight: ['400', '500', '600'], // Subset to key weights
  preload: true,              // Preload on route
  display: 'swap',            // Use fallback during load
  variable: '--font-geist',
})
```

### Anti-Patterns to Avoid
- **Template strings in import paths:** `dynamic(() => import(\`./components/${name}\`))` - Next.js cannot statically analyze template strings. Use explicit paths only.
- **Dynamic imports outside top level:** Calling `dynamic()` inside render functions prevents preloading and breaks module matching. Always call at module top level.
- **Missing SSR flag on browser APIs:** Using `window`/`document` in SSR-enabled dynamic imports causes hydration errors. Always set `ssr: false` for browser-dependent components.
- **Lazy loading above-the-fold content:** Dynamic imports add latency. Don't lazy load critical visible content on page load.
- **Over-optimization:** Don't dynamic import components < 10KB or those needed immediately. The loading overhead outweighs bundle savings.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle size analysis | Custom webpack plugin to visualize chunks | `@next/bundle-analyzer` or Turbopack analyzer | Official tools provide precise import tracing, treemap visualization, production-accurate sizing |
| Font optimization | Manual font subsetting and preload logic | `next/font` with `subsets` and `preload` options | Automatic subsetting, removes external network requests, zero layout shift |
| Code splitting | Manual `webpack.splitChunks` configuration | `next/dynamic` + Next.js automatic route splitting | Next.js already does route-based splitting; `next/dynamic` handles component-level needs |
| Loading states | Custom Suspense boundaries for every lazy component | `next/dynamic` `loading` option | Built-in, consistent, works with streaming SSR |
| SSR/CSR toggle | Conditional rendering based on `typeof window` | `next/dynamic` with `ssr: false` | Prevents hydration mismatches, cleaner API, preloading still works |

**Key insight:** Next.js has mature, battle-tested solutions for all bundle optimization needs. Custom solutions risk hydration errors, broken preloading, and SSR/CSR inconsistencies that are hard to debug.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch from SSR/CSR Inconsistency
**What goes wrong:** Component renders differently on server vs client, causing React to throw "Text content does not match server-rendered HTML" errors.
**Why it happens:** Dynamic imports with SSR enabled that depend on browser APIs (`window`, `localStorage`, `Date.now()`, etc.) produce different outputs on server vs client.
**How to avoid:** Use `ssr: false` for any component that accesses browser-only APIs or produces time/random-dependent output.
**Warning signs:** Console errors mentioning "hydration failed", "did not match", or visual flickers on page load.
**Example:**
```typescript
// BAD: SSR enabled but component uses window
const BadComponent = dynamic(() => import('./uses-window'), {
  loading: () => <div>Loading...</div>
})

// GOOD: SSR disabled for browser APIs
const GoodComponent = dynamic(() => import('./uses-window'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})
```

### Pitfall 2: Breaking Payment Flows with Over-Aggressive Code Splitting
**What goes wrong:** Stripe checkout or webhook handling breaks because critical payment code was code-split and fails to load at the right time.
**Why it happens:** Stripe.js initialization or checkout session creation happens in dynamically imported components that haven't loaded yet when user clicks "Pay".
**How to avoid:** Keep Stripe API routes and checkout handlers server-side (NOT dynamically imported). Only dynamic import Stripe UI elements (like custom payment forms) that are clearly client-only and non-critical. Use embedded checkout (iframe) to minimize client-side Stripe code.
**Warning signs:** "Stripe is not defined" errors, checkout redirects failing, webhook processing timing out.
**Example from research:**
```typescript
// SAFE: Server action for checkout (never dynamically import)
// app/api/stripe/checkout/route.ts
export async function POST(req: Request) {
  const session = await stripe.checkout.sessions.create({...})
  return Response.json({ url: session.url })
}

// SAFE: Subscribe page can dynamic import UI-only components
const PaymentSuccessModal = dynamic(() => import('./components/payment-success'), {
  loading: () => <div>Loading...</div>
})
```

### Pitfall 3: Font Preload Without Subset Specification
**What goes wrong:** Next.js shows warning "Please specify subsets in order for font to be preloaded" and font may not optimize correctly.
**Why it happens:** Setting `preload: true` without defining which character subsets to load (e.g., `subsets: ['latin']`).
**How to avoid:** Always specify `subsets` array when using `preload: true`.
**Warning signs:** Build warnings about missing subsets, fonts loading slower than expected.
**Example:**
```typescript
// BAD: preload without subsets
const geist = Geist({ preload: true })

// GOOD: preload with explicit subsets
const geist = Geist({
  subsets: ['latin'],
  preload: true
})
```

### Pitfall 4: Dynamic Import Inside Render (No Preloading)
**What goes wrong:** `dynamic()` must be called at module top level. Calling inside render prevents webpack from matching bundles and preloading them.
**Why it happens:** Developers try to conditionally lazy load based on props or state.
**How to avoid:** Always call `dynamic()` at module scope. If you need conditional rendering, use `dynamic()` to create the component, then conditionally render it with standard `{condition && <Component />}`.
**Warning signs:** Components fail to preload, chunks not pre-fetched on route navigation.
**Example:**
```typescript
// BAD: dynamic() inside render
function BadPage({ showChart }: { showChart: boolean }) {
  if (showChart) {
    const Chart = dynamic(() => import('./chart')) // ❌ called in render
    return <Chart />
  }
  return null
}

// GOOD: dynamic() at module top level
const Chart = dynamic(() => import('./chart'))

function GoodPage({ showChart }: { showChart: boolean }) {
  if (showChart) {
    return <Chart />
  }
  return null
}
```

### Pitfall 5: Lazy Loading Critical Above-the-Fold Content
**What goes wrong:** First Contentful Paint (FCP) and Largest Contentful Paint (LCP) metrics worsen because critical visible content is lazy loaded.
**Why it happens:** Over-applying dynamic imports to components that should render immediately on page load.
**How to avoid:** Only dynamic import components that are below the fold, modal/dialog content, heavy interactive features, or admin/analytics dashboards. Never lazy load the main chat interface, headers, navigation, or primary CTAs.
**Warning signs:** FCP/LCP metrics increase after adding dynamic imports, users see blank screen or "Loading..." states for too long.
**Example:**
```typescript
// BAD: Lazy loading critical header
const Header = dynamic(() => import('./header')) // ❌ users see blank top bar

// GOOD: Lazy loading admin analytics (below fold, conditional)
const AnalyticsChart = dynamic(() => import('@/components/admin/analytics-chart'), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100" />
})
```

## Code Examples

Verified patterns from official sources:

### Analyzing Bundle Size (Before Optimization)
```bash
# Source: https://nextjs.org/docs/app/guides/package-bundling
# Webpack-based analysis (current setup)
ANALYZE=true pnpm build

# Turbopack-based analysis (experimental, Next.js 16.1+)
npx next experimental-analyze

# Write to disk for comparison (before/after)
npx next experimental-analyze --output
cp -r .next/diagnostics/analyze ./analyze-before-phase-30
```

### Chat Component Dynamic Import
```typescript
// app/(chat)/[id]/page.tsx
import dynamic from 'next/dynamic'

const Chat = dynamic(() => import('@/components/chat'), {
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse text-muted-foreground">
        Loading chat...
      </div>
    </div>
  ),
  // SSR enabled by default - Chat component renders on server
})

export default function ChatPage({ params }: { params: { id: string } }) {
  return <Chat chatId={params.id} />
}
```

### Admin Analytics Chart Dynamic Import
```typescript
// app/(admin)/admin/analytics/page.tsx
import dynamic from 'next/dynamic'

const AnalyticsChart = dynamic(
  () => import('@/components/admin/analytics-chart'),
  {
    ssr: false, // Charts often use browser APIs
    loading: () => (
      <div className="h-64 rounded-lg bg-gray-100 animate-pulse" />
    ),
  }
)

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <AnalyticsChart />
    </div>
  )
}
```

### Native Select Replacement (Subscribe Page)
```typescript
// app/(auth)/subscribe/page.tsx
// BEFORE (Radix UI Select - ~29.5KB)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select value={industry} onValueChange={setIndustry}>
  <SelectTrigger>
    <SelectValue placeholder="Select your industry" />
  </SelectTrigger>
  <SelectContent>
    {industries.map((ind) => (
      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
    ))}
  </SelectContent>
</Select>

// AFTER (Native select - minimal bundle impact)
<select
  value={industry}
  onChange={(e) => setIndustry(e.target.value)}
  className="h-11 w-full rounded-md border border-stone-200 bg-white px-3 focus:border-stone-400 focus:ring-stone-400"
>
  <option value="">Select your industry</option>
  {industries.map((ind) => (
    <option key={ind} value={ind}>{ind}</option>
  ))}
</select>
```

### Geist Font Optimization (Current → Optimized)
```typescript
// app/layout.tsx
// BEFORE (current - loads all weights and subsets)
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

// AFTER (optimized - latin subset only, key weights)
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

const geistSans = GeistSans({
  subsets: ['latin'],
  weight: ['400', '500', '600'], // Normal, Medium, Semibold
  preload: true,
  display: 'swap',
  variable: '--font-geist-sans',
})

const geistMono = GeistMono({
  subsets: ['latin'],
  weight: ['400', '500'], // Normal, Medium for code blocks
  preload: true,
  display: 'swap',
  variable: '--font-geist-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### Artifact Renderer Dynamic Import
```typescript
// components/artifact/artifact-viewer.tsx
import dynamic from 'next/dynamic'

const CodeRenderer = dynamic(() => import('./renderers/code-renderer'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
})

const ImageRenderer = dynamic(() => import('./renderers/image-renderer'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
})

const SheetRenderer = dynamic(() => import('./renderers/sheet-renderer'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
})

export function ArtifactViewer({ artifact }) {
  switch (artifact.type) {
    case 'code':
      return <CodeRenderer artifact={artifact} />
    case 'image':
      return <ImageRenderer artifact={artifact} />
    case 'sheet':
      return <SheetRenderer artifact={artifact} />
    default:
      return <div>Unknown artifact type</div>
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React.lazy only | `next/dynamic` (React.lazy + Suspense composite) | Next.js 13+ | SSR support, `loading` option, `ssr` toggle |
| Manual webpack config for code splitting | Automatic route-based splitting | Next.js 13+ App Router | Zero config code splitting per route |
| `@next/bundle-analyzer` (webpack only) | Turbopack Bundle Analyzer experimental | Next.js 16.1+ (Feb 2026) | Integrated with Turbopack's module graph, precise import tracing |
| Manual font subsetting | `next/font` with automatic subsetting | Next.js 13+ | Auto-optimization, no external requests, zero layout shift |
| `optimizePackageImports` manual list | Some packages auto-optimized | Next.js 15+ | Automatic tree-shaking for common libraries |

**Deprecated/outdated:**
- **React.lazy for Next.js projects:** Lacks SSR support, `loading` option, and `ssr: false` toggle. Use `next/dynamic` instead.
- **`@next/bundle-analyzer` openAnalyzer: true:** Opens browser tabs automatically. Set `openAnalyzer: false` (current config is correct).
- **Font imports without `next/font`:** Direct `@import` or `<link>` tags in CSS. Use `next/font` for automatic optimization.

## Open Questions

1. **Stripe.js code-splitting safety**
   - What we know: Stripe API routes and webhooks should never be dynamically imported. Embedded checkout (iframe) minimizes client-side code.
   - What's unclear: Whether current subscribe page implementation has any Stripe.js client code that could break if code-split.
   - Recommendation: Audit subscribe page (`app/(auth)/subscribe/page.tsx`) for Stripe.js imports. Current implementation uses server-side checkout session creation (`/api/stripe/checkout`) which is safe. Subscribe page only redirects to Stripe-hosted checkout - no client-side Stripe code to split.

2. **Analytics chart library bundle size**
   - What we know: Project uses custom chart rendering (no recharts/chart.js in dependencies). Analytics page has minimal chart logic (bar chart visualization using div heights, not heavy library).
   - What's unclear: Whether analytics charts justify dynamic import overhead.
   - Recommendation: Measure analytics page bundle first. If < 20KB, skip dynamic import (overhead not worth it). If > 30KB, apply dynamic import.

3. **Radix Select usage scope**
   - What we know: Radix Select is used on subscribe page (confirmed in code). Also used in `multimodal-input.tsx` for model selector.
   - What's unclear: Whether we should replace ALL Radix Select instances or only subscribe page.
   - Recommendation: Only replace subscribe page Select (non-critical, SEO-focused page). Keep model selector as Radix Select (styled component, part of core chat UX). Success criteria specifies "Subscribe page uses native select" - matches this approach.

4. **Font weight subsetting trade-offs**
   - What we know: Geist is Next.js 15+ default font. Project uses `GeistSans.variable` and `GeistMono.variable`. Need to subset to 400, 500, 600 per success criteria.
   - What's unclear: Whether any UI elements use weights outside 400/500/600 (e.g., 700 bold, 300 light).
   - Recommendation: Audit codebase for `font-bold` (700) and `font-light` (300) Tailwind classes. If found, add those weights to subset. Default recommendation: 400, 500, 600 covers most use cases.

## Sources

### Primary (HIGH confidence)
- [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling) - Last updated 2026-02-27 - Bundle analysis, optimizePackageImports, serverExternalPackages
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/pages/guides/lazy-loading) - Last updated 2026-02-27 - `next/dynamic` API, SSR options, loading states
- [Next.js Font Optimization](https://nextjs.org/docs/app/getting-started/fonts) - Last updated 2026-02-27 - Subsetting, preloading, font optimization
- [@next/bundle-analyzer npm](https://www.npmjs.com/package/@next/bundle-analyzer) - Official plugin, installation and usage
- [Geist Font Official](https://vercel.com/font) - Vercel's official Geist font page

### Secondary (MEDIUM confidence)
- [Next.js Hydration Errors 2026](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702) - Jan 2026 article on hydration error patterns
- [The Ultimate Guide to Stripe + Next.js (2026 Edition)](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33) - Server Actions, embedded checkout, PCI compliance
- [Code Splitting in Next.js: 70% Bundle Reduction](https://medium.com/@sohail_saifi/code-splitting-in-next-js-how-i-reduced-initial-bundle-size-by-70-73a4c328cc6c) - Real-world case study, dynamic import strategies
- [Next.js Bundle Analyzer](https://blog.logrocket.com/how-to-analyze-next-js-app-bundles/) - LogRocket tutorial on bundle analysis workflow

### Tertiary (LOW confidence - marked for validation)
- [Radix UI Select Bundle Size](https://bundlephobia.com/package/@radix-ui/react-select) - Bundlephobia reports 29.5KB for react-select (different library), actual Radix Select size needs verification
- [React.lazy vs next/dynamic](https://blog.ibsenvalath.com/posts/2024-09-01-nextjs-dynamic-import) - 2024 article on differences (slightly dated but core concepts valid)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js documentation (Feb 2026), verified in package.json
- Architecture: HIGH - Official Next.js guides, verified code examples from docs
- Pitfalls: MEDIUM - Combination of official docs and 2026 community articles, need validation in testing

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (30 days - Next.js stable, docs updated regularly)

---

**Key Findings for Planner:**

1. **Bundle analyzer ready:** `@next/bundle-analyzer` v16.1.6 installed, configured in `next.config.ts` with `ANALYZE=true` env var trigger.
2. **Current optimizations:** 23 packages in `optimizePackageImports` (framer-motion, lucide-react, codemirror, Radix UI components).
3. **Safe dynamic import targets:** Chat component, admin analytics charts, artifact renderers. DO NOT dynamic import Stripe API routes or checkout handlers.
4. **Radix Select scope:** Only replace subscribe page (`app/(auth)/subscribe/page.tsx`). Keep model selector in `multimodal-input.tsx` as-is.
5. **Font optimization:** Geist Sans + Mono currently load all weights/subsets. Subset to latin with weights 400, 500, 600 (may need 700 for bold text - audit required).
6. **Stripe safety:** Current subscribe page uses server-side checkout session creation (`/api/stripe/checkout/route.ts`). No client-side Stripe.js to code-split - safe.
7. **Hydration risk:** Admin analytics charts likely use browser APIs - MUST use `ssr: false` in dynamic imports.
