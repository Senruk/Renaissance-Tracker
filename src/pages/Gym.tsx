import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import { XP, MUSCLE_GROUPS } from '../lib/constants'
import GlassCard from '../components/ui/GlassCard'
import BodyDiagram from '../components/3d/BodyDiagram'
import { motion } from 'framer-motion'
import { Dumbbell, Clock, Flame } from 'lucide-react'

export default function Gym() {
  const { user, addXP } = useAuth()
  const { data, today, refresh } = useData()
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [view, setView] = useState<'log' | 'history'>('log')

  function handleMuscleClick(muscle: string) {
    if (muscle === 'head') return
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    )
  }

  async function logWorkout() {
    if (selectedMuscles.length === 0) return
    await supabase.from('workout_logs').insert({
      user_id: user?.id,
      date: today,
      muscle_groups: selectedMuscles,
      duration: parseInt(duration) || null,
      notes,
    })
    addXP(XP.WORKOUT_LOG + selectedMuscles.length * 5, 'workout')
    setSelectedMuscles([])
    setDuration('')
    setNotes('')
    await refresh()
  }

  const muscleLabels = MUSCLE_GROUPS.reduce((acc, m) => ({ ...acc, [m.id]: m.label }), {} as Record<string, string>)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">Gym</h1>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          <button onClick={() => setView('log')} className={`px-3 py-1 rounded-md text-xs transition-colors ${view === 'log' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40'}`}>Log</button>
          <button onClick={() => setView('history')} className={`px-3 py-1 rounded-md text-xs transition-colors ${view === 'history' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40'}`}>History</button>
        </div>
      </div>

      {view === 'log' ? (
        <>
          {/* 3D Body Diagram */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell size={16} className="text-neon-pink" />
              <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Tap muscles you worked</span>
            </div>
            <BodyDiagram highlightedMuscles={selectedMuscles} onMuscleClick={handleMuscleClick} />
            {selectedMuscles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedMuscles.map(m => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                    {muscleLabels[m] || m}
                  </span>
                ))}
              </div>
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
                disabled={selectedMuscles.length === 0}
                className="w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-neon-pink/20 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Log Workout {selectedMuscles.length > 0 && `(${selectedMuscles.length} muscles)`}
              </button>
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
                      {(w.muscle_groups || []).map((m: string) => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/10 text-neon-pink border border-neon-pink/20">
                          {muscleLabels[m] || m}
                        </span>
                      ))}
                    </div>
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
