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
          <h1 className="text-xl font-bold text-white">
            Hey, {profile?.username || 'User'} 👋
          </h1>
          <p className="text-xs text-white/40">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold neon-text">{profile?.xp || 0}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Total XP</div>
        </div>
      </div>

      {/* XP Bar */}
      <GlassCard>
        <XPBar xp={profile?.xp || 0} level={profile?.level || 1} />
      </GlassCard>

      {/* Streak */}
      <GlassCard>
        <StreakCounter streak={profile?.streak || 0} maxStreak={profile?.max_streak || 0} streakFreeze={profile?.streak_freeze || 0} todayLogged={todayLogged} />
      </GlassCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-neon-purple">{activeHabits}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Habits</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-neon-green">{completedTasks}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Done</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-2xl font-bold text-neon-pink">{todayFocus}m</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Focus</div>
        </GlassCard>
      </div>

      {/* Mood */}
      <GlassCard>
        <MoodSelector currentMood={todayMood} onSelect={handleMoodSelect} />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={async () => { if (todayMood) await supabase.from('mood_logs').update({ note }).eq('id', todayMood.id) }}
          placeholder="Add a note..."
          className="w-full mt-2 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60 outline-none focus:border-white/10"
        />
      </GlassCard>

      {/* Water */}
      <GlassCard>
        <WaterTracker currentMl={todayWater} onAdd={handleWaterAdd} />
      </GlassCard>

      {/* Focus Timer */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-3">
          <Brain size={16} className="text-neon-purple" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Focus Timer</span>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-2">
            {Math.floor(focusSeconds / 60)}:{(focusSeconds % 60).toString().padStart(2, '0')}
          </div>
          {!focusActive ? (
            <div className="flex gap-2 justify-center">
              {[15, 25, 45].map(m => (
                <button key={m} onClick={() => setFocusMinutes(m)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${focusMinutes === m ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                  {m}m
                </button>
              ))}
              <button onClick={handleStartFocus} className="px-4 py-1 rounded-lg text-xs bg-neon-purple/20 text-neon-purple border border-neon-purple/30 font-medium hover:bg-neon-purple/30 transition-colors">
                Start
              </button>
            </div>
          ) : (
            <button onClick={() => setFocusActive(false)} className="px-4 py-1 rounded-lg text-xs bg-red-400/20 text-red-400 border border-red-400/30">
              Stop
            </button>
          )}
        </div>
      </GlassCard>

      {/* Daily Note */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-neon-cyan" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Daily Note</span>
        </div>
        <textarea
          value={dailyNote}
          onChange={(e) => setDailyNote(e.target.value)}
          placeholder="What's on your mind today?"
          className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm text-white/60 outline-none focus:border-white/10 resize-none h-20"
        />
      </GlassCard>
    </motion.div>
  )
}
