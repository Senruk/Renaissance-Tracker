// ------------------------------------------------------------------
// Exercise → muscle mapping and recovery windows.
//
// The local map is the PRIMARY path. It is deterministic, free, works
// offline and is correct for the exercises people actually program. The
// /api/muscles function is only asked about exercises this map misses.
// ------------------------------------------------------------------

import { MUSCLE_GROUPS } from './constants'

export type MuscleId =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'quads' | 'hamstrings' | 'glutes' | 'calves'

export interface ExerciseMuscles {
  primary: MuscleId[]
  secondary: MuscleId[]
}

export interface ParsedExercise {
  name: string
  sets: number | null
  reps: number | null
  weight: number | null
}

export const MUSCLE_IDS = MUSCLE_GROUPS.map((m) => m.id as MuscleId)

/** Hours a group needs before it's worth hitting hard again. */
export const RECOVERY_WINDOWS: Record<MuscleId, number> = {
  forearms: 24,
  abs: 24,
  biceps: 36,
  triceps: 36,
  shoulders: 48,
  chest: 48,
  back: 48,
  calves: 48,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
}

export const MUSCLE_LABELS = MUSCLE_GROUPS.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.label }),
  {} as Record<string, string>,
) as Record<MuscleId, string>

// ------------------------------------------------------------------
// The map. Keys are normalised lowercase, punctuation stripped.
// ------------------------------------------------------------------

