-- ============================================
-- Renaissance Public — Supabase Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ohtcaqzgfzboscjdrbvp/sql/new
-- ============================================

-- 1. PROFILES
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null default 'User',
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  max_streak integer not null default 0,
  streak_freeze integer not null default 1,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can delete own profile" on profiles for delete using (auth.uid() = id);

-- 2. HABITS
create table if not exists habits (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);
alter table habits enable row level security;
create policy "Users can read own habits" on habits for select using (auth.uid() = user_id);
create policy "Users can insert own habits" on habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on habits for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on habits for delete using (auth.uid() = user_id);

-- 3. HABIT LOGS (daily check-ins)
create table if not exists habit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  habit_id bigint references habits on delete cascade not null,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, habit_id, date)
);
alter table habit_logs enable row level security;
create policy "Users can read own habit_logs" on habit_logs for select using (auth.uid() = user_id);
create policy "Users can insert own habit_logs" on habit_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own habit_logs" on habit_logs for delete using (auth.uid() = user_id);

-- 4. WATER LOGS
create table if not exists water_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  amount_ml integer not null,
  created_at timestamptz default now()
);
alter table water_logs enable row level security;
create policy "Users can read own water_logs" on water_logs for select using (auth.uid() = user_id);
create policy "Users can insert own water_logs" on water_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own water_logs" on water_logs for delete using (auth.uid() = user_id);

-- 5. MOOD LOGS
create table if not exists mood_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  mood_score integer not null check (mood_score >= 1 and mood_score <= 5),
  note text,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table mood_logs enable row level security;
create policy "Users can read own mood_logs" on mood_logs for select using (auth.uid() = user_id);
create policy "Users can insert own mood_logs" on mood_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own mood_logs" on mood_logs for update using (auth.uid() = user_id);
create policy "Users can delete own mood_logs" on mood_logs for delete using (auth.uid() = user_id);

-- 6. TASKS
create table if not exists tasks (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  title text not null,
  completed boolean default false,
  priority integer default 0,
  due_date date,
  created_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Users can read own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on tasks for delete using (auth.uid() = user_id);

-- 7. TIME LOGS
create table if not exists time_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  category text not null,
  domain text default 'Productivity',
  minutes integer not null,
  created_at timestamptz default now()
);
alter table time_logs enable row level security;
create policy "Users can read own time_logs" on time_logs for select using (auth.uid() = user_id);
create policy "Users can insert own time_logs" on time_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own time_logs" on time_logs for delete using (auth.uid() = user_id);

-- 8. WORKOUT LOGS
create table if not exists workout_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  muscle_groups text[] not null default '{}',
  duration integer,
  notes text,
  created_at timestamptz default now()
);
alter table workout_logs enable row level security;
create policy "Users can read own workout_logs" on workout_logs for select using (auth.uid() = user_id);
create policy "Users can insert own workout_logs" on workout_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own workout_logs" on workout_logs for delete using (auth.uid() = user_id);

-- 9. HEALTH LOGS (weight, steps, sleep)
create table if not exists health_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  type text not null,
  value numeric not null,
  created_at timestamptz default now()
);
alter table health_logs enable row level security;
create policy "Users can read own health_logs" on health_logs for select using (auth.uid() = user_id);
create policy "Users can insert own health_logs" on health_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own health_logs" on health_logs for delete using (auth.uid() = user_id);

-- 10. QUEST PROGRESS (daily quests)
create table if not exists quest_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  quest_id text not null,
  progress integer default 0,
  target integer not null,
  completed boolean default false,
  unique(user_id, date, quest_id)
);
alter table quest_progress enable row level security;
create policy "Users can read own quest_progress" on quest_progress for select using (auth.uid() = user_id);
create policy "Users can insert own quest_progress" on quest_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own quest_progress" on quest_progress for update using (auth.uid() = user_id);

-- 11. FOCUS SESSIONS
create table if not exists focus_sessions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  date date not null default current_date,
  minutes integer not null,
  created_at timestamptz default now()
);
alter table focus_sessions enable row level security;
create policy "Users can read own focus_sessions" on focus_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own focus_sessions" on focus_sessions for insert with check (auth.uid() = user_id);

-- 12. LEADS (SMMA lead tracking)
create table if not exists leads (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  business_name text not null,
  contact_name text default '',
  phone text default '',
  email text default '',
  notes text default '',
  status text not null default 'pending' check (status in ('pending', 'yes', 'no', 'maybe')),
  source text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Users can read own leads" on leads for select using (auth.uid() = user_id);
create policy "Users can insert own leads" on leads for insert with check (auth.uid() = user_id);
create policy "Users can update own leads" on leads for update using (auth.uid() = user_id);
create policy "Users can delete own leads" on leads for delete using (auth.uid() = user_id);
create index if not exists idx_leads_user_status on leads(user_id, status);

-- 13. CALL LOGS (track daily call attempts)
create table if not exists call_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  lead_id bigint references leads on delete cascade not null,
  outcome text not null check (outcome in ('yes', 'no', 'maybe', 'no_answer')),
  notes text default '',
  created_at timestamptz default now()
);
alter table call_logs enable row level security;
create policy "Users can read own call_logs" on call_logs for select using (auth.uid() = user_id);
create policy "Users can insert own call_logs" on call_logs for insert with check (auth.uid() = user_id);
create policy "Users can delete own call_logs" on call_logs for delete using (auth.uid() = user_id);
create index if not exists idx_call_logs_user_date on call_logs(user_id, created_at);

-- 14. XP LOGS
create table if not exists xp_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users not null,
  amount integer not null,
  source text not null,
  created_at timestamptz default now()
);
alter table xp_logs enable row level security;
create policy "Users can read own xp_logs" on xp_logs for select using (auth.uid() = user_id);
create policy "Users can insert own xp_logs" on xp_logs for insert with check (auth.uid() = user_id);

-- INDEXES
create index if not exists idx_habit_logs_user_date on habit_logs(user_id, date);
create index if not exists idx_water_logs_user_date on water_logs(user_id, date);
create index if not exists idx_mood_logs_user_date on mood_logs(user_id, date);
create index if not exists idx_time_logs_user_date on time_logs(user_id, date);
create index if not exists idx_workout_logs_user_date on workout_logs(user_id, date);
create index if not exists idx_health_logs_user_date on health_logs(user_id, date);
create index if not exists idx_xp_logs_user on xp_logs(user_id);
