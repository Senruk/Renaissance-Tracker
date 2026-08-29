import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase'
import GlassCard from '../components/ui/GlassCard'
import XPBar from '../components/dashboard/XPBar'
import StreakCounter from '../components/dashboard/StreakCounter'
import MoodSelector from '../components/dashboard/MoodSelector'
import WaterTracker from '../components/dashboard/WaterTracker'
import { XP } from '../lib/constants'
import { Sparkles, Brain } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const { user, profile, addXP } = useAuth()
  const { data, today, todayWater, todayMood, todayFocus, completedTasks, activeHabits, refresh } = useData()
  const [note, setNote] = useState(todayMood?.note || '')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [focusActive, setFocusActive] = useState(false)
  const [focusSeconds, setFocusSeconds] = useState(25 * 60)
  const [dailyNote, setDailyNote] = useState('')

  useEffect(() => {
    if (todayMood?.note) setNote(todayMood.note)
  }, [todayMood])

  // Focus timer logic
  useEffect(() => {
    let interval: any
    if (focusActive && focusSeconds > 0) {
      interval = setInterval(() => setFocusSeconds(s => s - 1), 1000)
    } else if (focusActive && focusSeconds <= 0) {
      setFocusActive(false)
      addXP(XP.FOCUS_SESSION, 'focus_session')
    }
    return () => clearInterval(interval)
  }, [focusActive, focusSeconds])

  async function handleMoodSelect(value: number) {
    if (todayMood) {
      await supabase.from('mood_logs').update({ mood_score: value, note }).eq('id', todayMood.id)
    } else {
      await supabase.from('mood_logs').insert({ user_id: user?.id, date: today, mood_score: value, note })
      await addXP(XP.MOOD_LOG, 'mood_log')
    }
    await refresh()
  }

  async function handleWaterAdd(amount: number) {
    if (amount > 0) {
      await supabase.from('water_logs').insert({ user_id: user?.id, date: today, amount_ml: amount })
      if (todayWater + amount >= 2000) await addXP(XP.WATER_GOAL, 'water_goal')
    } else {
      const last = data.water_logs[data.water_logs.length - 1]
      if (last) await supabase.from('water_logs').delete().eq('id', last.id)
    }
    await refresh()
  }

  function handleStartFocus() {
    setFocusSeconds(focusMinutes * 60)
    setFocusActive(true)
  }

  const todayLogged = data.habits.length > 0 || todayWater > 0 || todayMood || data.tasks.some(t => t.completed)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Hey, {profile?.username || 'User'} 👋
          </h1>
          <p className="text-xs text-text-secondary/60">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-accent-gold">{profile?.xp || 0}</div>
          <div className="text-[10px] text-text-secondary/60 uppercase tracking-wider">Total XP</div>
        </div>
      </div>

      {/* XP Bar */}
      <GlassCard className="glass-luxury">
        <XPBar xp={profile?.xp || 0} level={profile?.level || 1} />
      </GlassCard>

      {/* Streak */}
      <GlassCard className="glass-luxury">
        <StreakCounter streak={profile?.streak || 0} maxStreak={profile?.max_streak || 0} streakFreeze={profile?.streak_freeze || 0} todayLogged={todayLogged} />
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="glass-luxury text-center">
          <div className="text-2xl font-bold text-accent-amber">{activeHabits}</div>
          <div className="text-[10px] text-text-secondary/60 uppercase tracking-wider">Habits</div>
        </GlassCard>
        <GlassCard className="glass-luxury text-center">
          <div className="text-2xl font-bold text-accent-copper">{completedTasks}</div>
          <div className="text-[10px] text-text-secondary/60 uppercase tracking-wider">Done</div>
        </GlassCard>
        <GlassCard className="glass-luxury text-center">
          <div className="text-2xl font-bold text-text-primary">{todayFocus}m</div>
          <div className="text-[10px] text-text-secondary/60 uppercase tracking-wider">Focus</div>
        </GlassCard>
      </div>

      {/* Mood */}
      <GlassCard className="glass-luxury">
        <MoodSelector currentMood={todayMood} onSelect={handleMoodSelect} />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={async () => { if (todayMood) { await supabase.from('mood_logs').update({ note }).eq('id', todayMood.id); await refresh() } }}
          placeholder="Add a note..."
          className="w-full mt-4 bg-bg-secondary/80 border border-white/10 rounded-lg px-4 py-2 text-text-primary/90 outline-none focus:border-white/20 focus:ring-2 focus:ring-accent-gold/20"
        />
      </GlassCard>

      {/* Water */}
      <GlassCard className="glass-luxury">
        <WaterTracker currentMl={todayWater} onAdd={handleWaterAdd} />
      </GlassCard>

      {/* Focus Timer */}
      <GlassCard className="glass-luxury">
        <div className="flex items-center gap-3 mb-3">
          <Brain size={16} className="text-accent-amber" />
          <span className="text-xs font-medium text-text-secondary/60 uppercase tracking-wider">Focus Timer</span>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-text-primary mb-3">
            {Math.floor(focusSeconds / 60)}:{(focusSeconds % 60).toString().padStart(2, '0')}
          </div>
          {!focusActive ? (
            <div className="flex gap-3 justify-center">
              {[15, 25, 45].map(m => (
                <button key={m} onClick={() => setFocusMinutes(m)} className={`px-4 py-2 rounded-lg text-text-secondary/60 transition-colors hover:bg-bg-secondary/20 ${focusMinutes === m ? 'bg-bg-secondary/60 text-text-primary' : 'hover:text-text-primary'}`}>
                  {m}m
                </button>
              ))}
              <button onClick={handleStartFocus} className="px-4 py-2 rounded-lg bg-accent-gold/20 text-accent-gold border border-accent-gold/30 font-medium hover:bg-accent-gold/30 transition-colors hover-lift">
                Start
              </button>
            </div>
          ) : (
            <button onClick={() => setFocusActive(false)} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 transition-colors hover-lift">
              Stop
            </button>
          )}
        </div>
      </GlassCard>

      {/* Daily Note */}
      <GlassCard className="glass-luxury">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-accent-gold" />
          <span className="text-xs font-medium text-text-secondary/60 uppercase tracking-wider">Daily Note</span>
        </div>
        <textarea
          value={dailyNote}
          onChange={(e) => setDailyNote(e.target.value)}
          placeholder="What's on your mind today?"
          className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-4 py-2 text-text-primary/90 outline-none focus:border-white/20 focus:ring-2 focus:ring-accent-gold/20 resize-none h-24"
        />
      </GlassCard>
    </motion.div>
  )
}
