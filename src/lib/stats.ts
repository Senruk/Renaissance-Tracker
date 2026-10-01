// ------------------------------------------------------------------
// Workout statistics derived from workout_logs.
//
// Everything here is computed from rows we already store, so there is no
// new persistence and no schema change. Rows logged before the exercises
// column existed still count towards sessions and duration-based volume,
// they just have no sets/reps or per-exercise records.
// ------------------------------------------------------------------

import { MUSCLE_IDS, MUSCLE_LABELS, type MuscleId } from './exercises'
import { normaliseGroups, parseExercisesColumn, exerciseVolume } from './recovery'

export interface MuscleVolume {
  muscle: MuscleId
  label: string
  volume: number
  sets: number
  sessions: number
}

export interface ExerciseStat {
  name: string
  sessions: number
  volume: number
  sets: number
  /** Heaviest single set recorded, or null when bodyweight-only. */
  bestSet: number | null
}

export interface GymStats {
  sessions: number
  totalVolume: number
  totalSets: number
  totalReps: number
  avgDuration: number
  lastSession: string | null
  /** Consecutive days trained, counting back from today or yesterday. */
  currentStreak: number
  thisWeekSessions: number
  thisWeekVolume: number
  perMuscle: MuscleVolume[]
  topExercises: ExerciseStat[]
  personalRecords: ExerciseStat[]
}

const EMPTY: GymStats = {
  sessions: 0, totalVolume: 0, totalSets: 0, totalReps: 0, avgDuration: 0,
  lastSession: null, currentStreak: 0, thisWeekSessions: 0, thisWeekVolume: 0,
  perMuscle: [], topExercises: [], personalRecords: [],
}

export function computeStats(logs: any[], now: Date = new Date()): GymStats {
  if (!Array.isArray(logs) || logs.length === 0) return EMPTY

  const muscle = new Map<MuscleId, { volume: number; sets: number; days: Set<string> }>()
  const ex = new Map<string, ExerciseStat & { days: Set<string> }>()
  const days = new Set<string>()

  let totalVolume = 0
  let totalSets = 0
  let totalReps = 0
  let durationSum = 0
  let durationCount = 0
  let lastSession: string | null = null

  for (const log of logs) {
    const date = String(log?.date ?? '')
    if (!date) continue
    days.add(dayKey(date))
    if (!lastSession || date > lastSession) lastSession = date

    const volume = rowVolume(log)
    totalVolume += volume

    if (typeof log?.duration === 'number' && log.duration > 0) {
      durationSum += log.duration
      durationCount += 1
    }

    const exercises = parseExercisesColumn(log?.exercises)
    for (const e of exercises) {
      totalSets += e.sets ?? 0
      totalReps += (e.sets ?? 0) * (e.reps ?? 0)
    }

    // Attribute the row's volume to the groups it was logged against.
    const setsForRow = exercises.length
      ? exercises.reduce((s, e) => s + (e.sets ?? 0), 0)
      : 3
    for (const id of normaliseGroups(log?.muscle_groups)) {
      const cur = muscle.get(id) ?? { volume: 0, sets: 0, days: new Set<string>() }
      cur.volume += volume
      cur.sets += setsForRow
      cur.days.add(dayKey(date))
      muscle.set(id, cur)
    }

    for (const e of exercises) {
      const key = e.name.toLowerCase().trim()
      if (!key) continue
      const cur = ex.get(key) ?? {
        name: e.name, sessions: 0, volume: 0, sets: 0, bestSet: null, days: new Set<string>(),
      }
      cur.sessions += 1
      cur.volume += exerciseVolume(e)
      cur.sets += e.sets ?? 0
      if (typeof e.weight === 'number' && e.weight > 0) {
        cur.bestSet = Math.max(cur.bestSet ?? 0, e.weight)
      }
      cur.days.add(dayKey(date))
      ex.set(key, cur)
    }
  }

  const today = localDayKey(now)
  const weekStart = startOfWeek(today)

  let thisWeekSessions = 0
  let thisWeekVolume = 0
  for (const log of logs) {
    const date = String(log?.date ?? '')
    if (!date || dayKey(date) < weekStart) continue
    thisWeekSessions += 1
    thisWeekVolume += rowVolume(log)
  }

  // Consecutive trained days ending today, or yesterday if today is a rest day.
  let currentStreak = 0
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1)
  for (;;) {
    if (!days.has(localDayKey(cursor))) break
    currentStreak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const perMuscle: MuscleVolume[] = MUSCLE_IDS.map((id) => {
    const cur = muscle.get(id)
    return {
      muscle: id,
      label: MUSCLE_LABELS[id],
      volume: cur?.volume ?? 0,
      sets: cur?.sets ?? 0,
      sessions: cur?.days.size ?? 0,
    }
  }).sort((a, b) => b.volume - a.volume)

  const allExercises: ExerciseStat[] = Array.from(ex.values()).map(({ days: _d, ...rest }) => rest)
  const topExercises = [...allExercises].sort((a, b) => b.volume - a.volume).slice(0, 8)
  const personalRecords = allExercises
    .filter((e) => e.bestSet !== null)
    .sort((a, b) => (b.bestSet ?? 0) - (a.bestSet ?? 0))
    .slice(0, 5)

  return {
    // Count of logged workouts, so this lines up with the History tab.
    sessions: logs.filter((l) => l?.date).length,
    totalVolume: Math.round(totalVolume),
    totalSets,
    totalReps,
    avgDuration: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    lastSession,
    currentStreak,
    thisWeekSessions,
    thisWeekVolume: Math.round(thisWeekVolume),
    perMuscle,
    topExercises,
    personalRecords,
  }
}

/** Longest gap between trained days, useful for spotting plateaus. */
export function longestGapDays(logs: any[]): number {
  const days = Array.from(new Set(
    (logs ?? []).map((l) => String(l?.date ?? '')).filter(Boolean).map(dayKey),
  )).sort()
  let worst = 0
  for (let i = 1; i < days.length; i += 1) {
    worst = Math.max(worst, daysBetween(days[i - 1], days[i]))
  }
  return worst
}


/** Volume for a row, preferring real load and falling back to duration. */
function rowVolume(log: any): number {
  const exercises = parseExercisesColumn(log?.exercises)
  const fromExercises = exercises.reduce((sum, e) => sum + exerciseVolume(e), 0)
  if (fromExercises > 0) return fromExercises
  const duration = typeof log?.duration === 'number' ? log.duration : 0
  return duration * 40
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Day key in the viewer's own timezone.
 *
 * Do not use toISOString() here: it converts to UTC, so a local midnight
 * becomes the previous day for anyone east of Greenwich. That silently
 * breaks streaks and week boundaries.
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()
  return Math.round(ms / 864e5)
}

/** Monday-based start of the week containing the day key `key`. */
function startOfWeek(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - dow)
  return localDayKey(date)
}