export const EXERCISE_MAP: Record<string, ExerciseMuscles> = {
  // --- Chest (presses) ---
  'bench press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'flat bench press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'incline bench press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'decline bench press': { primary: ['chest'], secondary: ['triceps'] },
  'dumbbell bench press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'incline dumbbell press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'machine chest press': { primary: ['chest'], secondary: ['triceps'] },
  'chest press': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'push up': { primary: ['chest'], secondary: ['triceps', 'shoulders', 'abs'] },
  'pushup': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'push ups': { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'cable fly': { primary: ['chest'], secondary: ['shoulders'] },
  'flyes': { primary: ['chest'], secondary: [] },
  'pec fly': { primary: ['chest'], secondary: [] },
  'dumbbell fly': { primary: ['chest'], secondary: [] },
  'kettlebell press': { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  'dips': { primary: ['chest', 'triceps'], secondary: ['shoulders'] },
  'chest dip': { primary: ['chest', 'triceps'], secondary: ['shoulders'] },
  'svt press': { primary: ['chest'], secondary: [] },

  // --- Back (pulls) ---
  'deadlift': { primary: ['back', 'hamstrings', 'glutes'], secondary: ['quads', 'abs', 'forearms'] },
  'conventional deadlift': { primary: ['back', 'hamstrings', 'glutes'], secondary: ['quads', 'abs'] },
  'sumo deadlift': { primary: ['glutes', 'hamstrings'], secondary: ['back', 'quads'] },
  'romanian deadlift': { primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  rdl: { primary: ['hamstrings', 'glutes'], secondary: ['back'] },
  'trap bar deadlift': { primary: ['glutes', 'hamstrings'], secondary: ['back', 'quads'] },
  'pull up': { primary: ['back'], secondary: ['biceps', 'forearms'] },
  'pullup': { primary: ['back'], secondary: ['biceps', 'forearms'] },
  'pull ups': { primary: ['back'], secondary: ['biceps', 'forearms'] },
  'chin up': { primary: ['back', 'biceps'], secondary: ['forearms'] },
  'chinup': { primary: ['back', 'biceps'], secondary: ['forearms'] },
  'lat pulldown': { primary: ['back'], secondary: ['biceps'] },
  'pulldown': { primary: ['back'], secondary: ['biceps'] },
  'seated cable row': { primary: ['back'], secondary: ['biceps', 'shoulders'] },
  'barbell row': { primary: ['back'], secondary: ['biceps', 'forearms', 'abs'] },
  'bent over row': { primary: ['back'], secondary: ['biceps', 'forearms'] },
  'dumbbell row': { primary: ['back'], secondary: ['biceps'] },
  'one arm dumbbell row': { primary: ['back'], secondary: ['biceps'] },
  'tbar row': { primary: ['back'], secondary: ['biceps'] },
  'straight arm pulldown': { primary: ['back'], secondary: [] },
  'face pull': { primary: ['shoulders', 'back'], secondary: [] },
  'shrug': { primary: ['back'], secondary: [] },
  'rear delt fly': { primary: ['back', 'shoulders'], secondary: [] },
  'back extension': { primary: ['back', 'glutes'], secondary: ['hamstrings'] },
  'superman': { primary: ['back'], secondary: ['glutes'] },
  'renegade row': { primary: ['back'], secondary: ['abs', 'shoulders'] },

  // --- Shoulders ---
  'overhead press': { primary: ['shoulders'], secondary: ['triceps'] },
  'military press': { primary: ['shoulders'], secondary: ['triceps'] },
  'dumbbell shoulder press': { primary: ['shoulders'], secondary: ['triceps'] },
  'lateral raise': { primary: ['shoulders'], secondary: [] },
  'side raise': { primary: ['shoulders'], secondary: [] },
  'lateral raises': { primary: ['shoulders'], secondary: [] },
  'front raise': { primary: ['shoulders'], secondary: [] },
  'rear delt raise': { primary: ['shoulders'], secondary: ['back'] },
  'arnold press': { primary: ['shoulders'], secondary: ['triceps'] },
  'upright row': { primary: ['shoulders'], secondary: ['biceps'] },
  'shrug press': { primary: ['shoulders'], secondary: ['triceps'] },
  'handstand push up': { primary: ['shoulders', 'triceps'], secondary: [] },
  'pike push up': { primary: ['shoulders', 'triceps'], secondary: [] },
  'landmine press': { primary: ['shoulders'], secondary: ['triceps'] },

  // --- Biceps ---
  'barbell curl': { primary: ['biceps'], secondary: ['forearms'] },
  'bicep curl': { primary: ['biceps'], secondary: ['forearms'] },
  'biceps curl': { primary: ['biceps'], secondary: ['forearms'] },
  'dumbbell curl': { primary: ['biceps'], secondary: ['forearms'] },
  'incline curl': { primary: ['biceps'], secondary: [] },
  'hammer curl': { primary: ['biceps', 'forearms'], secondary: [] },
  'preacher curl': { primary: ['biceps'], secondary: [] },
  'cable curl': { primary: ['biceps'], secondary: [] },
  'concentration curl': { primary: ['biceps'], secondary: [] },
  'zottman curl': { primary: ['biceps'], secondary: ['forearms'] },
  curl: { primary: ['biceps'], secondary: ['forearms'] },
  curls: { primary: ['biceps'], secondary: ['forearms'] },

  // --- Triceps ---
  'triceps pushdown': { primary: ['triceps'], secondary: [] },
  pushdown: { primary: ['triceps'], secondary: [] },
  'push down': { primary: ['triceps'], secondary: [] },
  'rope pushdown': { primary: ['triceps'], secondary: [] },
  'skull crusher': { primary: ['triceps'], secondary: [] },
  'overhead extension': { primary: ['triceps'], secondary: [] },
  'dumbbell extension': { primary: ['triceps'], secondary: [] },
  'triceps dip': { primary: ['triceps'], secondary: ['chest'] },
  'close grip press': { primary: ['triceps', 'chest'], secondary: ['shoulders'] },
  'bench dip': { primary: ['triceps'], secondary: ['chest'] },

  // --- Forearms / grip ---
  'wrist curl': { primary: ['forearms'], secondary: [] },
  'wrist extension': { primary: ['forearms'], secondary: [] },
  'farmer carry': { primary: ['forearms'], secondary: ['shoulders', 'back'] },
  'dead hang': { primary: ['forearms'], secondary: [] },

  // --- Core ---
  plank: { primary: ['abs'], secondary: [] },
  'side plank': { primary: ['abs'], secondary: [] },
  crunch: { primary: ['abs'], secondary: [] },
  crunches: { primary: ['abs'], secondary: [] },
  'sit up': { primary: ['abs'], secondary: [] },
  situps: { primary: ['abs'], secondary: [] },
  'hanging leg raise': { primary: ['abs'], secondary: [] },
  'leg raise': { primary: ['abs'], secondary: [] },
  'cable crunch': { primary: ['abs'], secondary: [] },
  'russian twist': { primary: ['abs'], secondary: [] },
  'pallof press': { primary: ['abs'], secondary: [] },
  'hollow hold': { primary: ['abs'], secondary: [] },
  'ab wheel': { primary: ['abs'], secondary: [] },
  'mountain climber': { primary: ['abs'], secondary: ['shoulders'] },
  'dead bug': { primary: ['abs'], secondary: [] },
  vacuum: { primary: ['abs'], secondary: [] },
  'hanging knee raise': { primary: ['abs'], secondary: [] },

  // --- Quads ---
  squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'abs', 'back'] },
  'back squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'abs'] },
  'front squat': { primary: ['quads'], secondary: ['glutes', 'abs'] },
  'goblet squat': { primary: ['quads', 'glutes'], secondary: ['abs'] },
  'leg press': { primary: ['quads'], secondary: ['glutes', 'hamstrings'] },
  'hack squat': { primary: ['quads'], secondary: ['glutes'] },
  'bulgarian split squat': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'split squat': { primary: ['quads', 'glutes'], secondary: [] },
  lunge: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  lunges: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'walking lunge': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'step up': { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  'leg extension': { primary: ['quads'], secondary: [] },
  'leg curl': { primary: ['hamstrings'], secondary: ['calves'] },
  'sissy squat': { primary: ['quads'], secondary: ['glutes'] },
  'wall sit': { primary: ['quads'], secondary: ['glutes'] },

  // --- Hamstrings / glutes ---
  'hip thrust': { primary: ['glutes', 'hamstrings'], secondary: ['quads'] },
  'glute bridge': { primary: ['glutes'], secondary: ['hamstrings'] },
  'kettlebell swing': { primary: ['glutes', 'hamstrings'], secondary: ['back'] },
  'good morning': { primary: ['hamstrings'], secondary: ['glutes', 'back'] },
  'nordic curl': { primary: ['hamstrings'], secondary: ['glutes'] },
  'reverse hyperextension': { primary: ['glutes', 'hamstrings'], secondary: ['back'] },
  'fire hydrant': { primary: ['glutes'], secondary: [] },
  'hip abduction': { primary: ['glutes'], secondary: [] },
  'hip thrust march': { primary: ['glutes'], secondary: [] },

  // --- Calves ---
  'calf raise': { primary: ['calves'], secondary: [] },
  'calf raises': { primary: ['calves'], secondary: [] },
  'standing calf raise': { primary: ['calves'], secondary: [] },
  'seated calf raise': { primary: ['calves'], secondary: [] },
  'leg press calf raise': { primary: ['calves'], secondary: [] },
  'tibialis raise': { primary: ['calves'], secondary: [] },
}

// ------------------------------------------------------------------
// Normalisation + lookup
// ------------------------------------------------------------------

/** "Incline DB Press (3x8)" -> "incline db press" */
export function normaliseExerciseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Look an exercise up in the local map.
 * Exact match first, then "map key appears in the input" (longest key wins,
 * so "incline dumbbell press" beats "press"), then a token-overlap fallback.
 * Returns null when we genuinely don't know the exercise.
 */
export function lookupExercise(raw: string): ExerciseMuscles | null {
  const name = normaliseExerciseName(raw)
  if (!name) return null
  if (EXERCISE_MAP[name]) return EXERCISE_MAP[name]

  let best: { key: string; val: ExerciseMuscles } | null = null
  for (const [key, val] of Object.entries(EXERCISE_MAP)) {
    if (!name.includes(key)) continue
    if (!best || key.length > best.key.length) best = { key, val }
  }
  if (best) return best.val

  const tokens = name.split(' ').filter((t) => t.length > 2)
  if (tokens.length === 0) return null
  let fallback: { score: number; val: ExerciseMuscles } | null = null
  for (const [key, val] of Object.entries(EXERCISE_MAP)) {
    const keyTokens = key.split(' ')
    const hits = tokens.filter((t) => keyTokens.some((kt) => kt.startsWith(t) || t.startsWith(kt))).length
    const score = hits / tokens.length
    if (score >= 0.5 && (!fallback || score > fallback.score)) fallback = { score, val }
  }
  return fallback ? fallback.val : null
}

/** Flatten an exercise to every muscle group it counts as having worked. */
export function musclesFor(m: ExerciseMuscles | null): MuscleId[] {
  if (!m) return []
  return Array.from(new Set([...m.primary, ...m.secondary]))
}

/** Muscle groups treated as the "main" stimulus for a session. */
export function primaryMusclesFor(m: ExerciseMuscles | null): MuscleId[] {
  return m ? Array.from(new Set(m.primary)) : []
}

// ------------------------------------------------------------------
// Input parsing: "bench press 4x8 80kg"
// ------------------------------------------------------------------

export function parseExerciseInput(input: string): ParsedExercise {
  let name = input.trim()
  let sets: number | null = null
  let reps: number | null = null
  let weight: number | null = null

  // Trailing weight: "80kg", "80 kg", "2.5"
  const wm = name.match(/\s(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos)?\s*$/i)
  if (wm && wm.index !== undefined) {
    const before = name.slice(0, wm.index).trim()
    // Only treat as weight if exercise-name text is left over
    if (before && /[a-z]/i.test(before)) {
      weight = parseFloat(wm[1])
      name = before
    }
  }

  // Sets x reps: "4x8", "4 x 8"
  const sx = name.match(/(\d+)\s*[x*]\s*(\d+)/i)
  if (sx && sx.index !== undefined) {
    sets = parseInt(sx[1], 10)
    reps = parseInt(sx[2], 10)
    name = name.slice(0, sx.index) + ' ' + name.slice(sx.index + sx[0].length)
  } else {
    // "4 sets of 8" / "4 sets x 8"
    const of = name.match(/(\d+)\s*sets?\s*(?:of|x|@)?\s*(\d+)/i)
    if (of && of.index !== undefined) {
      sets = parseInt(of[1], 10)
      reps = parseInt(of[2], 10)
      name = name.slice(0, of.index) + ' ' + name.slice(of.index + of[0].length)
    }
  }

  // Strip leftover rep words, tidy whitespace
  name = name.replace(/\b\d+\s*reps?\b/gi, ' ').replace(/\s+/g, ' ').trim()

  return { name, sets, reps, weight }
}
