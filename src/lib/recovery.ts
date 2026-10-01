// ------------------------------------------------------------------
// Muscle recovery engine.
//
// Pure and deterministic — no AI. For each muscle group it works out when
// it was last trained, how hard, and therefore when it's worth hitting again.
//
// Load scaling: a heavy session needs longer than a light one, so the base
// window is multiplied by up to 1.5x based on that session's volume.
// ------------------------------------------------------------------

import { RECOVERY_WINDOWS, MUSCLE_IDS, MUSCLE_LABELS, type MuscleId } from './exercises'

export type RecoveryStatus = 'ready' | 'recovering' | 'resting' | 'untrained'

export interface MuscleRecovery {
  muscle: MuscleId
  label: string
  status: RecoveryStatus
  /** Hours since the group was last trained, or null if never. */
  hoursSince: number | null
  /** Hours needed before it's fully recovered, after load scaling. */
  hoursRequired: number
  /** 0 → just trained, 1 → fully recovered. */
  progress: number
  lastTrained: string | null
  lastSets: number
  lastVolume: number
}

export interface LoggedExercise {
  name: string
  sets: number | null
  reps: number | null
  weight: number | null
}

/** A volume figure the scale can normalise against. Roughly a hard session. */
const HEAVY_SESSION = 8000

/**
 * The `exercises` column arrives as a JSON string from D1 and as a real
 * array from Supabase. Normalise both, and tolerate old rows with no column.
 */
export function parseExercisesColumn(raw: unknown): LoggedExercise[] {
  if (!raw) return []
  let list: unknown = raw
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s || s === '[]' || s === 'null') return []
    try {
      list = JSON.parse(s)
    } catch {
      return []
    }
  }
  // D1 stores text (we send a JSON string); Supabase jsonb round-trips a
  // string through JSON encoding, which double-wraps it. Unwrap once more.
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return list
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object')
    .map((e) => ({
      name: String(e.name ?? ''),
      sets: typeof e.sets === 'number' ? e.sets : null,
      reps: typeof e.reps === 'number' ? e.reps : null,
      weight: typeof e.weight === 'number' ? e.weight : null,
    }))
}

/** sets × reps × weight, falling back to reps or sets when weight is absent. */
export function exerciseVolume(e: LoggedExercise): number {
  const sets = e.sets ?? 1
  const reps = e.reps ?? 10
  const weight = e.weight ?? 1
  return sets * reps * weight
}

function sessionVolume(exercises: LoggedExercise[]): number {
  return exercises.reduce((sum, e) => sum + exerciseVolume(e), 0)
}

function hoursBetween(fromISO: string, to: Date): number {
  const then = new Date(`${fromISO}T00:00:00`)
  if (Number.isNaN(then.getTime())) return 0
  return Math.max(0, (to.getTime() - then.getTime()) / 36e5)
}

/** Parse whatever shape muscle_groups is in (text[] vs JSON string). */
export function normaliseGroups(raw: unknown): MuscleId[] {
  if (!raw) return []
  let list: unknown = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      // Postgres array literal: {chest,back}
      list = raw.replace(/[{}]/g, '').split(',')
    }
  }
  if (!Array.isArray(list)) return []
  return list
    .map((m) => String(m).trim().toLowerCase())
    .filter((m): m is MuscleId => (MUSCLE_IDS as string[]).includes(m))
}

/**
 * Build the full recovery board from workout history.
 * `logs` may be in any order; only the most recent hit per muscle matters.
 */
export function computeRecovery(logs: any[], now: Date = new Date()): MuscleRecovery[] {
  const seen: Partial<Record<MuscleId, { date: string; volume: number; sets: number }>> = {}

  for (const log of logs || []) {
    const date = String(log?.date ?? '')
    if (!date) continue

    const groups = normaliseGroups(log?.muscle_groups)
    if (groups.length === 0) continue

    const exercises = parseExercisesColumn(log?.exercises)
    const vol = sessionVolume(exercises)
    // Fall back to session duration so pre-exercise rows still register load.
    const duration = typeof log?.duration === 'number' ? log.duration : 0
    const effectiveVolume = vol > 0 ? vol : duration * 40
    const sets = exercises.length
      ? exercises.reduce((s, e) => s + (e.sets ?? 0), 0)
      : groups.length * 3

    for (const g of groups) {
      const existing = seen[g]
      if (!existing || date > existing.date) {
        seen[g] = { date, volume: effectiveVolume, sets }
      }
    }
  }

  return MUSCLE_IDS.map((muscle) => {
    const base = RECOVERY_WINDOWS[muscle]
    const hit = seen[muscle]

    if (!hit) {
      return {
        muscle,
        label: MUSCLE_LABELS[muscle],
        status: 'untrained' as RecoveryStatus,
        hoursSince: null,
        hoursRequired: base,
        progress: 1,
        lastTrained: null,
        lastSets: 0,
        lastVolume: 0,
      }
    }

    // Heavier work stretches recovery, capped at 1.5x the base window.
    const loadFactor = 1 + Math.min(0.5, hit.volume / (HEAVY_SESSION * 2))
    const hoursRequired = Math.round(base * loadFactor)
    const hoursSince = hoursBetween(hit.date, now)
    const progress = Math.min(1, hoursSince / hoursRequired)

    let status: RecoveryStatus
    if (progress >= 1) status = 'ready'
    else if (hoursSince < 12) status = 'resting'
    else status = 'recovering'

    return {
      muscle,
      label: MUSCLE_LABELS[muscle],
      status,
      hoursSince: Math.round(hoursSince),
      hoursRequired,
      progress,
      lastTrained: hit.date,
      lastSets: hit.sets,
      lastVolume: Math.round(hit.volume),
    }
  })
}

/** Sorted best-first: ready groups, then closest to ready, then untrained. */
export function sortByReadiness(board: MuscleRecovery[]): MuscleRecovery[] {
  const rank: Record<RecoveryStatus, number> = { ready: 0, recovering: 1, resting: 2, untrained: 3 }
  return [...board].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
    if (a.status === 'untrained') return a.label.localeCompare(b.label)
    return b.progress - a.progress
  })
}

export const STATUS_META: Record<RecoveryStatus, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'text-neon-cyan' },
  recovering: { label: 'Recovering', color: 'text-neon-yellow' },
  resting: { label: 'Resting', color: 'text-white/40' },
  untrained: { label: 'Not trained', color: 'text-white/25' },
}
