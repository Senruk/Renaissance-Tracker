# Fix: Renaissance data not saving

## Context

The Supabase project at `ohtcaqzgfzboscjdrbvp.supabase.co` has been paused (DNS returns `NXDOMAIN`). Free-tier Supabase projects auto-pause after 1 week of inactivity. The existing `keep-alive.yml` GitHub Action only pings the project URL/auth endpoint, which doesn't register as database activity. Additionally, the app has zero error handling on Supabase writes — every `insert`/`update`/`delete` call silently fails when the project is paused, giving the user no feedback.

## Fixes

### 1. Update keep-alive workflow (`.github/workflows/keep-alive.yml`)

Replace the URL pings with a real Supabase REST API query against a small table (e.g. `SELECT count(*) FROM profiles`). This counts as database activity and will prevent auto-pausing.

Key detail: Use the anon key from `src/lib/supabase.ts` in the `apikey` header. Add a `Prefer: count=exact` header to force the DB to actually process the query (not just cache it).

### 2. Add error logging to all Supabase writes (`src/lib/supabase.ts`)

Wrap the exported `supabase` client so every `insert`/`update`/`delete` call logs errors to the console. This way:
- The user can open DevTools and see exactly why writes fail
- No changes needed in any of the 8 page/context files that call Supabase
- Once the project is restored, existing code works as-is

Implementation: Add a `db` export — a Proxy-wrapped version of `supabase.from()` that intercepts the PostgrestQueryBuilder chain methods and wraps them with try/catch + console.error.

### 3. Supabase project restore (manual — user action)

The user needs to:
1. Go to https://supabase.com/dashboard/project/ohtcaqzgfzboscjdrbvp
2. Click "Restore project" (should be a banner at the top)
3. Wait a minute for the project to come back online
4. Data will still be there — Supabase doesn't delete data on pause

## Files to modify

| File | Change |
|---|---|
| `.github/workflows/keep-alive.yml` | Replace URL pings with real DB query |
| `src/lib/supabase.ts` | Add `db` export with error-logging Proxy |

## Files NOT to modify

No changes needed in: `AuthContext.tsx`, `Dashboard.tsx`, `Habits.tsx`, `Health.tsx`, `Gym.tsx`, `Time.tsx`, `Leads.tsx`, `Settings.tsx` — the `db` wrapper makes error handling transparent.

## Verification

1. After deployment: Open browser DevTools console on the live app, try adding a habit. Should see `[DB] insert error on habits:` logged (since project is still paused).
2. After Supabase restore: Adding data should work with no console errors.
3. Verify keep-alive by checking the GitHub Action runs and returns a 200 from the REST API.
