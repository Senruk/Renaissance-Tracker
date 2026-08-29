import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import GlassCard from '../components/ui/GlassCard'
import BodyDiagram from '../components/3d/BodyDiagram'
import WaterTracker from '../components/dashboard/WaterTracker'
import MoodSelector from '../components/dashboard/MoodSelector'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Heart, TrendingUp, Clock, Trash2 } from 'lucide-react'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const springConfig = reducedMotion
  ? { duration: 0 }
  : { type: 'spring' as const, stiffness: 400, damping: 30 }
const tapWhileTap = reducedMotion ? {} : { scale: 0.97 }

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', forearms: 'Forearms', abs: 'Core / Abs',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
}

export default function Body() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      document.body.classList.toggle('reduce-motion', e.matches)
    }
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  const { user, addXP } = useAuth()
  const { data, today, todayWater, todayMood, refresh } = useData()
  const [tab, setTab] = useState<'gym' | 'health' | 'meals' | 'work'>('gym')

  // Gym state
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [workoutDuration, setWorkoutDuration] = useState('')
  const [workoutNotes, setWorkoutNotes] = useState('')

  // Health state
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [steps, setSteps] = useState('')

  // Meals state
  const [mealName, setMealName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  // Work state
  const [workTask, setWorkTask] = useState('')
  const [workMinutes, setWorkMinutes] = useState('')
  const [workCategory, setWorkCategory] = useState('focused')

  const XP = { WORKOUT_LOG: 25, WATER_GOAL: 5, MOOD_LOG: 3 }

  function handleMuscleClick(muscle: string) {
    if (muscle === 'head') return
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle],
    )
  }

  async function logWorkout() {
    if (selectedMuscles.length === 0) return
    await supabase.from('workout_logs').insert({
      user_id: user?.id,
      date: today,
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

  async function logMeal() {
    if (!mealName.trim()) return
    await supabase.from('meal_logs').insert({
      user_id: user?.id,
      date: today,
      name: mealName,
      calories: parseInt(calories) || 0,
      protein_g: parseInt(protein) || 0,
      carbs_g: parseInt(carbs) || 0,
      fat_g: parseInt(fat) || 0,
    })
    addXP(10, 'meal_log')
    setMealName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    await refresh()
  }

  async function logWorkSession() {
    if (!workTask.trim() || !workMinutes) return
    await supabase.from('work_sessions').insert({
      user_id: user?.id,
      date: today,
      task_name: workTask,
      total_minutes: parseInt(workMinutes),
      category: workCategory,
    })
    addXP(20, 'work_session')
    setWorkTask('')
    setWorkMinutes('')
    await refresh()
  }

  const TABS = [
    { id: 'gym', label: 'Gym', icon: Dumbbell },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'meals', label: 'Meals', icon: TrendingUp },
    { id: 'work', label: 'Work', icon: Clock },
  ] as const

  const todayMeals = data.meal_logs.filter((m: any) => m.date === today)
  const todayWork = data.work_sessions.filter((w: any) => w.date === today)

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
      exit={reducedMotion ? {} : { opacity: 0, y: -10 }}
      transition={springConfig}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      {/* Tab Header */}
      <div className="flex bg-bg-secondary/40 rounded-lg p-0.5 gap-1 mb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            whileTap={tab === id ? {} : tapWhileTap}
            onClick={() => setTab(id)}
            className={`touch-target flex items-center justify-center gap-1.5 flex-1 py-2 rounded-md text-xs font-medium transition-all ${
              tab === id
                ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40'
            }} focus:outline-none focus:ring-2 focus:ring-accent-gold/30`}
            aria-label={label}
          >
            <Icon size={14} />
            {label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {tab === 'gym' && (
            <>
              <GlassCard>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell size={16} className="text-accent-pink" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Tap muscles you worked</span>
                </div>
                <BodyDiagram highlightedMuscles={selectedMuscles} onMuscleClick={handleMuscleClick} />
                {selectedMuscles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedMuscles.map(m => (
                      <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                        {MUSCLE_LABELS[m] || m}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-text-tertiary" />
                    <input
                      type="number" value={workoutDuration} onChange={(e) => setWorkoutDuration(e.target.value)}
                      placeholder="Duration (minutes)"
                      className="flex-1 bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
                    />
                  </div>
                  <textarea
                    value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)}
                    placeholder="Notes (sets, reps, weights...)"
                    className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50 resize-none h-16"
                  />
                  <button
                    onClick={logWorkout}
                    disabled={selectedMuscles.length === 0}
                    className="w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-accent-pink/20 text-accent-pink border border-accent-pink/30 hover:bg-accent-pink/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Log Workout {selectedMuscles.length > 0 && `(${selectedMuscles.length} muscles)`}
                  </button>
                </div>
              </GlassCard>
            </>
          )}

          {tab === 'health' && (
            <>
              <GlassCard>
                <WaterTracker currentMl={todayWater} onAdd={handleWaterAdd} />
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-accent-pink" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Mood</span>
                </div>
                <MoodSelector currentMood={todayMood} onSelect={handleMoodSelect} />
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-accent-amber" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Steps</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Steps today" className="flex-1 bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                  <button onClick={() => steps && logHealthMetric('steps', parseInt(steps))} className="px-4 py-2 rounded-lg bg-accent-amber/10 text-accent-amber text-sm border border-accent-amber/20 hover:bg-accent-amber/20 transition-colors">Log</button>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-accent-cyan" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Sleep</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="Hours slept" className="flex-1 bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                  <button onClick={() => sleepHours && logHealthMetric('sleep', parseFloat(sleepHours))} className="px-4 py-2 rounded-lg bg-accent-cyan/10 text-accent-cyan text-sm border border-accent-cyan/20 hover:bg-accent-cyan/20 transition-colors">Log</button>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-accent-copper" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Weight</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg)" className="flex-1 bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                  <button onClick={() => weight && logHealthMetric('weight', parseFloat(weight))} className="px-4 py-2 rounded-lg bg-accent-copper/10 text-accent-copper text-sm border border-accent-copper/20 hover:bg-accent-copper/20 transition-colors">Log</button>
                </div>
              </GlassCard>
            </>
          )}

          {tab === 'meals' && (
            <>
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-accent-amber" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Log a Meal</span>
                </div>
                <div className="space-y-3">
                  <input
                    type="text" value={mealName} onChange={(e) => setMealName(e.target.value)}
                    placeholder="Meal name (e.g. Chicken Salad)"
                    className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" className="bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                    <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein (g)" className="bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                    <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbs (g)" className="bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                    <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Fat (g)" className="bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50" />
                  </div>
                  <button
                    onClick={logMeal}
                    disabled={!mealName.trim()}
                    className="w-full py-2 rounded-lg font-medium text-sm transition-all bg-accent-gold/20 text-accent-gold border border-accent-gold/30 hover:bg-accent-gold/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Save Meal
                  </button>
                </div>
              </GlassCard>

              {todayMeals.length > 0 && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Today's Meals</span>
                  </div>
                  <div className="space-y-2">
                    {todayMeals.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center p-2 bg-bg-secondary/40 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{m.name}</div>
                          <div className="text-xs text-text-tertiary">
                            {m.calories && `${m.calories} kcal · `}
                            {m.protein_g && `${m.protein_g}g P · `}
                            {m.carbs_g && `${m.carbs_g}g C · `}
                            {m.fat_g && `${m.fat_g}g F`}
                          </div>
                        </div>
                        <button
                          onClick={async () => { await supabase.from('meal_logs').delete().eq('id', m.id); await refresh() }}
                          className="p-1 hover:bg-bg-secondary/60 rounded transition-colors"
                        >
                          <Trash2 size={12} className="text-text-tertiary" />
                        </button>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </>
          )}

          {tab === 'work' && (
            <>
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-accent-copper" />
                  <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Work Session</span>
                </div>
                <div className="space-y-3">
                  <input
                    type="text" value={workTask} onChange={(e) => setWorkTask(e.target.value)}
                    placeholder="Task name (e.g. Client proposal)"
                    className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
                  />
                  <input
                    type="number" value={workMinutes} onChange={(e) => setWorkMinutes(e.target.value)}
                    placeholder="Minutes spent"
                    className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
                  />
                  <select
                    value={workCategory} onChange={(e) => setWorkCategory(e.target.value)}
                    className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
                  >
                    <option value="focused">Deep Focus</option>
                    <option value="meeting">Meeting</option>
                    <option value="admin">Admin</option>
                    <option value="learning">Learning</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={logWorkSession}
                    disabled={!workTask.trim() || !workMinutes}
                    className="w-full py-2 rounded-lg font-medium text-sm transition-all bg-accent-copper/20 text-accent-copper border border-accent-copper/30 hover:bg-accent-copper/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Save Session
                  </button>
                </div>
              </GlassCard>

              {todayWork.length > 0 && (
                <GlassCard>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Today's Work</span>
                  </div>
                  <div className="space-y-2">
                    {todayWork.map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center p-2 bg-bg-secondary/40 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{w.task_name}</div>
                          <div className="text-xs text-text-tertiary">
                            {Math.round(w.total_minutes)} min · {w.category}
                          </div>
                        </div>
                        <button
                          onClick={async () => { await supabase.from('work_sessions').delete().eq('id', w.id); await refresh() }}
                          className="p-1 hover:bg-bg-secondary/60 rounded transition-colors"
                        >
                          <Trash2 size={12} className="text-text-tertiary" />
                        </button>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
