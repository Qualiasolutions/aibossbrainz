---
phase: 14-fix-agents-erroring-when-generating-in-c
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/ai/tools/content-calendar.ts
  - lib/db/queries/content-calendar.ts
autonomous: true

must_haves:
  truths:
    - "AI can successfully generate and save social media posts to ContentCalendar table"
    - "Date/time formats from AI are normalized before database insertion"
    - "Error messages from tool failures are specific and actionable"
  artifacts:
    - path: "lib/ai/tools/content-calendar.ts"
      provides: "Flexible date/time validation with normalization"
      contains: "normalizeDate|normalizeTime"
    - path: "lib/db/queries/content-calendar.ts"
      provides: "Properly typed Supabase client without any cast"
      exports: ["createContentCalendarPosts"]
  key_links:
    - from: "lib/ai/tools/content-calendar.ts"
      to: "lib/db/queries/content-calendar.ts"
      via: "createContentCalendarPosts with normalized data"
      pattern: "await createContentCalendarPosts"
---

<objective>
Fix content calendar tool errors caused by overly strict Zod validation and missing date/time normalization.

Purpose: Allow AI to successfully save social media posts regardless of date/time format variations.
Output: Working contentCalendar tool that handles common date/time formats from Gemini 2.5 Flash.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/qualia/Projects/live/aibossbrainz/.planning/PROJECT.md
@/home/qualia/Projects/live/aibossbrainz/lib/ai/tools/content-calendar.ts
@/home/qualia/Projects/live/aibossbrainz/lib/db/queries/content-calendar.ts
@/home/qualia/Projects/live/aibossbrainz/lib/supabase/types.ts
</context>

<tasks>

<task type="auto">
  <name>Remove strict regex and add date/time normalization</name>
  <files>
    lib/ai/tools/content-calendar.ts
  </files>
  <action>
1. Replace strict regex patterns in socialPostSchema with flexible .string():
   - scheduledDate: Remove `.regex(/^\d{4}-\d{2}-\d{2}$/)`, keep clear .describe() with YYYY-MM-DD example
   - scheduledTime: Remove `.regex(/^\d{2}:\d{2}$/)`, keep clear .describe() with HH:MM example

2. Add date normalization function before execute():
   ```typescript
   function normalizeDate(input: string): string {
     // Try ISO format first (YYYY-MM-DD)
     if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

     // Try single-digit month/day (2026-3-15 → 2026-03-15)
     const paddedMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
     if (paddedMatch) {
       const [_, year, month, day] = paddedMatch;
       return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
     }

     // Try Date.parse() for natural formats (March 15, 2026)
     const parsed = new Date(input);
     if (!isNaN(parsed.getTime())) {
       const year = parsed.getFullYear();
       const month = String(parsed.getMonth() + 1).padStart(2, '0');
       const day = String(parsed.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
     }

     throw new Error(`Invalid date format: ${input}. Expected YYYY-MM-DD or parseable date string.`);
   }
   ```

3. Add time normalization function:
   ```typescript
   function normalizeTime(input: string): string {
     // Try HH:MM format first
     if (/^\d{2}:\d{2}$/.test(input)) return input;

     // Try single-digit hour (9:30 → 09:30)
     const paddedMatch = input.match(/^(\d{1,2}):(\d{2})$/);
     if (paddedMatch) {
       const [_, hour, minute] = paddedMatch;
       return `${hour.padStart(2, '0')}:${minute}`;
     }

     // Try 12-hour format (10:00 AM → 10:00, 3:30 PM → 15:30)
     const ampmMatch = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
     if (ampmMatch) {
       let [_, hour, minute, period] = ampmMatch;
       let hourNum = parseInt(hour, 10);
       if (period.toUpperCase() === 'PM' && hourNum !== 12) hourNum += 12;
       if (period.toUpperCase() === 'AM' && hourNum === 12) hourNum = 0;
       return `${String(hourNum).padStart(2, '0')}:${minute}`;
     }

     throw new Error(`Invalid time format: ${input}. Expected HH:MM (24-hour) or HH:MM AM/PM.`);
   }
   ```

