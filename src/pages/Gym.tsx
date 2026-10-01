import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import { XP } from '../lib/constants'
import {
  parseExerciseInput,
  lookupExercise,
  musclesFor,
  MUSCLE_LABELS,
  type MuscleId,
  type ParsedExercise,
  type ExerciseMuscles,
} from '../lib/exercises'
import {
  computeRecovery,
  sortByReadiness,
  parseExercisesColumn,
  normaliseGroups,
  STATUS_META,
} from '../lib/recovery'
import { useMuscleDetection, useCoachNarrative } from '../hooks/useMuscleDetection'
import GlassCard from '../components/ui/GlassCard'
import BodyDiagram from '../components/3d/BodyDiagram'
import { motion } from 'framer-motion'
import { Dumbbell, Clock, Flame, Plus, X, Sparkles, Activity } from 'lucide-react'

export default function Gym() {
  const { user, addXP } = useAuth()
  const { data, today, refresh } = useData()
  const { resolve, resolving } = useMuscleDetection()
  const { narrative, loading: narrativeLoading, generate: generateNarrative } = useCoachNarrative()

  const [view, setView] = useState<'log' | 'recovery' | 'history'>('log')
  const [draft, setDraft] = useState('')
  const [exercises, setExercises] = useState<ParsedExercise[]>([])
  // name -> muscles. Filled from the local map the moment an exercise is added
  // and upgraded later by /api/muscles. Keyed by name (rather than folded into
  // manualAdds) so deleting an exercise also drops the muscles it implied.
  const [resolved, setResolved] = useState<Record<string, ExerciseMuscles | null>>({})
  const [manualAdds, setManualAdds] = useState<MuscleId[]>([])
  const [manualRemoves, setManualRemoves] = useState<MuscleId[]>([])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const autoMuscles = useMemo(() => {
    const all = exercises.flatMap((e) => {
      const hit = e.name in resolved ? resolved[e.name] : lookupExercise(e.name)
      return musclesFor(hit)
    })
    return Array.from(new Set(all)) as MuscleId[]
  }, [exercises, resolved])

  const selectedMuscles = useMemo(() => {
    const set = new Set<MuscleId>([...autoMuscles, ...manualAdds])
    for (const m of manualRemoves) set.delete(m)
    return Array.from(set)
  }, [autoMuscles, manualAdds, manualRemoves])

  const board = useMemo(() => computeRecovery(data.workout_logs), [data.workout_logs])
  const readyNow = useMemo(() => board.filter((b) => b.status === 'ready'), [board])
  const sortedBoard = useMemo(() => sortByReadiness(board), [board])

  useEffect(() => {
    if (view === 'recovery' && board.length > 0) generateNarrative(board)
  }, [view, board, generateNarrative])

  function handleMuscleClick(muscle: string) {
    if (muscle === 'head') return
    const m = muscle as MuscleId
    if (selectedMuscles.includes(m)) {
      setManualAdds((a) => a.filter((x) => x !== m))
      setManualRemoves((r) => (r.includes(m) ? r : [...r, m]))
    } else {
      setManualRemoves((r) => r.filter((x) => x !== m))
      setManualAdds((a) => (a.includes(m) ? a : [...a, m]))
    }
  }

  async function addExercise(raw: string) {
    const parsed = parseExerciseInput(raw)
    if (!parsed.name) return
    setExercises((prev) => [...prev, parsed])
    setDraft('')
    setSaved(false)
    setSaveError(null)

    // Local map first so the muscle chips appear instantly.
    const local = lookupExercise(parsed.name)
    setResolved((prev) => ({ ...prev, [parsed.name]: local }))
    if (local) return

    // Only ask the API about what the local map genuinely didn't know.
    const map = await resolve([parsed.name])
    const hit = map.get(parsed.name) ?? null
    if (hit) setResolved((prev) => ({ ...prev, [parsed.name]: hit }))
  }

  function removeExercise(index: number) {
    // autoMuscles derives from `exercises`, so the implied muscles disappear
    // with the row. Anything the user tapped by hand is left alone.
    setExercises((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  async function logWorkout() {
    if (selectedMuscles.length === 0 && exercises.length === 0) return
    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase.from('workout_logs').insert({
        user_id: user?.id,
        date: today,
        muscle_groups: selectedMuscles,
        // JSON string so it binds cleanly to D1's TEXT column.
        exercises: JSON.stringify(exercises),
        duration: parseInt(duration) || null,
        notes,
      })
      if (error) throw error

      await addXP(XP.WORKOUT_LOG + selectedMuscles.length * 5, 'workout')
      setExercises([])
      setResolved({})
      setManualAdds([])
      setManualRemoves([])
      setDuration('')
      setNotes('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await refresh()
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message ? err.message : 'Could not save this workout.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Gym</h1>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {(['log', 'recovery', 'history'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${view === v ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40'}`}
            >
              {v}
              {v === 'recovery' && readyNow.length > 0 && (
                <span className="ml-1 text-neon-cyan">{readyNow.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {view === 'log' ? (
        <>
          {/* Exercise entry — muscles get worked out from these */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell size={16} className="text-neon-pink" />
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Add exercises</span>
            </div>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExercise(draft)
                  }
                }}
                placeholder="Bench press 4x8 80kg"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50"
              />
              <button
                onClick={() => addExercise(draft)}
                disabled={!draft.trim()}
                aria-label="Add exercise"
                className="px-3 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25 disabled:opacity-30"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-[10px] text-white/30 mt-1.5">
              Name, sets x reps, weight — the muscles are worked out for you.
            </p>

            {exercises.length > 0 && (
              <div className="mt-2 space-y-1">
                {exercises.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-white/5 rounded-md px-2.5 py-1.5">
                    <div className="min-w-0">
                      <span className="text-xs text-white truncate block capitalize">{e.name}</span>
                      {(e.sets || e.reps || e.weight) && (
                        <span className="text-[10px] text-white/40">
                          {e.sets ? `${e.sets} sets` : ''}
                          {e.sets && e.reps ? ' · ' : ''}
                          {e.reps ? `${e.reps} reps` : ''}
                          {e.weight ? ` · ${e.weight}kg` : ''}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeExercise(i)}
                      aria-label={`Remove ${e.name}`}
                      className="text-white/30 hover:text-neon-pink shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* 3D Body Diagram — detected groups light up automatically */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-neon-pink" />
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
                {resolving ? 'Detecting muscles…' : 'Muscles worked'}
              </span>
            </div>
            <BodyDiagram highlightedMuscles={selectedMuscles} onMuscleClick={handleMuscleClick} />
            {selectedMuscles.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedMuscles.map(m => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                    {MUSCLE_LABELS[m] || m}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/30 mt-2 text-center">
                Add an exercise above, or tap the body to pick muscles yourself.
              </p>
            )}
          </GlassCard>

          {/* Workout Details */}
          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-white/40" />
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (minutes)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (sets, reps, weights...)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50 resize-none h-16" />
              <button
                onClick={logWorkout}
                disabled={saving || (selectedMuscles.length === 0 && exercises.length === 0)}
                className="w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-neon-pink/20 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {saving
                  ? 'Saving…'
                  : saved
                    ? 'Logged ✓'
                    : `Log Workout${selectedMuscles.length > 0 ? ` (${selectedMuscles.length} muscles)` : ''}`}
              </button>
              {saveError && (
                <p className="text-[11px] text-neon-pink text-center">{saveError}</p>
              )}
            </div>
          </GlassCard>
        </>
      ) : view === 'recovery' ? (
        <>
          {/* Coaching summary — deterministic first, upgraded by the model */}
          <GlassCard>
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="text-neon-cyan mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">
                  {narrative?.headline ?? 'Recovery'}
                </div>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">
                  {narrative?.body ?? 'Log a workout and this fills in.'}
                </p>
                {narrative && (
                  <div className="text-[10px] text-white/25 mt-2">
                    {narrative.ai
                      ? 'AI coaching note'
                      : narrativeLoading
                        ? 'Refining…'
                        : 'Based on your logged sessions'}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* What's ready right now */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-neon-cyan" />
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Ready to hit</span>
            </div>
            {readyNow.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {readyNow.map(b => (
                  <span key={b.muscle} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                    {b.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">
                Nothing fully recovered yet. Rest or mobility today.
              </p>
            )}
          </GlassCard>

          {/* Full board, best first */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell size={16} className="text-neon-pink" />
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Muscle recovery</span>
            </div>
            <div className="space-y-2.5">
              {sortedBoard.map(b => {
                const meta = STATUS_META[b.status]
                return (
                  <div key={b.muscle}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/80">{b.label}</span>
                      <span className={meta.color}>
                        {meta.label}
                        {b.status === 'recovering' && b.hoursSince !== null && (
                          <span className="text-white/30 ml-1">
                            {b.hoursSince}h / {b.hoursRequired}h
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          b.status === 'ready'
                            ? 'bg-neon-cyan'
                            : b.status === 'recovering'
                              ? 'bg-neon-yellow'
                              : 'bg-white/10'
                        }`}
                        style={{ width: `${Math.round(b.progress * 100)}%` }}
                      />
                    </div>
                    {b.status !== 'untrained' && (
                      <div className="text-[10px] text-white/25 mt-0.5">
                        {b.lastSets} sets · {b.lastVolume.toLocaleString('en-GB')} volume
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </>
      ) : (
        /* History */
        <div className="space-y-2">
          {data.workout_logs.length === 0 ? (
            <GlassCard>
              <p className="text-white/40 text-sm text-center py-4">No workouts logged yet. Start tracking!</p>
            </GlassCard>
          ) : (
            data.workout_logs.map((w: any) => (
              <GlassCard key={w.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-white font-medium">
                      {new Date(w.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {normaliseGroups(w.muscle_groups).map((m) => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/10 text-neon-pink border border-neon-pink/20">
                          {MUSCLE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                    {parseExercisesColumn(w.exercises).length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {parseExercisesColumn(w.exercises).map((e, i) => (
                          <div key={i} className="text-[11px] text-white/35 capitalize">
                            {e.name}
                            {(e.sets || e.reps || e.weight) && (
                              <span className="text-white/25">
                                {' '}
                                {e.sets ? `${e.sets}x` : ''}
                                {e.reps ?? ''}
                                {e.weight ? ` @ ${e.weight}kg` : ''}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {w.duration && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                        <Clock size={12} /> {w.duration} min
                      </div>
                    )}
                    {w.notes && <p className="text-xs text-white/30 mt-1">{w.notes}</p>}
                  </div>
                  <Flame size={16} className="text-neon-pink" />
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}
    </motion.div>
  )
}
