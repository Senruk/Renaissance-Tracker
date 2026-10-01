import { useCallback, useState } from 'react'
import {
  MUSCLE_IDS,
  lookupExercise,
  musclesFor,
  type ExerciseMuscles,
  type MuscleId,
} from '../lib/exercises'
import type { MuscleRecovery } from '../lib/recovery'

/**
 * The model is asked for muscle ids but it can still return junk, so we only
 * keep groups the app actually tracks. Anything unrecognised is dropped and
 * the exercise simply falls back to manual muscle selection.
 */
function toMuscleIds(raw: unknown): MuscleId[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((m) => String(m).trim().toLowerCase())
    .filter((m): m is MuscleId => (MUSCLE_IDS as string[]).includes(m))
}

/**
 * Two-tier muscle detection.
 *
 * Tier 1 — the local EXERCISE_MAP. Instant, free, offline. Handles almost
 *          everything a normal training week contains.
 * Tier 2 — POST /api/muscles for whatever the map missed, so odd one-off
 *          variations still get mapped. If that call fails (offline, no API
 *          key deployed, function down) we simply return null for those and
 *          let the user pick the muscles by hand, exactly as before.
 */
export function useMuscleDetection() {
  const [resolving, setResolving] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)

  const resolve = useCallback(async (names: string[]): Promise<Map<string, ExerciseMuscles | null>> => {
    const out = new Map<string, ExerciseMuscles | null>()
    const unknown: string[] = []

    for (const n of names) {
      const local = lookupExercise(n)
      out.set(n, local)
      if (!local && n.trim()) unknown.push(n)
    }

    if (unknown.length === 0) return out

    setResolving(true)
    try {
      const res = await fetch('/api/muscles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exercises: unknown }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const results: { exercise: string; primary?: string[]; secondary?: string[] }[] =
        json?.data?.results ?? []

      for (const r of results) {
        if (!r?.exercise) continue
        out.set(r.exercise, {
          primary: toMuscleIds(r.primary),
          secondary: toMuscleIds(r.secondary),
        })
      }
      setAiUnavailable(false)
    } catch {
      // Offline, or the function isn't deployed. Local map still stands.
      setAiUnavailable(true)
    } finally {
      setResolving(false)
    }

    return out
  }, [])

  return { resolve, resolving, aiUnavailable }
}

export interface CoachNarrative {
  headline: string
  body: string
  /** True when this came from the model rather than the local fallback. */
  ai: boolean
}

function localNarrative(board: MuscleRecovery[]): CoachNarrative {
  const ready = board.filter((b) => b.status === 'ready')
  const recovering = board.filter((b) => b.status === 'recovering')
  const resting = board.filter((b) => b.status === 'resting')

  if (ready.length === 0 && resting.length === 0) {
    return {
      headline: 'Recovery day',
      body: 'Everything you touched recently is still working. Mobility, a walk or a full rest day will do more for you than another session.',
      ai: false,
    }
  }

  const soonest = [...recovering].sort((a, b) => b.progress - a.progress)[0]
  const lines: string[] = []

  if (ready.length > 0) {
    lines.push(`Ready to train: ${ready.map((r) => r.label).join(', ')}.`)
  }
  if (soonest) {
    const hoursLeft = Math.max(1, soonest.hoursRequired - (soonest.hoursSince ?? 0))
    lines.push(`${soonest.label} is closest — roughly ${hoursLeft}h from ready.`)
  }
  if (resting.length > 0) {
    lines.push(`Still resting: ${resting.map((r) => r.label).join(', ')}.`)
  }

  return {
    headline: ready.length > 0 ? `${ready.length} group${ready.length > 1 ? 's' : ''} ready` : 'Recovering',
    body: lines.join(' '),
    ai: false,
  }
}

/**
 * Narrative coaching summary for the recovery board.
 * The deterministic version above always renders instantly; the model
 * version (POST /api/coach) upgrades it in place when it's reachable.
 */
export function useCoachNarrative() {
  const [narrative, setNarrative] = useState<CoachNarrative | null>(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async (board: MuscleRecovery[]) => {
    const fallback = localNarrative(board)
    setNarrative(fallback)
    setLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          board: board.map((b) => ({
            muscle: b.muscle,
            label: b.label,
            status: b.status,
            hoursSince: b.hoursSince,
            hoursRequired: b.hoursRequired,
            progress: Number(b.progress.toFixed(2)),
            lastSets: b.lastSets,
          })),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const d = json?.data
      if (d?.headline && d?.body) {
        setNarrative({ headline: String(d.headline), body: String(d.body), ai: true })
      }
    } catch {
      // Keep the local narrative on screen.
    } finally {
      setLoading(false)
    }
  }, [])

  return { narrative, loading, generate }
}

/** Every muscle group touched by a set of exercise names, de-duplicated. */
export function unionMuscles(map: Map<string, ExerciseMuscles | null>): MuscleId[] {
  const all = Array.from(map.values()).flatMap((m) => musclesFor(m))
  return Array.from(new Set(all))
}
