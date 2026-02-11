# Compound Solutions Documentation

## Problem 1: Biome Config Schema Outdated

**Issue**: Biome schema version 1.9.4 in config file vs CLI version 2.3.10 mismatch causing validation errors.

**Root Cause**: Configuration schema lagging behind installed Biome version.

**Solution**: Update schema and configuration using Biome's migration command.

### Fix Steps

1. Run Biome migration to auto-update schema:
```bash
npx @biomejs/biome migrate --write
```

2. Update file excludes to handle workspace directories:
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
  }
}
```

3. Disable CSS linting for Tailwind compatibility:
```json
{
  "css": {
    "parser": {
      "cssModules": true
    },
    "formatter": {
      "enabled": false
    },
    "linter": {
      "enabled": false
    }
  }
}
```

**Why This Works**:
- Schema migration updates configuration syntax to match CLI version 2.3.10
- Excluded directories prevent linting of generated/external code
- CSS linting disabled because Tailwind directives trigger false positives in standard CSS linters

**File Reference**: `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/biome.json`

---

## Problem 2: baseline-browser-mapping Outdated

**Issue**: `baseline-browser-mapping` package pinned to older version causing compatibility warnings.

**Root Cause**: Dependency version constraint lagging behind stable releases.

**Solution**: Update to latest stable version.

### Fix Steps

```bash
pnpm add -D baseline-browser-mapping@latest
```

This updates the package.json devDependencies:
```json
{
  "devDependencies": {
    "baseline-browser-mapping": "^2.9.15"
  }
}
```

**Why This Works**: Version 2.9.15 includes latest browser baseline data and fixes compatibility issues with modern TypeScript and build tools.

**File Reference**: `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/package.json` (line 117)

---

## Problem 3: @types/dompurify Deprecated

**Issue**: `@types/dompurify` package deprecated and redundant—types are now bundled in `dompurify`.

**Root Cause**: Types migration completed in dompurify, separate types package no longer maintained.

**Solution**: Remove the types package entirely.

### Fix Steps

```bash
pnpm remove @types/dompurify
```

**Package Configuration After**:
```json
{
  "dependencies": {
    "dompurify": "^3.3.1"
  }
  // @types/dompurify removed from devDependencies
}
```

**Why This Works**:
- dompurify ^3.3.1 includes TypeScript definitions in the package
- Removes maintenance burden of separate types package
- Eliminates version mismatch between dompurify and types

**File Reference**: `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/package.json` (line 55 shows dompurify, @types/dompurify removed)

---

## Problem 4: components/message.tsx TypeScript Error – Missing role Prop

**Issue**: TypeScript error in `EnhancedChatMessage` component missing required `role` prop.

**Root Cause**: EnhancedChatMessage type definition requires `role` prop to properly type message author (user/assistant).

**Solution**: Add `role` prop to component instance.

### Fix Steps

**Before** (line 147-152):
```tsx
<EnhancedChatMessage
  botType={messageBotType}
  content={sanitizeText(part.text)}
  isTyping={isLoading}
/>
```

**After** (line 147-152):
```tsx
<EnhancedChatMessage
  botType={messageBotType}
  content={sanitizeText(part.text)}
  isTyping={isLoading}
  role={message.role}
/>
```

**Why This Works**:
- `message.role` is of type `"user" | "assistant"` (from ChatMessage type)
- EnhancedChatMessage needs this to style messages correctly per author
- Enables proper TypeScript type checking downstream

**File Reference**: `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/components/message.tsx` (line 151)

---

## Problem 5: components/welcome-tutorial.tsx TypeScript Error – Variable Used Before Declaration

**Issue**: `handleNext` callback references `handleComplete` before it's declared, causing ReferenceError.

**Root Cause**: Variable declaration order—`handleNext` defined before `handleComplete` but needs to call it.

**Solution**: Reorder callback declarations to declare `handleComplete` before `handleNext`.

### Fix Steps

**Before** (lines 111-127 had reverse order):
```tsx
const handleNext = useCallback(() => {
  if (currentStep < tutorialSteps.length - 1) {
    setCurrentStep((prev) => prev + 1);
  } else {
    handleComplete();  // Error: handleComplete not defined yet
  }
}, [currentStep, handleComplete]);

const handleComplete = useCallback(() => {
  localStorage.setItem(TUTORIAL_COMPLETED_KEY, new Date().toISOString());
  setIsOpen(false);
}, []);
```

**After** (corrected order):
```tsx
const handleComplete = useCallback(() => {
  localStorage.setItem(TUTORIAL_COMPLETED_KEY, new Date().toISOString());
  setIsOpen(false);
}, []);