4. In execute(), wrap date/time normalization in try/catch and return clear errors to the model:
   ```typescript
   const sanitizedPosts = posts.map((post, index) => {
     try {
       const normalizedDate = normalizeDate(post.scheduledDate);
       const normalizedTime = post.scheduledTime ? normalizeTime(post.scheduledTime) : null;

       return {
         userId: session.user!.id,
         chatId,
         platform: post.platform,
         caption: sanitizePromptContent(post.caption),
         hashtags: post.hashtags.map((tag) => sanitizePromptContent(tag.replace(/^#/, ''))),
         visualSuggestion: post.visualSuggestion ? sanitizePromptContent(post.visualSuggestion) : null,
         scheduledDate: normalizedDate,
         scheduledTime: normalizedTime,
         status: "draft" as const,
         botType: botType as "alexandria" | "kim" | "collaborative" | null,
         focusMode: focusMode || null,
         metadata: {},
       };
     } catch (err) {
       throw new Error(`Post ${index + 1}: ${err instanceof Error ? err.message : 'Invalid date/time format'}`);
     }
   });
   ```

5. Update catch block to log and return specific error messages:
   ```typescript
   } catch (error) {
     logger.error(
       { err: error, postCount: posts.length, errorMessage: error instanceof Error ? error.message : 'Unknown error' },
       "Content calendar tool error",
     );

     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     return {
       success: false,
       message: `Failed to save posts: ${errorMessage}. Please ensure dates are in YYYY-MM-DD format and times are in HH:MM (24-hour) format.`,
     };
   }
   ```
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no TypeScript errors
  </verify>
  <done>
    - Zod schema accepts any date/time string format
    - normalizeDate() and normalizeTime() handle common format variations
    - Execute function returns specific error messages for date/time parsing failures
    - TypeScript compiles cleanly
  </done>
</task>

<task type="auto">
  <name>Remove any cast from Supabase client</name>
  <files>
    lib/db/queries/content-calendar.ts
  </files>
  <action>
1. Replace getClient() helper with direct createClient() usage in all functions.

2. Remove the `getClient()` helper entirely (lines 19-22).

3. In each query function (getContentCalendarByMonth, getContentCalendarByDate, createContentCalendarPosts, updateContentCalendarStatus, deleteContentCalendarPost), replace:
   ```typescript
   const supabase = await getClient();
   ```

   With:
   ```typescript
   const supabase = await createClient();
   ```

4. Keep the explicit `as ContentCalendar[]` type assertions in return statements where needed (lines 54, 89, 117) since ContentCalendar table is not yet in auto-generated database.types.ts — this is intentional and documented in the comment on line 18.

5. DO NOT add ContentCalendar to database.types.ts — the comment on line 18 notes this is pending regeneration after migration, which is outside the scope of this quick task.

Why: The any cast on the Supabase client was hiding potential TypeScript errors. Using the properly typed client directly is safer even though ContentCalendar isn't in the generated types yet. The return value casts are necessary and acceptable.
  </action>
  <verify>
    Run `npx tsc --noEmit` to confirm no TypeScript errors
  </verify>
  <done>
    - getClient() helper removed
    - All query functions use `await createClient()` directly
    - No `as any` casts on Supabase client
    - TypeScript compiles cleanly
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles cleanly (`npx tsc --noEmit`)
2. AI can test by asking Alexandria or Kim to create a social media post in chat
3. Check Supabase table ContentCalendar (esymbjpzjjkffpfqukxw) for new records
4. Verify error logs show specific date/time parsing errors if AI generates invalid formats
</verification>

<success_criteria>
- AI successfully saves social media posts to ContentCalendar table
- Date formats like "2026-3-15", "March 15, 2026", "2026-03-15" all normalize to YYYY-MM-DD
- Time formats like "9:30", "09:30", "10:00 AM", "3:30 PM" all normalize to HH:MM (24-hour)
- Error messages returned to AI are specific and actionable
- TypeScript compiles without errors
- No `as any` casts on Supabase client
</success_criteria>

<output>
After completion, create `.planning/quick/14-fix-agents-erroring-when-generating-in-c/14-SUMMARY.md`
</output>
