---
title: "Multi-layer dependency and configuration sync issues in Next.js 15 TypeScript project"
category: "build-errors"
tags:
  - biome
  - configuration-drift
  - type-definitions
  - deprecation
  - supabase
  - typescript
  - react-19
  - next-15
components:
  - biome.json
  - package.json
  - components/message.tsx
  - components/welcome-tutorial.tsx
  - tsconfig.json
  - supabase/migrations
severity: high
date_solved: "2026-01-17"
root_cause: |
  Multiple dependency and configuration mismatches accumulated from framework/dependency
  upgrades (Next.js 15.6, React 19, TypeScript 5.x, Biome 2.3.10). Biome schema outdated
  (v1.9.4), type definitions changed in upstream packages (@types/dompurify deprecated),
  missing component prop types (React 19 stricter requirements), variable scope issues
  in conditional exports, and Supabase RLS function security config not updated.
time_to_resolve: "15-20 minutes"
---

# Multi-layer Dependency and Configuration Sync Issues

## Problem Summary

After routine maintenance, the build process revealed multiple interconnected issues:
1. Biome linter/formatter config schema mismatch
2. Outdated dependency warnings
3. TypeScript compilation errors
4. Supabase security advisor warnings

## Symptoms

- `pnpm lint` warnings about outdated Biome schema
- `pnpm outdated` showing baseline-browser-mapping behind
- Build errors in components/message.tsx and components/welcome-tutorial.tsx
- Supabase Dashboard showing `function_search_path_mutable` security warning

## Root Cause Analysis

### 1. Biome Configuration Drift

**Cause:** Biome CLI updated to 2.3.10 but `biome.json` still referenced schema 1.9.4.

**Impact:** Linting worked but with warnings; new Biome features unavailable.

### 2. Deprecated Type Definitions

**Cause:** `@types/dompurify` package is deprecated because `dompurify@3.x` now bundles its own TypeScript definitions.

**Impact:** Redundant package in dependencies; potential type conflicts.

### 3. Missing React Prop

**Cause:** `EnhancedChatMessage` component requires a `role` prop, but `components/message.tsx` wasn't passing it.

**Impact:** TypeScript compilation error.

### 4. Variable Declaration Order

**Cause:** In `components/welcome-tutorial.tsx`, `handleNext` referenced `handleComplete` before it was declared.

**Impact:** TypeScript error due to temporal dead zone with `const` declarations.

### 5. Supabase Function Security

**Cause:** PostgreSQL function `calculate_subscription_end_date` was created without explicit `SET search_path`, making it vulnerable to search_path injection.

**Impact:** Security warning in Supabase Dashboard advisors.

## Solutions

### Fix 1: Biome Configuration Migration

```bash
npx @biomejs/biome migrate --write
```

Then update `biome.json` to exclude external directories and disable CSS linting:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.10/schema.json",
  "files": {
    "includes": [
      "**",
      "!**/node_modules",
      "!**/.next",
      "!**/.vercel",
      "!**/artifacts",
      "!**/public",
      "!**/*.min.js",
      "!**/*.d.ts",
      "!**/_bmad/**",
      "!**/.bmad-core/**",
      "!**/.beads/**",
      "!**/Knowledge Base/**"
    ]
  },
  "css": {
    "parser": { "cssModules": true },
    "formatter": { "enabled": false },
    "linter": { "enabled": false }
  }
}
```

### Fix 2: Update baseline-browser-mapping

```bash
pnpm add -D baseline-browser-mapping@latest
```

### Fix 3: Remove Deprecated @types/dompurify

```bash
pnpm remove @types/dompurify
```

### Fix 4: Add Missing role Prop (components/message.tsx:147-152)

```tsx
<EnhancedChatMessage
  botType={messageBotType}
  content={sanitizeText(part.text)}
  isTyping={isLoading}
  role={message.role}  // Added this prop
/>
```

### Fix 5: Reorder Function Declarations (components/welcome-tutorial.tsx:106-127)

Move `handleComplete` before `handleNext`:

```tsx
const handleComplete = useCallback(() => {
  localStorage.setItem(TUTORIAL_COMPLETED_KEY, new Date().toISOString());
  setIsOpen(false);
}, []);

const handleNext = useCallback(() => {
  if (currentStep < tutorialSteps.length - 1) {
    setCurrentStep((prev) => prev + 1);
  } else {
    handleComplete();  // Now defined above
  }
}, [currentStep, handleComplete]);
```

### Fix 6: Supabase Function search_path Security

Apply migration to fix function security:

```sql
DROP FUNCTION IF EXISTS public.calculate_subscription_end_date(timestamp with time zone, text);

CREATE OR REPLACE FUNCTION public.calculate_subscription_end_date(
  start_date timestamp with time zone,
  sub_type text
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'  -- Security fix
AS $function$
BEGIN
  CASE sub_type
    WHEN 'trial' THEN RETURN start_date + interval '7 days';
    WHEN 'monthly' THEN RETURN start_date + interval '1 month';
    WHEN 'biannual' THEN RETURN start_date + interval '6 months';
    ELSE RETURN start_date + interval '7 days';
  END CASE;
END;
$function$;
```

## Prevention Strategies

### Biome Configuration Drift
- Pin Biome version in package.json
- Add CI check: `npx @biomejs/biome --version` validation
- Run `biome migrate --write` after any Biome update

### Dependency Management
- Schedule monthly `pnpm outdated` reviews
- Add `npm audit` to CI pipeline
- Track deprecation warnings in build logs

### TypeScript Prop Errors
- Enable `strict: true` in tsconfig.json (already enabled)
- Use explicit Props interfaces for all components
- Consider `noImplicitAny` and `exactOptionalPropertyTypes`

### Function Declaration Order
- Follow pattern: pure functions → callbacks → effects → handlers
- Document hook ordering conventions in CLAUDE.md
- Enable Biome's React hook linting rules

### Supabase Function Security
- Always include `SET search_path TO 'public'` in function definitions
- Create validation script to check all functions
- Run Supabase advisors check before deployments

## Verification

```bash
# Verify build passes
pnpm build

# Verify lint passes
pnpm lint

# Verify Supabase advisors (via MCP or Dashboard)
# Should show only "Leaked Password Protection Disabled" warning
```

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Project architecture and commands
- [supabase/README.md](../../../supabase/README.md) - Database migrations guide
- [docs/audits/2026-01-15-production-audit.md](../../audits/2026-01-15-production-audit.md) - Full production audit

## Commit Reference

```
fix: biome migration, dependency updates, and TypeScript fixes

- Migrate Biome config from 1.9.4 to 2.3.10 schema
- Update baseline-browser-mapping to 2.9.15
- Remove deprecated @types/dompurify (now bundled)
- Fix components/message.tsx: add missing role prop to EnhancedChatMessage
- Fix components/welcome-tutorial.tsx: reorder function declarations
- Update biome.json to exclude external dirs (_bmad, .bmad-core, .beads)
- Disable CSS linting for Tailwind directives
- Apply consistent formatting across codebase
```
