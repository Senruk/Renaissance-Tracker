# Renaissance — D1 Rebuild + Full Tracking/Insights Design

**Date:** 2026-08-17
**Status:** Approved architecture. Building code first; Cloudflare credentials wired in a later session.

## Problem

Renaissance (daily-life + SMMA tracker) keeps **losing all data** because its free-tier
Supabase project (`ohtcaqzgfzboscjdrbvp`) **auto-pauses after ~7 days of inactivity** and
eventually deletes the project. Confirmed again 2026-08-17 (DNS NXDOMAIN). This is the
third occurrence of the same failure class (04 Jun sync fix → 28 Jul pause → 17 Aug pause).
App code is fine; there is simply no reachable database during a pause. Building a daily
driver on a backend that self-destructs on a timer is the core defect.

## Goals

1. **Kill the outage class** — move persistence to something that does not auto-pause.
2. **Track everything** for the 20–31 Aug lock-in: money/sales funnel, fitness, courses/certs, job applications (keep existing my-life: habits, health, mood, water, tasks, time).
3. **Insights** — real computed views (funnel conversion, £ pace vs target, fitness streak, cert hours, job response) so the user sees what's actually working.

## Architecture

- **Backend: Cloudflare D1** (durable serverless SQLite). Free tier, no auto-pause, cross-device via the same deployed URL. The app already lives on Cloudflare Pages.
- **API: Cloudflare Pages Functions** — new `functions/api/*` handlers bind D1 and expose a small REST API. The static React app becomes a client to this API via `fetch()`.
- **Frontend: existing React 19/Vite/Tailwind app**, but the SQL/Supabase data layer is replaced by an `apiFetch()` layer.
- **Auth: drop app-level passwords.** Gate the whole deployed site + API behind **Cloudflare Access (Zero Trust)** — free for a single user. Removes the entire auth surface. Local dev runs auth-free against real D1 via wrangler.
- **Out of scope now (later session):** actually creating the D1 DB, wrangler bindings, deploying, configuring Cloudflare Access, and seeding from Supabase. Requires Cloudflare credentials the user will wire up after the code is built.

## Data Model (D1 tables)

Money / sales funnel:
- `outreach` (id, date, type[DMs/COLD_CALL/EMAIL], count, notes)
- `demo` (id, date, prospect, status[SCHEDULED/DONE/LOST], outcome)
- `deal` (id, date, client, amount_gbp, status[INVOICED/PAID/UPSELL], banked_at)
Fitness:
- `workout` (id, date, type[GYM/BADMINTON/REST], notes) — extend existing `workout_logs`
Courses/certs:
- `cert_progress` (id, date, cert_id, hours, modules_done, notes)
Jobs:
- `job_app` (id, company, role, applied_at, status, gate_note, follow_up_due)
Keep my-life: `habits`, `habit_logs`, `water_logs`, `mood_logs`, `tasks`, `time_logs`, `focus_sessions` (existing schema, reused).

(Exact columns finalized in implementation plan. Single-user app, no `user_id` needed going forward, but keep for Supabase-derived rows.)

## API Surface (Pages Functions)

- `functions/api/[domain].ts` — one handler per domain (money, fitness, certs, jobs) with `GET` (list/aggregate) + `POST` (insert) + minimal `PUT`/`DELETE`.
- `functions/api/insights.ts` — returns computed insight payloads from SQL views.

## Insights (computed)

- Funnel: outreach → demos → deals conversion; cumulative £ by day vs the 20–31 Aug £2k target; pace-to-target.
- Fitness: sessions/week vs 5x gym + 2x badminton plan; gym streak.
- Courses: hours/week; cert completion %.
- Jobs: apps/week; response rate; funnel by status/gate.

## Build Order (money first — live for the 20 Aug window)

1. `functions/api/*` + D1 schema + replace `supabase.ts`/`useData.ts` with `apiFetch` data layer.
2. **Money tracker** — outreach/demo/deal entry + £ pace view. Usable by Thu 20 Aug.
3. Fitness, certs, job-app domains.
4. Insights dashboard.
5. Deploy + wire D1 bindings + Cloudflare Access; seed from recovered Supabase export (user restores project meanwhile).

## Open Items / Decisions Made

- Auth: **Cloudflare Access**, no app passwords ✅
- Creds: build code first, wire D1/creds later ✅
- **User action (urgent):** restore Supabase project `ohtcaqzgfzboscjdrbvp` at supabase.com now to prevent permanent data loss; export it later for the seed.
- Active cert for the lock-in plan is still **TBD** (unrelated to this spec; tracked in memory).
