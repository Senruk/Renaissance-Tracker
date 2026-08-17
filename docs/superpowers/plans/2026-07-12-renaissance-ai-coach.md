# Renaissance AI Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Renaissance daily tracker app into a personalised AI life coach with nutrition tracking, desk exercise tracking, skill-building career paths, and an intelligent coach feed.

**Architecture:** Single-page React app with bottom tab navigation. New Body tab combines existing Gym + Health pages with Meals and Work sub-tabs. Coach page uses a client-side rules engine (no API calls). Career page uses prebuilt skill trees. All data stored in Supabase free tier.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS v4, Supabase, Framer Motion, recharts, lucide-react

## Global Constraints

- Zero paid services — Supabase free tier only, no OpenAI/external APIs
- Coach is a local rules engine — no ML, no external LLM calls
- All existing pages remain untouched except bug fixes + one Dashboard card addition
- Dark neon glassmorphism theme (neon-cyan, neon-purple, neon-pink, neon-green)

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/pages/Body.tsx` | Unified Body page with Gym/Health/Meals/Work sub-tabs |
| `src/pages/Coach.tsx` | AI Coach feed — smart cards from rules engine |
| `src/pages/Career.tsx` | Skill trees, income tracker, learning timer |
| `src/hooks/useCoach.ts` | Client-side rules engine for coach insights |
| `src/hooks/useCareer.ts` | Fetches skill/income/learning data |
| `src/hooks/useWork.ts` | Work session state management |
| `src/lib/skillData.ts` | Prebuilt skill trees seed data |
| `supabase/migrations/20260712_coach_tables.sql` | New DB tables DDL |

### Modified Files
| File | Change |
|------|--------|
| `src/components/ui/Navigation.tsx` | Replace nav items with: Today, Habits, Body, Coach, Career, Leads, Settings |
| `src/App.tsx` | Add routes for /body, /coach, /career; remove /health, /gym from nav route list |
| `src/hooks/useData.ts:40` | Fix bug: change duplicate `'habits'` fetch to `'water_logs'` |
| `src/pages/Analytics.tsx` | Replace mock chart data with real weekly DB aggregates |
| `src/pages/Dashboard.tsx` | Add "Coach Says" card linking to /coach |
| `src/lib/constants.ts` | Add new XP rewards for meal_log and skill_session |

---

### Task 1: Fix Existing Bugs

**Files:**
- Modify: `src/hooks/useData.ts:38-47`
- Modify: `src/pages/Analytics.tsx`

**Interfaces:**
- Consumes: `supabase`, `useAuth`, `useData` (existing)
- Produces: Working water_logs data in useData; real chart data in Analytics

- [ ] **Step 1: Fix useData.ts duplicate habits bug**

The destructured variables on line 37 map to array indices 0-8. Line 40 duplicates `habits` instead of fetching `water_logs`, shifting all subsequent indices by one position and causing `focus_sessions` to be uncaptured.

Replace lines 38-47 with the correct mapping:

```ts
const [habits, habit_logs, water, mood, tasks, time, workouts, quests, focus] = await Promise.all([
  supabase.from('habits').select('*').eq('user_id', user.id).order('created_at'),
  supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
  supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
  supabase.from('mood_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
  supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at'),
  supabase.from('time_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
  supabase.from('workout_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
  supabase.from('quest_progress').select('*').eq('user_id', user.id).eq('date', todayStr),
  supabase.from('focus_sessions').select('*').eq('user_id', user.id).eq('date', todayStr),
])
```

- [ ] **Step 2: Verify the fix doesn't break anything**

Run: `npx tsc --noEmit`
Expected: No errors. `data.water_logs` will actually contain water log data.

- [ ] **Step 3: Replace mock chart data in Analytics.tsx with real weekly queries**

Add a weekly data fetch using `useEffect` + `supabase`. Replace the mock `weeklyWater` and `weeklyMood` arrays:

```tsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Add inside the Analytics component:
const { user } = useAuth()
const [weeklyData, setWeeklyData] = useState<{ water: any[]; mood: any[] }>({ water: [], mood: [] })

useEffect(() => {
  async function loadWeekly() {
    if (!user) return
    const dates: string[] = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    const [waterRes, moodRes] = await Promise.all([
      supabase.from('water_logs').select('date, amount_ml').eq('user_id', user.id).gte('date', dates[0]).lte('date', dates[6]),
      supabase.from('mood_logs').select('date, mood_score').eq('user_id', user.id).gte('date', dates[0]).lte('date', dates[6]),
    ])
    setWeeklyData({
      water: dates.map((date, i) => ({
        day: dayNames[i],
        ml: (waterRes.data || []).filter(r => r.date === date).reduce((s, r) => s + (r.amount_ml || 0), 0),
      })),
      mood: dates.map((date, i) => ({
        day: dayNames[i],
        mood: (moodRes.data || []).find(r => r.date === date)?.mood_score || 0,
      })),
    })
  }
  loadWeekly()
}, [user])
```

Then replace `<BarChart data={weeklyWater}>` with `<BarChart data={weeklyData.water}>` and `<LineChart data={weeklyMood}>` with `<LineChart data={weeklyData.mood}>`.

- [ ] **Step 4: Commit the bug fixes**

```bash
git add src/hooks/useData.ts src/pages/Analytics.tsx
git commit -m "fix: correct water_logs data binding and replace mock analytics with real data"
```

---

### Task 2: Create Database Tables

**Files:**
- Create: `supabase/migrations/20260712_coach_tables.sql`

**Interfaces:**
- Consumes: Existing Supabase project, auth.users
- Produces: 7 new tables + 1 column on habits

- [ ] **Step 1: Create the migration directory and write SQL**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260712_coach_tables.sql`:

```sql
-- Habits category column
ALTER TABLE habits ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Meal logging
CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text NOT NULL,
  calories int DEFAULT 0,
  protein_g numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);

-- Skill trees (seeded data)
CREATE TABLE IF NOT EXISTS skill_trees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  levels jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- User skill progress
CREATE TABLE IF NOT EXISTS skill_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  skill_id uuid REFERENCES skill_trees(id) NOT NULL,
  current_level int DEFAULT 1,
  xp int DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, skill_id)
);

-- Learning sessions
CREATE TABLE IF NOT EXISTS skill_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  skill_id uuid REFERENCES skill_trees(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration_min int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_sessions_user_date ON skill_sessions(user_id, date);

-- Income tracking
CREATE TABLE IF NOT EXISTS income_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  source text,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_income_logs_user_date ON income_logs(user_id, date);

-- Work sessions
CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time,
  end_time time,
  total_minutes int DEFAULT 0,
  breaks_taken int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_date ON work_sessions(user_id, date);

-- Break logs
CREATE TABLE IF NOT EXISTS break_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  time time,
  duration_min int DEFAULT 0,
  break_type text DEFAULT 'stretch',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_break_logs_user_date ON break_logs(user_id, date);

-- Enable RLS on all new tables
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only read/write their own data
CREATE POLICY "meal_logs_self" ON meal_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "skill_trees_read_all" ON skill_trees FOR SELECT USING (true);
CREATE POLICY "skill_progress_self" ON skill_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "skill_sessions_self" ON skill_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "income_logs_self" ON income_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "work_sessions_self" ON work_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "break_logs_self" ON break_logs FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 2: Run the migration**

Paste the SQL into the Supabase dashboard SQL editor and run it. Or if using Supabase CLI:
```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add coach feature database tables and RLS policies"
```

---

### Task 3: Create Prebuilt Skill Trees Data

**Files:**
- Create: `src/lib/skillData.ts`

**Interfaces:**
- Consumes: `skill_trees` table schema
- Produces: `SKILL_TREES` constant array

- [ ] **Step 1: Write the skill trees seed data**

```ts
export interface SkillLevel {
  level: number
  title: string
  tasks: string[]
  xpRequired: number
}

export interface SkillTree {
  id: string
  name: string
  category: string
  description: string
  icon: string
  levels: SkillLevel[]
}

export const SKILL_TREES: SkillTree[] = [
  {
    id: 'sales',
    name: 'Sales',
    category: 'Business',
    description: 'Learn to sell — the most valuable skill for making money without a degree.',
    icon: 'PhoneCall',
    levels: [
      { level: 1, title: 'Cold Calling Basics', tasks: ['Watch 3 cold-calling tutorials', 'Write a 30-second pitch script', 'Make 5 practice calls to friends'], xpRequired: 100 },
      { level: 2, title: 'Objection Handling', tasks: ['Learn 5 common objections', 'Write rebuttals for each', 'Role-play with a partner'], xpRequired: 250 },
      { level: 3, title: 'Closing Techniques', tasks: ['Study 3 closing methods', 'Practice assumptive close', 'Close 1 real lead'], xpRequired: 500 },
      { level: 4, title: 'Pipeline Management', tasks: ['Set up a CRM (free tier)', 'Track 20 leads', 'Maintain 50% follow-up rate'], xpRequired: 1000 },
      { level: 5, title: 'Sales Pro', tasks: ['Close 10 deals total', 'Average £500+ per deal', 'Train someone else'], xpRequired: 2000 },
    ],
  },
  {
    id: 'coding',
    name: 'Coding',
    category: 'Tech',
    description: 'Build websites, apps, and tools. High-income skill, zero degree required.',
    icon: 'Code',
    levels: [
      { level: 1, title: 'Web Foundations', tasks: ['Learn HTML structure', 'Style with CSS', 'Build a 1-page personal site'], xpRequired: 100 },
      { level: 2, title: 'JavaScript Basics', tasks: ['Variables, functions, loops', 'DOM manipulation', 'Build an interactive widget'], xpRequired: 250 },
      { level: 3, title: 'Build an App', tasks: ['Learn a framework (React/Vue)', 'Build a todo app', 'Deploy to Netlify/Vercel'], xpRequired: 500 },
      { level: 4, title: 'Backend & Data', tasks: ['Learn API basics', 'Set up a database', 'Build a full-stack CRUD app'], xpRequired: 1000 },
      { level: 5, title: 'Ship & Scale', tasks: ['Launch a real project', 'Get 100 users', 'Monetize it'], xpRequired: 2000 },
    ],
  },
  {
    id: 'content',
    name: 'Content Creation',
    category: 'Marketing',
    description: 'Grow an audience and monetize — the modern career path.',
    icon: 'Camera',
    levels: [
      { level: 1, title: 'Find Your Niche', tasks: ['Identify your topic', 'Study 5 creators in that niche', 'Write 10 post ideas'], xpRequired: 100 },
      { level: 2, title: 'Create & Post', tasks: ['Make 5 posts', 'Write engaging captions', 'Post consistently for 7 days'], xpRequired: 250 },
      { level: 3, title: 'Grow Followers', tasks: ['Reach 100 followers', 'Engage with 50 accounts daily', 'Collaborate with 1 creator'], xpRequired: 500 },
      { level: 4, title: 'Monetize', tasks: ['Apply for affiliate programs', 'Create a digital product', 'Make first £100'], xpRequired: 1000 },
      { level: 5, title: 'Scale Up', tasks: ['10k+ followers', '£1k/month revenue', 'Automate content workflow'], xpRequired: 2000 },
    ],
  },
  {
    id: 'trades',
    name: 'Trades',
    category: 'Skilled',
    description: 'Plumbing, electrical, construction — recession-proof, high-demand skills.',
    icon: 'Wrench',
    levels: [
      { level: 1, title: 'Tool Mastery', tasks: ['Identify 20 essential tools', 'Learn proper use for each', 'Build a basic toolkit'], xpRequired: 100 },
      { level: 2, title: 'Safety & Basics', tasks: ['Complete safety training', 'Learn building regulations', 'Practice 5 basic techniques'], xpRequired: 250 },
      { level: 3, title: 'Apprentice Work', tasks: ['Shadow a tradesperson', 'Complete 3 small projects', 'Get references'], xpRequired: 500 },
      { level: 4, title: 'Certification', tasks: ['Choose a trade path', 'Enroll in certification', 'Pass the exam'], xpRequired: 1000 },
      { level: 5, title: 'Go Solo', tasks: ['Register as self-employed', 'Get first 3 clients', '£2k+/month revenue'], xpRequired: 2000 },
    ],
  },
  {
    id: 'marketing',
    name: 'Digital Marketing',
    category: 'Business',
    description: 'SMMA-ready skills: ads, content, funnels. Your existing knowledge base.',
    icon: 'Megaphone',
    levels: [
      { level: 1, title: 'Platform Setup', tasks: ['Set up ad accounts (Meta/Google)', 'Install tracking pixels', 'Create a lead form'], xpRequired: 100 },
      { level: 2, title: 'Run First Ads', tasks: ['Create 3 ad creatives', 'Set up A/B test', 'Run £50 total ad spend'], xpRequired: 250 },
      { level: 3, title: 'Optimize & Scale', tasks: ['Reduce CPA by 30%', 'Scale budget to £200', 'Generate 20+ leads'], xpRequired: 500 },
      { level: 4, title: 'Full Funnel', tasks: ['Build a landing page', 'Set up email follow-ups', 'Create a retention system'], xpRequired: 1000 },
      { level: 5, title: 'Agency Ready', tasks: ['Manage 5-figure monthly spend', 'Get a paying client', 'White-label results'], xpRequired: 2000 },
    ],
  },
]
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/skillData.ts
git commit -m "feat: add skill trees seed data for 5 career paths"
```

---

### Task 4: Create useCoach Hook

**Files:**
- Create: `src/hooks/useCoach.ts`

**Interfaces:**
- Consumes: `useData` (water_logs, habit_logs, mood_logs, focus_sessions, workout_logs), `useAuth` (profile), additional data props (skillProgress, skillSessions, mealLogs, workSessions)
- Produces: `{ cards: CoachCard[] }` — ordered array of smart cards

- [ ] **Step 1: Create the useCoach hook with rules engine**

```ts
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from './useData'

export interface CoachCard {
  id: string
  type: 'alert' | 'streak' | 'meal' | 'work' | 'career' | 'skill' | 'weekly'
  priority: number
  title: string
  description: string
  icon: string
  color: string
  dismissable: boolean
}

export function useCoach(
  skillProgress?: any[],
  skillSessions?: any[],
  mealLogs?: any[],
  workSessions?: any[]
) {
  const { profile } = useAuth()
  const { data, todayWater, todayMood, todayFocus } = useData()

  const cards = useMemo<CoachCard[]>(() => {
    const list: CoachCard[] = []

    // 1. Sitting alert
    const todayWork = (workSessions || []).find(
      (w: any) => w.date === new Date().toISOString().split('T')[0]
    )
    if (todayWork && todayWork.total_minutes > 240 && todayWork.breaks_taken < 2) {
      list.push({
        id: 'sitting-alert', type: 'alert', priority: 1,
        title: 'Too much sitting!',
        description: `You've been sitting ${Math.round(todayWork.total_minutes / 60)}hrs with only ${todayWork.breaks_taken} breaks. Do the 5-min desk stretch routine now.`,
        icon: 'AlertTriangle', color: 'text-neon-pink', dismissable: false,
      })
    }

    // 2. Low water alert
    if (todayWater < 1000 && new Date().getHours() >= 14) {
      list.push({
        id: 'water-alert', type: 'alert',
        priority: todayWater < 500 ? 1 : 2,
        title: 'Drink more water',
        description: `Only ${todayWater}ml today. Try to reach 2000ml before bed.`,
        icon: 'Droplets', color: 'text-neon-cyan', dismissable: true,
      })
    }

    // 3. Streak saver
    const todayLogged = data.habit_logs.length > 0 || todayWater > 0 || !!todayMood
    if (!todayLogged && (profile?.streak || 0) >= 3) {
      list.push({
        id: 'streak-saver', type: 'streak', priority: 2,
        title: `${profile?.streak}-day streak at risk!`,
        description: 'Log a habit, mood, or water to keep your streak alive.',
        icon: 'Flame', color: 'text-neon-pink', dismissable: false,
      })
    }

    // 4. Low protein
    const todayMeals = (mealLogs || []).filter(
      (m: any) => m.date === new Date().toISOString().split('T')[0]
    )
    const totalProtein = todayMeals.reduce((s: number, m: any) => s + (m.protein_g || 0), 0)
    if (todayMeals.length > 0 && totalProtein < 40) {
      list.push({
        id: 'protein-low', type: 'meal', priority: 3,
        title: 'Protein goal behind',
        description: `Only ${totalProtein}g protein today. Add eggs, chicken, or a shake to your next meal.`,
        icon: 'UtensilsCrossed', color: 'text-neon-green', dismissable: true,
      })
    }

    // 5. Sedentary pattern
    const last3Work = (workSessions || []).slice(-3)
    if (last3Work.length >= 2) {
      const avg = last3Work.reduce((s: number, w: any) => s + (w.total_minutes || 0), 0) / last3Work.length
      if (avg > 360) {
        list.push({
          id: 'work-pattern', type: 'work', priority: 4,
          title: 'Sedentary pattern detected',
          description: `Average ${Math.round(avg / 60)}hrs sitting daily. Aim for a 2-min walk every hour.`,
          icon: 'Clock', color: 'text-neon-purple', dismissable: true,
        })
      }
    }

    // 6. Career tip
    if (skillProgress && skillProgress.length > 0) {
      const top = [...skillProgress].sort((a: any, b: any) => b.current_level - a.current_level)[0]
      if (top && top.current_level >= 2) {
        list.push({
          id: 'career-tip', type: 'career', priority: 5,
          title: 'Skill progress looking good',
          description: `You're at level ${top.current_level}. Keep going — mastery leads to opportunities.`,
          icon: 'TrendingUp', color: 'text-gold', dismissable: true,
        })
      }
    }

    // 7. Skill nudge
    const todaySessions = (skillSessions || []).filter(
      (s: any) => s.date === new Date().toISOString().split('T')[0]
    )
    if (skillProgress && skillProgress.length > 0 && todaySessions.length === 0) {
      list.push({
        id: 'skill-nudge', type: 'skill', priority: 6,
        title: 'Practice time',
        description: "You haven't practiced your skills today. Even 15 minutes makes a difference.",
        icon: 'Brain', color: 'text-neon-purple', dismissable: true,
      })
    }

    // 8. Weekly wrap (Sunday)
    if (new Date().getDay() === 0) {
      const weekWorkouts = data.workout_logs.filter((w: any) => {
        const d = new Date(w.date)
        return d >= new Date(Date.now() - 7 * 86400000)
      }).length
      list.push({
        id: 'weekly-wrap', type: 'weekly', priority: 7,
        title: 'Weekly wrap',
        description: `${weekWorkouts}/7 workouts. ${todayWater >= 2000 ? 'Good water' : 'Low water'}. ${todayFocus || 0}min focus. ${weekWorkouts >= 3 ? 'Solid week!' : 'Try to move more next week.'}`,
        icon: 'Calendar', color: 'text-neon-cyan', dismissable: true,
      })
    }

    return list.sort((a, b) => a.priority - b.priority).slice(0, 5)
  }, [profile, data, todayWater, todayMood, todayFocus, skillProgress, skillSessions, mealLogs, workSessions])

  return { cards }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCoach.ts
git commit -m "feat: add useCoach client-side rules engine"
```

---

### Task 5: Create useCareer Hook

**Files:**
- Create: `src/hooks/useCareer.ts`

**Interfaces:**
- Consumes: `supabase`, `useAuth`
- Produces: `{ skillProgress, skillSessions, incomeLogs, loading, weeklyIncome, totalIncome, startSkill, logSkillSession, logIncome, refresh }`

- [ ] **Step 1: Create the useCareer hook**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useCareer() {
  const { user, addXP } = useAuth()
  const [skillProgress, setSkillProgress] = useState<any[]>([])
  const [skillSessions, setSkillSessions] = useState<any[]>([])
  const [incomeLogs, setIncomeLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [progress, sessions, income] = await Promise.all([
      supabase.from('skill_progress').select('*').eq('user_id', user.id),
      supabase.from('skill_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('income_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
    ])
    setSkillProgress(progress.data || [])
    setSkillSessions(sessions.data || [])
    setIncomeLogs(income.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  async function startSkill(skillId: string) {
    if (!user) return
    await supabase.from('skill_progress').insert({ user_id: user.id, skill_id: skillId, current_level: 1, xp: 0 })
    await refresh()
  }

  async function logSkillSession(skillId: string, durationMin: number, notes?: string) {
    if (!user) return
    await supabase.from('skill_sessions').insert({ user_id: user.id, skill_id: skillId, date: today, duration_min: durationMin, notes })
    const existing = skillProgress.find(p => p.skill_id === skillId)
    if (existing) {
      const newXp = (existing.xp || 0) + durationMin
      await supabase.from('skill_progress').update({ xp: newXp }).eq('id', existing.id)
      addXP(Math.floor(durationMin / 5), 'skill_session')
    }
    await refresh()
  }

  async function logIncome(amount: number, source: string, notes?: string) {
    if (!user) return
    await supabase.from('income_logs').insert({ user_id: user.id, date: today, amount, source, notes })
    addXP(5, 'income_log')
    await refresh()
  }

  const weeklyIncome = incomeLogs
    .filter((l: any) => new Date(l.date) >= new Date(Date.now() - 7 * 86400000))
    .reduce((s: number, l: any) => s + (l.amount || 0), 0)

  const totalIncome = incomeLogs.reduce((s: number, l: any) => s + (l.amount || 0), 0)

  return { skillProgress, skillSessions, incomeLogs, loading, weeklyIncome, totalIncome, startSkill, logSkillSession, logIncome, refresh }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCareer.ts
git commit -m "feat: add useCareer hook for skill tracking and income logging"
```

---

### Task 6: Create useWork Hook

**Files:**
- Create: `src/hooks/useWork.ts`

**Interfaces:**
- Produces: `{ isActive, totalMinutes, breaksTaken, startWork, stopWork, logBreak, todaySession, loading }`

- [ ] **Step 1: Create the useWork hook**

```ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useWork() {
  const { user } = useAuth()
  const [todaySession, setTodaySession] = useState<any>(null)
  const [isActive, setIsActive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<any>(null)

  const today = new Date().toISOString().split('T')[0]

  const refresh = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()
    setTodaySession(data || null)
    if (data && !data.end_time) {
      setIsActive(true)
      const parts = data.start_time.split(':')
      const startMin = parseInt(parts[0]) * 60 + parseInt(parts[1])
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      setElapsed(Math.max(0, nowMin - startMin))
    }
  }, [user, today])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 60000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isActive])

  async function startWork() {
    if (!user) return
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    const { data } = await supabase.from('work_sessions').insert({
      user_id: user.id, date: today, start_time: ts, total_minutes: 0, breaks_taken: 0,
    }).select().single()
    setTodaySession(data)
    setIsActive(true)
    setElapsed(0)
  }

  async function stopWork() {
    if (!user || !todaySession) return
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    await supabase.from('work_sessions').update({ end_time: ts, total_minutes: elapsed }).eq('id', todaySession.id)
    setIsActive(false)
    await refresh()
  }

  async function logBreak(type = 'stretch') {
    if (!user || !todaySession) return
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    await supabase.from('break_logs').insert({ user_id: user.id, date: today, time: ts, duration_min: 2, break_type: type })
    await supabase.from('work_sessions').update({ breaks_taken: (todaySession.breaks_taken || 0) + 1 }).eq('id', todaySession.id)
    setTodaySession((prev: any) => prev ? { ...prev, breaks_taken: (prev.breaks_taken || 0) + 1 } : prev)
  }

  return { isActive, totalMinutes: elapsed, breaksTaken: todaySession?.breaks_taken || 0, startWork, stopWork, logBreak, todaySession, loading: !todaySession && elapsed === 0 }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWork.ts
git commit -m "feat: add useWork hook for sitting time tracking"
```

---

### Task 7: Update Navigation and App.tsx

**Files:**
- Modify: `src/components/ui/Navigation.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: New nav with 7 items; new routes for /body, /coach, /career

- [ ] **Step 1: Update Navigation.tsx with new nav items**

Replace the `NAV_ITEMS` array:

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare2, Heart, Sparkles, TrendingUp, Users, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Today' },
  { path: '/habits', icon: CheckSquare2, label: 'Habits' },
  { path: '/body', icon: Heart, label: 'Body' },
  { path: '/coach', icon: Sparkles, label: 'Coach' },
  { path: '/career', icon: TrendingUp, label: 'Career' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2 px-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                active ? 'text-neon-cyan scale-110' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Update App.tsx — add new imports and routes, remove old ones**

Add imports:
```tsx
import Body from './pages/Body'
import Coach from './pages/Coach'
import Career from './pages/Career'
```

Remove imports for Health and Gym (since they're no longer separate routes):
```tsx
// REMOVE these lines:
import Health from './pages/Health'
import Gym from './pages/Gym'
```

Add new routes:
```tsx
<Route path="/body" element={<ProtectedRoute><Body /></ProtectedRoute>} />
<Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
<Route path="/career" element={<ProtectedRoute><Career /></ProtectedRoute>} />
```

Remove old routes (content now inside Body page):
```tsx
{/* REMOVE these lines */}
<Route path="/health" element={<ProtectedRoute><Health /></ProtectedRoute>} />
<Route path="/gym" element={<ProtectedRoute><Gym /></ProtectedRoute>} />
```

- [ ] **Step 3: Verify routes compile**

Run: `npx tsc --noEmit`
Expected: Errors for Body/Coach/Career imports won't resolve until those files exist — that's expected. Proceed to Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Navigation.tsx src/App.tsx
git commit -m "feat: update navigation and routes for coach feature"
```

---

### Task 8: Build Body Page

**Files:**
- Create: `src/pages/Body.tsx`

**Interfaces:**
- Consumes: Existing Gym/Health logic, `useWork` hook, `supabase` for meal logging
- Produces: Unified page with 4 pill-toggled sub-tabs (Gym, Health, Meals, Work)

- [ ] **Step 1: Create Body.tsx — imports and state**

```tsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase'
import { XP, MUSCLE_GROUPS } from '../lib/constants'
import GlassCard from '../components/ui/GlassCard'
import WaterTracker from '../components/dashboard/WaterTracker'
import MoodSelector from '../components/dashboard/MoodSelector'
import BodyDiagram from '../components/3d/BodyDiagram'
import { useWork } from '../hooks/useWork'
import { motion } from 'framer-motion'
import {
  Dumbbell, Heart, UtensilsCrossed, Clock,
  Activity, Moon, TrendingUp, Play, Square, Coffee, X
} from 'lucide-react'

type BodyTab = 'gym' | 'health' | 'meals' | 'work'

const FOOD_PRESETS: Record<string, { calories: number; protein: number }> = {
  'Oatmeal': { calories: 300, protein: 10 },
  'Eggs (2)': { calories: 140, protein: 12 },
  'Toast with PB': { calories: 350, protein: 14 },
  'Chicken breast': { calories: 280, protein: 42 },
  'Rice (1 cup)': { calories: 200, protein: 4 },
  'Broccoli': { calories: 55, protein: 4 },
  'Protein shake': { calories: 150, protein: 25 },
  'Pasta': { calories: 350, protein: 12 },
  'Salad': { calories: 150, protein: 5 },
  'Greek yogurt': { calories: 130, protein: 22 },
  'Sandwich': { calories: 400, protein: 20 },
  'Nuts (handful)': { calories: 170, protein: 6 },
}
```

- [ ] **Step 2: Create Body.tsx — component shell with tabs**

```tsx
export default function Body() {
  const { user, addXP } = useAuth()
  const { data, today, todayWater, todayMood, refresh } = useData()
  const work = useWork()
  const [activeTab, setActiveTab] = useState<BodyTab>('gym')

  // Gym state
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [workoutDuration, setWorkoutDuration] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [gymView, setGymView] = useState<'log' | 'history'>('log')

  // Health state
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [steps, setSteps] = useState('')

  // Meal state
  const [mealLogs, setMealLogs] = useState<any[]>([])
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null)

  // Fetch meals
  useEffect(() => {
    if (user) {
      supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', today).order('created_at').then(({ data: meals }) => {
        if (meals) setMealLogs(meals)
      })
    }
  }, [user, today])

  // --- handlers ---
  async function handleMoodSelect(value: number) {
    if (todayMood) {
      await supabase.from('mood_logs').update({ mood_score: value }).eq('id', todayMood.id)
    } else {
      await supabase.from('mood_logs').insert({ user_id: user?.id, date: today, mood_score: value })
      addXP(XP.MOOD_LOG, 'mood_log')
    }
    await refresh()
  }

  async function handleWaterAdd(amount: number) {
    if (amount > 0) {
      await supabase.from('water_logs').insert({ user_id: user?.id, date: today, amount_ml: amount })
      if (todayWater + amount >= 2000) addXP(XP.WATER_GOAL, 'water_goal')
    } else {
      const last = data.water_logs[data.water_logs.length - 1]
      if (last) await supabase.from('water_logs').delete().eq('id', last.id)
    }
    await refresh()
  }

  async function logHealthMetric(type: string, value: number) {
    await supabase.from('health_logs').insert({ user_id: user?.id, date: today, type, value })
    addXP(3, `health_${type}`)
    await refresh()
  }

  function handleMuscleClick(muscle: string) {
    if (muscle === 'head') return
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    )
  }

  async function logWorkout() {
    if (selectedMuscles.length === 0) return
    await supabase.from('workout_logs').insert({
      user_id: user?.id, date: today,
      muscle_groups: selectedMuscles,
      duration: parseInt(workoutDuration) || null,
      notes: workoutNotes,
    })
    addXP(XP.WORKOUT_LOG + selectedMuscles.length * 5, 'workout')
    setSelectedMuscles([])
    setWorkoutDuration('')
    setWorkoutNotes('')
    await refresh()
  }

  async function logMeal(mealType: string, foodName: string) {
    const preset = FOOD_PRESETS[foodName]
    if (!preset) return
    await supabase.from('meal_logs').insert({
      user_id: user?.id, date: today, meal_type: mealType,
      food_name: foodName, calories: preset.calories, protein_g: preset.protein,
    })
    addXP(3, 'meal_log')
    const { data: meals } = await supabase
      .from('meal_logs').select('*').eq('user_id', user.id).eq('date', today).order('created_at')
    if (meals) setMealLogs(meals)
    setSelectedMeal(null)
  }

  async function deleteMeal(mealId: string) {
    await supabase.from('meal_logs').delete().eq('id', mealId)
    setMealLogs(prev => prev.filter(m => m.id !== mealId))
  }

  const { isActive, totalMinutes, breaksTaken, startWork, stopWork, logBreak } = work
  const muscleLabels = MUSCLE_GROUPS.reduce((acc, m) => ({ ...acc, [m.id]: m.label }), {} as Record<string, string>)
  const dailyCalories = mealLogs.reduce((s, m) => s + (m.calories || 0), 0)
  const dailyProtein = mealLogs.reduce((s, m) => s + (m.protein_g || 0), 0)

  const tabs: { id: BodyTab; label: string; icon: any }[] = [
    { id: 'gym', label: 'Gym', icon: Dumbbell },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
    { id: 'work', label: 'Work', icon: Clock },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      <h1 className="text-xl font-bold text-white">Body</h1>

      {/* Tab pills */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-neon-cyan/20 text-neon-cyan'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* === GYM TAB === */}
      {activeTab === 'gym' && (
        <>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 self-start">
            <button onClick={() => setGymView('log')}
              className={`px-3 py-1 rounded-md text-xs ${gymView === 'log' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40'}`}>Log</button>
            <button onClick={() => setGymView('history')}
              className={`px-3 py-1 rounded-md text-xs ${gymView === 'history' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40'}`}>History</button>
          </div>
          {gymView === 'log' ? (
            <>
              <GlassCard>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell size={16} className="text-neon-pink" />
                  <span className="text-xs text-white/40 uppercase tracking-wider">Tap muscles worked</span>
                </div>
                <BodyDiagram highlightedMuscles={selectedMuscles} onMuscleClick={handleMuscleClick} />
                {selectedMuscles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedMuscles.map(m => (
                      <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">{muscleLabels[m] || m}</span>
                    ))}
                  </div>
                )}
              </GlassCard>
              <GlassCard>
                <input type="number" value={workoutDuration} onChange={e => setWorkoutDuration(e.target.value)}
                  placeholder="Duration (minutes)"
                  className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
                <textarea value={workoutNotes} onChange={e => setWorkoutNotes(e.target.value)}
                  placeholder="Notes (sets, reps, weights...)"
                  className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50 resize-none h-16" />
                <button onClick={logWorkout} disabled={selectedMuscles.length === 0}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-neon-pink/20 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/30 disabled:opacity-30 disabled:cursor-not-allowed">
                  Log Workout {selectedMuscles.length > 0 && `(${selectedMuscles.length} muscles)`}
                </button>
              </GlassCard>
            </>
          ) : (
            <div className="space-y-2">
              {data.workout_logs.length === 0 ? (
                <GlassCard><p className="text-white/40 text-sm text-center py-4">No workouts logged yet.</p></GlassCard>
              ) : data.workout_logs.map((w: any) => (
                <GlassCard key={w.id}>
                  <div className="text-sm text-white font-medium">
                    {new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(w.muscle_groups || []).map((m: string) => (
                      <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/10 text-neon-pink border border-neon-pink/20">{muscleLabels[m] || m}</span>
                    ))}
                  </div>
                  {w.duration && <div className="text-xs text-white/40 mt-1">{w.duration} min</div>}
                  {w.notes && <p className="text-xs text-white/30 mt-1">{w.notes}</p>}
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* === HEALTH TAB === */}
      {activeTab === 'health' && (
        <>
          <GlassCard><WaterTracker currentMl={todayWater} onAdd={handleWaterAdd} /></GlassCard>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Heart size={16} className="text-neon-pink" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Mood</span>
            </div>
            <MoodSelector currentMood={todayMood} onSelect={handleMoodSelect} />
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-neon-green" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Steps</span>
            </div>
            <div className="flex gap-2">
              <input type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="Steps today"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
              <button onClick={() => steps && logHealthMetric('steps', parseInt(steps))}
                className="px-4 py-2 rounded-lg bg-neon-green/10 text-neon-green text-sm border border-neon-green/20 hover:bg-neon-green/20">Log</button>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Moon size={16} className="text-neon-cyan" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Sleep</span>
            </div>
            <div className="flex gap-2">
              <input type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} placeholder="Hours slept"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
              <button onClick={() => sleepHours && logHealthMetric('sleep', parseFloat(sleepHours))}
                className="px-4 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan text-sm border border-neon-cyan/20 hover:bg-neon-cyan/20">Log</button>
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-neon-purple" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Weight</span>
            </div>
            <div className="flex gap-2">
              <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight (kg)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
              <button onClick={() => weight && logHealthMetric('weight', parseFloat(weight))}
                className="px-4 py-2 rounded-lg bg-neon-purple/10 text-neon-purple text-sm border border-neon-purple/20 hover:bg-neon-purple/20">Log</button>
            </div>
          </GlassCard>
        </>
      )}

      {/* === MEALS TAB === */}
      {activeTab === 'meals' && (
        <>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <UtensilsCrossed size={16} className="text-neon-green" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Today's Nutrition</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{dailyCalories}</div>
                <div className="text-[10px] text-white/40">calories</div>
                <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-neon-green rounded-full" style={{ width: `${Math.min((dailyCalories / 2200) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neon-cyan">{dailyProtein}g</div>
                <div className="text-[10px] text-white/40">protein</div>
                <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${Math.min((dailyProtein / 130) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-4 gap-2">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(mealType => (
              <button key={mealType} onClick={() => setSelectedMeal(selectedMeal === mealType ? null : mealType)}
                className={`p-2 rounded-lg text-center text-xs font-medium transition-all capitalize ${
                  selectedMeal === mealType ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                }`}>
                <div>{mealType === 'breakfast' ? '🍳' : mealType === 'lunch' ? '🥗' : mealType === 'dinner' ? '🍝' : '🥨'}</div>
                <div className="mt-0.5">{mealType}</div>
              </button>
            ))}
          </div>

          {selectedMeal && (
            <GlassCard>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40 uppercase tracking-wider font-medium capitalize">{selectedMeal}</span>
                <button onClick={() => setSelectedMeal(null)} className="text-white/20 hover:text-white/40"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {Object.entries(FOOD_PRESETS).map(([name, info]) => (
                  <button key={name} onClick={() => logMeal(selectedMeal, name)}
                    className="text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5">
                    <div className="text-xs text-white font-medium">{name}</div>
                    <div className="text-[10px] text-white/40">{info.calories} cal · {info.protein}g protein</div>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {mealLogs.length > 0 ? (
            <GlassCard>
              <div className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Today's Meals</div>
              <div className="space-y-2">
                {mealLogs.map((meal: any) => (
                  <div key={meal.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div>
                      <div className="text-xs text-white/60 capitalize">{meal.meal_type}</div>
                      <div className="text-sm text-white">{meal.food_name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-white">{meal.calories} cal</div>
                        <div className="text-[10px] text-white/40">{meal.protein_g}g protein</div>
                      </div>
                      <button onClick={() => deleteMeal(meal.id)} className="text-white/20 hover:text-red-400"><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ) : selectedMeal === null && (
            <GlassCard><p className="text-white/40 text-sm text-center py-4">Tap a meal type above to log what you ate.</p></GlassCard>
          )}
        </>
      )}

      {/* === WORK TAB === */}
      {activeTab === 'work' && (
        <>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-neon-purple" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Work Session</span>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </div>
              <div className="text-xs text-white/40 mb-3">sitting today</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-neon-purple rounded-full" style={{ width: `${Math.min((totalMinutes / 480) * 100, 100)}%` }} />
              </div>
              <div className="flex justify-center gap-3">
                {!isActive ? (
                  <button onClick={startWork}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-green/10 text-neon-green text-sm border border-neon-green/20 hover:bg-neon-green/20">
                    <Play size={14} /> Start Work
                  </button>
                ) : (
                  <button onClick={stopWork}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-400/10 text-red-400 text-sm border border-red-400/20 hover:bg-red-400/20">
                    <Square size={14} /> Stop
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Coffee size={16} className="text-neon-cyan" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Breaks: {breaksTaken}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['stretch', 'walk', 'water'] as const).map(type => (
                <button key={type} onClick={() => logBreak(type)} disabled={!isActive}
                  className="px-3 py-1.5 rounded-lg text-xs bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 disabled:opacity-30 disabled:cursor-not-allowed capitalize">
                  {type} Break
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-neon-pink" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Desk Exercises</span>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Neck Rolls', duration: '30s', desc: 'Slowly roll your neck in circles' },
                { name: 'Shoulder Shrugs', duration: '30s', desc: 'Lift shoulders to ears, hold, release' },
                { name: 'Seated Twists', duration: '45s', desc: 'Twist torso left and right' },
                { name: 'Leg Raises', duration: '30s', desc: 'Sit tall, raise each leg 10 times' },
                { name: 'Wrist Stretches', duration: '30s', desc: 'Extend and flex each wrist' },
              ].map(ex => (
                <div key={ex.name} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                  <div>
                    <div className="text-xs text-white font-medium">{ex.name}</div>
                    <div className="text-[10px] text-white/40">{ex.desc}</div>
                  </div>
                  <span className="text-[10px] text-neon-cyan">{ex.duration}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Body.tsx
git commit -m "feat: add unified Body page with Gym/Health/Meals/Work sub-tabs"
```

---

### Task 9: Build Coach Page

**Files:**
- Create: `src/pages/Coach.tsx`

**Interfaces:**
- Consumes: `useCoach`, `useCareer`, data hooks
- Produces: Coach feed page with smart card feed + quick actions

- [ ] **Step 1: Create Coach.tsx**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../hooks/useData'
import { useCoach } from '../hooks/useCoach'
import { useCareer } from '../hooks/useCareer'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/ui/GlassCard'
import { Sparkles, AlertTriangle, Flame, UtensilsCrossed, Clock, TrendingUp, Brain, Calendar, X, RefreshCw } from 'lucide-react'

export default function Coach() {
  const navigate = useNavigate()
  const { data } = useData()
  const career = useCareer()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const { cards } = useCoach(career.skillProgress, career.skillSessions, [], [])
  const visible = cards.filter(c => !dismissed.has(c.id))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-neon-cyan" size={20} /> Coach
          </h1>
          <p className="text-xs text-white/40">Personalised insights from your data</p>
        </div>
        <button onClick={() => { setDismissed(new Set()) }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <RefreshCw size={16} className="text-white/40" />
        </button>
      </div>

      {visible.length === 0 ? (
        <GlassCard className="text-center py-8">
          <Sparkles size={32} className="text-neon-cyan/40 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No insights right now.</p>
          <p className="text-white/20 text-xs mt-1">Log more data throughout the day and check back.</p>
        </GlassCard>
      ) : (
        <AnimatePresence mode="popLayout">
          {visible.map((card, i) => {
            const Icon = card.type === 'meal' ? UtensilsCrossed :
              card.type === 'alert' ? AlertTriangle :
              card.type === 'streak' ? Flame :
              card.type === 'work' ? Clock :
              card.type === 'career' ? TrendingUp :
              card.type === 'skill' ? Brain : Calendar
            return (
              <motion.div key={card.id} layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}>
                <GlassCard className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${
                    card.priority <= 2 ? 'bg-neon-pink' : card.priority <= 4 ? 'bg-gold' : 'bg-neon-cyan'
                  }`} />
                  {card.dismissable && (
                    <button onClick={() => setDismissed(p => new Set([...p, card.id]))}
                      className="absolute top-3 right-3 text-white/20 hover:text-white/40"><X size={14} /></button>
                  )}
                  <div className="flex items-start gap-3 pl-3">
                    <div className={`mt-0.5 ${card.color}`}><Icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white mb-0.5">{card.title}</h3>
                      <p className="text-xs text-white/50 leading-relaxed">{card.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}

      <GlassCard>
        <div className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/body')}
            className="px-3 py-1.5 rounded-lg text-xs bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20">Log a Meal</button>
          <button onClick={() => navigate('/body')}
            className="px-3 py-1.5 rounded-lg text-xs bg-neon-pink/10 text-neon-pink border border-neon-pink/20 hover:bg-neon-pink/20">Log Workout</button>
          <button onClick={() => navigate('/career')}
            className="px-3 py-1.5 rounded-lg text-xs bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20">Practice Skills</button>
          <button onClick={() => navigate('/analytics')}
            className="px-3 py-1.5 rounded-lg text-xs bg-neon-purple/10 text-neon-purple border border-neon-purple/20 hover:bg-neon-purple/20">View Stats</button>
        </div>
      </GlassCard>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Coach.tsx
git commit -m "feat: add Coach page with smart card feed from rules engine"
```

---

### Task 10: Build Career Page

**Files:**
- Create: `src/pages/Career.tsx`

**Interfaces:**
- Consumes: `useCareer` hook, `SKILL_TREES` data, `supabase`, `useAuth`
- Produces: Skill tree explorer with level progression, income tracker, learning timer

- [ ] **Step 1: Create Career.tsx**

```tsx
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCareer } from '../hooks/useCareer'
import { SKILL_TREES } from '../lib/skillData'
import GlassCard from '../components/ui/GlassCard'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, BookOpen, DollarSign, Clock, Play, Square, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react'

export default function Career() {
  const { addXP } = useAuth()
  const { skillProgress, skillSessions, incomeLogs, weeklyIncome, totalIncome, startSkill, logSkillSession, logIncome } = useCareer()
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [learningSkillId, setLearningSkillId] = useState<string | null>(null)
  const [learningTimer, setLearningTimer] = useState(0)
  const [learningActive, setLearningActive] = useState(false)
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeSource, setIncomeSource] = useState('')
  const [incomeNotes, setIncomeNotes] = useState('')

  function startLearning(skillId: string) {
    setLearningSkillId(skillId)
    setLearningTimer(0)
    setLearningActive(true)
    const interval = setInterval(() => setLearningTimer(t => t + 1), 1000)
    ;(window as any).__learningInterval = interval
  }

  function stopLearning() {
    setLearningActive(false)
    if ((window as any).__learningInterval) {
      clearInterval((window as any).__learningInterval)
      delete (window as any).__learningInterval
    }
    if (learningTimer >= 30 && learningSkillId) {
      const minutes = Math.round(learningTimer / 60)
      logSkillSession(learningSkillId, Math.max(1, minutes))
      addXP(Math.floor(minutes / 5), 'skill_session')
    }
  }

  async function handleLogIncome() {
    if (!incomeAmount) return
    await logIncome(parseFloat(incomeAmount), incomeSource || 'General', incomeNotes || undefined)
    setIncomeAmount(''); setIncomeSource(''); setIncomeNotes('')
  }

  const getProgress = (id: string) => skillProgress.find(p => p.skill_id === id)
  const getSessions = (id: string) => skillSessions.filter(s => s.skill_id === id).length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <TrendingUp className="text-gold" size={20} /> Career
      </h1>

      {/* Income */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-neon-green" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Income</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-green">£{weeklyIncome.toFixed(2)}</div>
            <div className="text-[10px] text-white/40">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">£{totalIncome.toFixed(2)}</div>
            <div className="text-[10px] text-white/40">All Time</div>
          </div>
        </div>
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex gap-2">
            <input type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)}
              placeholder="Amount" className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-neon-green/50" />
            <input type="text" value={incomeSource} onChange={e => setIncomeSource(e.target.value)}
              placeholder="Source" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-neon-green/50" />
            <button onClick={handleLogIncome}
              className="px-3 py-1.5 rounded-lg text-xs bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 whitespace-nowrap">
              <Plus size={14} className="inline" /> Add
            </button>
          </div>
          <input type="text" value={incomeNotes} onChange={e => setIncomeNotes(e.target.value)}
            placeholder="Notes (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-neon-green/50" />
        </div>
      </GlassCard>

      {/* Learning Timer */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-neon-cyan" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
            {learningActive ? `Learning: ${Math.floor(learningTimer / 60)}:${String(learningTimer % 60).padStart(2, '0')}` : 'Learning Timer'}
          </span>
        </div>
        {learningActive ? (
          <div className="text-center">
            <div className="text-3xl font-bold text-neon-cyan mb-2">
              {Math.floor(learningTimer / 60)}:{String(learningTimer % 60).padStart(2, '0')}
            </div>
            <button onClick={stopLearning}
              className="px-4 py-2 rounded-lg text-xs bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20">
              <Square size={14} className="inline mr-1" /> Stop
            </button>
          </div>
        ) : (
          <p className="text-xs text-white/40 text-center py-2">Expand a skill and press Play to start learning.</p>
        )}
      </GlassCard>

      {/* Skill Trees */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-gold" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Skill Paths</span>
        </div>
        {SKILL_TREES.map(skill => {
          const progress = getProgress(skill.id)
          const currentLevel = progress?.current_level || 0
          const isLearning = learningActive && learningSkillId === skill.id
          const iconMap: Record<string, string> = { PhoneCall: '📞', Code: '💻', Camera: '📸', Wrench: '🔧', Megaphone: '📢' }

          return (
            <GlassCard key={skill.id}>
              <button onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={currentLevel >= 5 ? 'text-gold' : 'text-white/40'}>{iconMap[skill.icon] || '📚'}</div>
                  <div className="text-left">
                    <div className="text-sm text-white font-medium">{skill.name}</div>
                    <div className="text-[10px] text-white/40">{skill.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentLevel > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">Lv.{currentLevel}</span>
                  )}
                  {!progress ? (
                    <button onClick={e => { e.stopPropagation(); startSkill(skill.id) }}
                      className="text-[10px] px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20">Start</button>
                  ) : expandedSkill === skill.id ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
                </div>
              </button>
              {currentLevel > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${(currentLevel / 5) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-white/30">Level {currentLevel}/5</span>
                    <span className="text-[9px] text-white/30">{getSessions(skill.id)} sessions</span>
                  </div>
                </div>
              )}
              <AnimatePresence>
                {expandedSkill === skill.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 space-y-2 pt-3 border-t border-white/5">
                      {skill.levels.map(lvl => {
                        const unlocked = currentLevel >= lvl.level
                        const current = currentLevel === lvl.level - 1
                        return (
                          <div key={lvl.level} className={`p-2 rounded-lg ${unlocked ? 'bg-gold/5 border border-gold/10' : current ? 'bg-neon-cyan/5 border border-neon-cyan/10' : 'bg-white/5 border border-white/5'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-medium ${unlocked ? 'text-gold' : current ? 'text-neon-cyan' : 'text-white/30'}`}>
                                Level {lvl.level}: {lvl.title}
                              </span>
                              {unlocked && <Check size={12} className="text-neon-green" />}
                            </div>
                            <ul className="space-y-0.5">
                              {lvl.tasks.map((task, i) => (
                                <li key={i} className="text-[10px] text-white/30 flex items-start gap-1"><span>•</span>{task}</li>
                              ))}
                            </ul>
                            {current && !isLearning && (
                              <button onClick={() => startLearning(skill.id)}
                                className="mt-2 w-full py-1.5 rounded-lg text-[10px] bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20">
                                <Play size={10} className="inline mr-1" /> Start Learning
                              </button>
                            )}
                            {isLearning && <div className="mt-2 text-[10px] text-neon-cyan text-center">Learning in progress...</div>}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          )
        })}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Career.tsx
git commit -m "feat: add Career page with skill trees, income tracker, learning timer"
```

---

### Task 11: Add Coach Says Card to Dashboard + XP Constants

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/lib/constants.ts`

**Interfaces:**
- Produces: Dashboard with Coach Says card + new XP constants

- [ ] **Step 1: Add new XP constants to constants.ts**

In the `XP` object, add:
```ts
MEAL_LOG: 3,
SKILL_SESSION: 5,
INCOME_LOG: 5,
```

- [ ] **Step 2: Add "Coach Says" card to Dashboard.tsx**

Add imports at top:
```tsx
import { useNavigate } from 'react-router-dom'
```

Inside the Dashboard function, add:
```tsx
const navigate = useNavigate()
```

After the Quick Stats grid (`</div>` closing the 3-column grid), add:
```tsx
      {/* Coach Says */}
      <GlassCard onClick={() => navigate('/coach')}
        className="relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-neon-cyan/5 to-transparent pointer-events-none" />
        <div className="flex items-start gap-3 relative z-10">
          <Sparkles size={18} className="text-neon-cyan mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Coach Says</span>
            <p className="text-sm text-white/80 mt-1">
              {todayWater < 1000
                ? "You're low on water today. Try to reach 2L before bed."
                : activeHabits === 0
                  ? 'No habits logged yet. Complete one to keep your streak.'
                  : todayFocus === 0
                    ? "Haven't focused today. Try a 25-min pomodoro."
                    : 'Good progress today! Check Coach for personalised insights.'}
            </p>
          </div>
        </div>
      </GlassCard>
```

- [ ] **Step 3: Verify the file compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If `Sparkles` is already imported in Dashboard.tsx, the import line is already there.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/lib/constants.ts
git commit -m "feat: add Coach Says card to dashboard and new XP constants"
```

---

### Task 12: Remove Old Pages and Final Cleanup

**Files:**
- Delete: `src/pages/Gym.tsx`
- Delete: `src/pages/Health.tsx`

**Interfaces:**
- Produces: Clean repository with no orphaned files (content now lives in Body.tsx)

- [ ] **Step 1: Remove old pages**

```bash
git rm src/pages/Gym.tsx src/pages/Health.tsx
```

- [ ] **Step 2: Verify the full app builds**

```bash
npm run build
```
Expected: No errors. All old imports replaced with new Body/Coach/Career pages.

- [ ] **Step 3: Final commit**

```bash
git commit -m "chore: remove old Gym/Health pages, content now in Body page"
```
