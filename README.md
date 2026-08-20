# Renaissance — Daily Life OS

> A production-grade personal productivity suite built with React 19, TypeScript, and Supabase. Features habit tracking, health monitoring, gym logging, time-blocking, a leads CRM, and analytics — all with real-time sync, offline-first architecture, and pgvector-powered semantic search.

**Live:** [daily-life-57t.pages.dev](https://daily-life-57t.pages.dev)  
**Stack:** React 19 · TypeScript · Vite · Supabase (PostgreSQL + pgvector) · Tailwind CSS · Framer Motion · Three.js · Cloudflare Pages

---

## Screenshots

| Dashboard | Habits & Health | Leads CRM | Analytics |
|-----------|----------------|-----------|-----------|
| ![Dashboard](screenshots/dashboard.png) | ![Habits](screenshots/habits.png) | ![Leads](screenshots/leads.png) | ![Analytics](screenshots/analytics.png) |

---

## Features

### Core Modules
- **Habits** — Streak tracking, XP system, water intake, mood logging, custom categories
- **Health** — Sleep, weight, HRV, energy levels, custom metrics with charts (Recharts)
- **Gym** — Workout logging, muscle group tracking, volume analytics, PR tracking
- **Time** — Time-blocking scheduler, focus sessions, daily/weekly views
- **Leads CRM** — Full call pipeline (to-call/today/history), outcome logging, notes, status tracking
- **Analytics** — Cross-module insights, streak heatmaps, volume trends, correlation views

### Technical Highlights
- **Local-first, cloud-capable** — Works offline via localStorage; auto-syncs to Supabase/D1 when deployed
- **Real-time sync** — Supabase Realtime for multi-device collaboration
- **pgvector RAG** — Semantic search over notes/journals using PostgreSQL pgvector
- **3D backgrounds** — React Three Fiber particle system (cosmetic, performant)
- **PWA** — Service worker, installable, offline-first
- **Type-safe** — End-to-end TypeScript with generated Supabase types

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      renaissance-public                     │
├─────────────────────────────────────────────────────────────┤
│  src/                                                       │
│  ├── components/          # Reusable UI (GlassCard, Nav, 3D) │
│  ├── contexts/            # AuthContext (Supabase Auth)     │
│  ├── hooks/               # Custom hooks (useSupabase, etc) │
│  ├── lib/                 # Supabase client (cloud/local)    │
│  ├── pages/               # Route pages (Dashboard, Leads..) │
│  └── styles/              # Tailwind + custom CSS           │
├── functions/              # Cloudflare Pages Functions (D1)  │
├── supabase-schema.sql     # Full schema + RLS policies      │
└── vite.config.ts          # Vite + Tailwind + React config  │
```

### Data Layer (`src/lib/supabase.ts`)
Dual-engine Supabase client:
- **Cloud engine** → Cloudflare Pages Functions → D1 (production)
- **Local engine** → localStorage (development/offline)
- Automatic fallback with engine detection

---

## Getting Started

### Prerequisites
- Node 18+
- Supabase account (for cloud sync) or run fully local

### Local Development
```bash
cd renaissance-public
npm install
npm run dev
# Opens http://localhost:5173
```

### Supabase Setup (Optional — for cloud sync)
1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in SQL Editor
3. Copy `.env.example` → `.env` and add keys:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
4. Enable Realtime for `habits`, `health_logs`, `workout_logs`, `leads`, `call_logs`

### Deploy to Cloudflare Pages
```bash
npm run build
# Push to GitHub → Connect to Cloudflare Pages
# Build command: npm run build
# Output directory: dist
# Add environment variables in Cloudflare dashboard
```

---

## Database Schema (Key Tables)

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profile, settings | ✅ |
| `habits` | Habit definitions, streaks, XP | ✅ |
| `habit_logs` | Daily completions, notes | ✅ |
| `health_logs` | Sleep, weight, HRV, energy | ✅ |
| `workout_logs` | Exercises, sets, reps, weight | ✅ |
| `time_blocks` | Scheduled blocks, focus sessions | ✅ |
| `leads` | Business leads, contact info, status | ✅ |
| `call_logs` | Call outcomes, notes, timestamps | ✅ |

Full schema in `supabase-schema.sql` with indexes, triggers, and RLS policies.

---

## Project Structure (Key Files)

```
src/
├── lib/
│   ├── supabase.ts          # Dual-engine client (cloud/local)
│   └── db-types.ts          # Generated Supabase types
├── components/
│   ├── ui/                  # GlassCard, Navigation
│   ├── 3d/                  # ParticleBackground (Three.js)
│   ├── dashboard/           # MoodSelector, StreakCounter, WaterTracker, XPBar
│   └── habits/              # Habit-specific components
├── pages/
│   ├── Dashboard.tsx        # Overview, quick actions
│   ├── Habits.tsx           # Habit management, logging
│   ├── Health.tsx           # Health metrics, charts
│   ├── Gym.tsx              # Workout logging, volume
│   ├── Time.tsx             # Time-blocking scheduler
│   ├── Leads.tsx            # CRM: to-call / history / all
│   ├── Analytics.tsx        # Cross-module insights
│   └── Settings.tsx         # Account, sync, preferences
└── contexts/
    └── AuthContext.tsx      # Supabase Auth wrapper
```

---

## Tech Decisions & Rationale

| Decision | Why |
|----------|-----|
| **React 19 + Vite** | Fast HMR, modern React features, small bundle |
| **Supabase + pgvector** | PostgreSQL + vector search + auth + realtime in one |
| **Tailwind CSS** | Rapid UI, consistent design system, small production CSS |
| **Framer Motion** | Declarative animations, layout transitions, AnimatePresence |
| **Cloudflare Pages + D1** | Edge deployment, zero-config, SQLite-compatible |
| **localStorage fallback** | Zero-config local dev, works offline, portable data |

---

## Roadmap

- [ ] **RAG chat** — Query habits/health via natural language (pgvector + LLM)
- [ ] **Export/Import** — JSON/CSV backup, Supabase ↔ local migration
- [ ] **Widgets** — Home screen widgets for iOS/Android (PWA)
- [ ] **Team workspaces** — Shared habits, accountability groups
- [ ] **AI coaching** — Personalized suggestions from pattern analysis

---

## License

MIT — Built as a portfolio project demonstrating full-stack TypeScript, Supabase, and modern React patterns.

---

## Contact

**Senruk Karawita**  
- GitHub: [@Senruk](https://github.com/Senruk)  
- LinkedIn: [linkedin.com/in/senrukkarawita](https://linkedin.com/in/senrukkarawita)  
- Email: senrukkarawita.123@gmail.com