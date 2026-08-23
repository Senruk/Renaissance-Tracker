-- ============================================
-- Renaissance — Cloudflare D1 Database Schema
-- ============================================
-- D1 = serverless SQLite. Apply with:
--   npx wrangler d1 execute renaissance-db --file=d1/schema.sql
-- Single-user app: no auth.users FK. Cloudflare Access gates the deploy.
-- user_id column kept (default 'local') for backward-compat with page code.
-- ============================================

-- 1. PROFILES (gamified tracking UX)
create table if not exists profiles (
  id text primary key default 'local',
  username text not null default 'User',
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  max_streak integer not null default 0,
  streak_freeze integer not null default 1,
  created_at text default (datetime('now'))
);

-- 2. HABITS
create table if not exists habits (
  id integer primary key autoincrement,
  user_id text default 'local',
  name text not null,
  active integer default 1,
  created_at text default (datetime('now'))
);

-- 3. HABIT LOGS (daily check-ins)
create table if not exists habit_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  habit_id integer not null,
  date text not null default (date('now')),
  created_at text default (datetime('now')),
  unique(user_id, habit_id, date)
);

-- 4. WATER LOGS
create table if not exists water_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  amount_ml integer not null,
  created_at text default (datetime('now'))
);

-- 5. MOOD LOGS
create table if not exists mood_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  mood_score integer not null check (mood_score >= 1 and mood_score <= 5),
  note text,
  created_at text default (datetime('now')),
  unique(user_id, date)
);

-- 6. TASKS
create table if not exists tasks (
  id integer primary key autoincrement,
  user_id text default 'local',
  title text not null,
  completed integer default 0,
  priority integer default 0,
  due_date text,
  created_at text default (datetime('now'))
);

-- 7. TIME LOGS
create table if not exists time_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  category text not null,
  domain text default 'Productivity',
  minutes integer not null,
  created_at text default (datetime('now'))
);

-- 8. WORKOUT LOGS (fitness: gym + badminton)
create table if not exists workout_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  type text default 'GYM',            -- GYM | BADMINTON | REST
  activity text,                      -- e.g. "Push day, bench 60x5x5"
  muscle_groups text default '[]',    -- JSON array string
  duration integer,                   -- minutes
  notes text,
  created_at text default (datetime('now'))
);

-- 9. HEALTH LOGS (weight, steps, sleep)
create table if not exists health_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  type text not null,
  value numeric not null,
  created_at text default (datetime('now'))
);

-- 10. QUEST PROGRESS (daily quests)
create table if not exists quest_progress (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  quest_id text not null,
  progress integer default 0,
  target integer not null,
  completed integer default 0,
  unique(user_id, date, quest_id)
);

-- 11. FOCUS SESSIONS
create table if not exists focus_sessions (
  id integer primary key autoincrement,
  user_id text default 'local',
  date text not null default (date('now')),
  minutes integer not null,
  created_at text default (datetime('now'))
);

-- 12. LEADS (SMMA lead tracking)
create table if not exists leads (
  id integer primary key autoincrement,
  user_id text default 'local',
  business_name text not null,
  contact_name text default '',
  phone text default '',
  email text default '',
  notes text default '',
  status text not null default 'pending' check (status in ('pending', 'yes', 'no', 'maybe')),
  source text default '',
  created_at text default (datetime('now')),
  updated_at text default (datetime('now'))
);

-- 13. CALL LOGS (track daily call attempts)
create table if not exists call_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  lead_id integer not null,
  outcome text not null check (outcome in ('yes', 'no', 'maybe', 'no_answer')),
  notes text default '',
  created_at text default (datetime('now'))
);

-- 14. XP LOGS
create table if not exists xp_logs (
  id integer primary key autoincrement,
  user_id text default 'local',
  amount integer not null,
  source text not null,
  created_at text default (datetime('now'))
);

-- ============================================
-- LOCK-IN DOMAINS (↑ money-first)
-- ============================================

-- 15. OUTREACH (daily touch counts by channel)
create table if not exists outreach (
  id integer primary key autoincrement,
  date text not null default (date('now')),
  channel text not null,               -- DM | COLD_CALL | EMAIL | SOCIAL | IN_PERSON
  count integer not null default 1,
  notes text default '',
  created_at text default (datetime('now'))
);

-- 16. DEMOS (booked meetings / sales conversations)
create table if not exists demo (
  id integer primary key autoincrement,
  date text not null default (date('now')),
  business text not null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'DONE', 'LOST')),
  outcome text default '',             -- yes/no/maybe + any notes
  notes text default '',
  created_at text default (datetime('now'))
);

-- 17. DEALS (closed money — the £ target)
create table if not exists deal (
  id integer primary key autoincrement,
  date text not null default (date('now')),
  closed_date text,                    -- when it became a deal
  client text not null,
  amount_gbp integer not null,
  kind text not null default 'NEW' check (kind in ('NEW', 'UPSELL')),
  status text not null default 'INVOICED' check (status in ('INVOICED', 'PAID')),
  banked_at text,                      -- when cash actually landed
  notes text default '',
  created_at text default (datetime('now'))
);

-- 18. CERT PROGRESS (courses / certifications)
create table if not exists cert_progress (
  id integer primary key autoincrement,
  date text not null default (date('now')),
  cert_name text not null,             -- e.g. "Meta Blueprint"
  hours integer not null default 0,
  modules_done integer not null default 0,
  modules_total integer default 0,
  notes text default '',
  created_at text default (datetime('now'))
);

-- 19. JOB APPS
create table if not exists job_app (
  id integer primary key autoincrement,
  company text not null,
  role text not null,
  applied_at text not null default (date('now')),
  status text not null default 'APPLIED' check (status in ('APPLIED', 'REVIEW', 'INTERVIEW', 'OFFER', 'REJECTED')),
  gate_note text default '',           -- ILR/visa/SC-evidencing gates etc.
  follow_up_due text,
  created_at text default (datetime('now'))
);

-- INDEXES
create index if not exists idx_habit_logs_date on habit_logs(date);
create index if not exists idx_water_logs_date on water_logs(date);
create index if not exists idx_mood_logs_date on mood_logs(date);
create index if not exists idx_time_logs_date on time_logs(date);
create index if not exists idx_workout_logs_date on workout_logs(date);
create index if not exists idx_health_logs_date on health_logs(date);
create index if not exists idx_outreach_date on outreach(date);
create index if not exists idx_demo_date on demo(date);
create index if not exists idx_deal_date on deal(date);
create index if not exists idx_job_app_status on job_app(status);