const handleNext = useCallback(() => {
  if (currentStep < tutorialSteps.length - 1) {
    setCurrentStep((prev) => prev + 1);
  } else {
    handleComplete();  // handleComplete now defined
  }
}, [currentStep, handleComplete]);
```

**Why This Works**:
- `handleComplete` declaration moved before `handleNext`
- `handleNext` can now reference `handleComplete` in its dependency array and function body
- TypeScript validates both closure dependencies and declaration order

**File Reference**: `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/components/welcome-tutorial.tsx` (lines 106-127)

---

## Problem 6: Supabase Function Search Path Warning – function_search_path_mutable

**Issue**: Supabase advisory warning about `calculate_subscription_end_date` function not setting `search_path` explicitly, creating potential for mutable function behavior.

**Root Cause**: PL/pgSQL function doesn't set explicit schema search path, which can cause unintended behavior if default search_path changes.

**Solution**: Add `SET search_path TO 'public'` pragma to function definition.

### Fix Steps

**Before** (lines 32-44):
```sql
CREATE OR REPLACE FUNCTION calculate_subscription_end_date(
  start_date timestamp with time zone,
  sub_type text
) RETURNS timestamp with time zone AS $$
BEGIN
  CASE sub_type
    WHEN 'trial' THEN RETURN start_date + interval '7 days';
    WHEN 'monthly' THEN RETURN start_date + interval '1 month';
    WHEN 'biannual' THEN RETURN start_date + interval '6 months';
    ELSE RETURN start_date + interval '7 days';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**After** (with search_path SET):
```sql
CREATE OR REPLACE FUNCTION calculate_subscription_end_date(
  start_date timestamp with time zone,
  sub_type text
) RETURNS timestamp with time zone AS $$
BEGIN
  CASE sub_type
    WHEN 'trial' THEN RETURN start_date + interval '7 days';
    WHEN 'monthly' THEN RETURN start_date + interval '1 month';
    WHEN 'biannual' THEN RETURN start_date + interval '6 months';
    ELSE RETURN start_date + interval '7 days';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public';
```

**SQL Migration to Apply**:
```sql
-- Fix function_search_path_mutable warning
CREATE OR REPLACE FUNCTION calculate_subscription_end_date(
  start_date timestamp with time zone,
  sub_type text
) RETURNS timestamp with time zone AS $$
BEGIN
  CASE sub_type
    WHEN 'trial' THEN RETURN start_date + interval '7 days';
    WHEN 'monthly' THEN RETURN start_date + interval '1 month';
    WHEN 'biannual' THEN RETURN start_date + interval '6 months';
    ELSE RETURN start_date + interval '7 days';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public';
```

**Why This Works**:
- `SET search_path TO 'public'` explicitly declares schema resolution context
- Prevents function behavior from changing if caller's search_path differs
- Satisfies Supabase security advisory for function immutability guarantees
- Does not affect IMMUTABLE pragma—compatible with pure functions

**File Reference**: `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/supabase/migrations/20260115_add_user_subscription.sql` (lines 32-44)

**Application**: Apply migration via Supabase Dashboard SQL Editor to update production function.

---

## Summary

All six issues resolved through:
1. **Configuration updates** - Biome schema migration
2. **Dependency upgrades** - baseline-browser-mapping
3. **Dependency removal** - @types/dompurify
4. **Component prop fixes** - Added missing TypeScript props
5. **Variable ordering** - Corrected callback declaration sequence
6. **Database function hardening** - Added search_path safety pragma

Each fix is minimal, focused, and maintains backward compatibility.

---

## Categorized Solutions Index

For organized, searchable documentation with YAML frontmatter, see `docs/solutions/`:

### Security Issues
- [CSRF Validation Pattern](docs/solutions/security-issues/csrf-validation-api-routes.md) - Initial CSRF setup
- [CSRF HOF Pattern](docs/solutions/security-issues/csrf-hof-pattern-api-routes.md) - DRY refactor with `withCsrf`

### Performance Issues
- [N+1 Query Fix](docs/solutions/performance-issues/n-plus-one-supabase-join.md) - Supabase foreign key JOINs
- [Unstable Cache Pattern](docs/solutions/performance-issues/nextjs-unstable-cache-pattern.md) - Cache with fallback
- [Cache Invalidation](docs/solutions/performance-issues/cache-invalidation-after-mutations.md) - `revalidateTag` after mutations

### TypeScript Issues
- [Type Guards for Supabase JOINs](docs/solutions/typescript-issues/type-guards-supabase-joins.md) - Runtime validation for JOIN results

### API Issues
- [Safe JSON Parsing](docs/solutions/api-issues/safe-json-parsing-api-routes.md) - `safeParseJson` utility for routes

### Build Errors
- [Biome/TypeScript/Supabase Fixes](docs/solutions/build-errors/2026-01-17-biome-typescript-supabase-fixes.md) - Multi-layer build fixes
