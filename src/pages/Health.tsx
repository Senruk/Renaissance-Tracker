import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import { XP } from '../lib/constants'
import GlassCard from '../components/ui/GlassCard'
import WaterTracker from '../components/dashboard/WaterTracker'
import MoodSelector from '../components/dashboard/MoodSelector'
import { motion } from 'framer-motion'
import { Heart, Activity, Moon, TrendingUp } from 'lucide-react'

export default function Health() {
  const { user, addXP } = useAuth()
  const { data, today, todayWater, todayMood, refresh } = useData()
  const [weight, setWeight] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [steps, setSteps] = useState('')

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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white">Health</h1>

      <GlassCard>
        <WaterTracker currentMl={todayWater} onAdd={handleWaterAdd} />
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Heart size={16} className="text-neon-pink" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Mood</span>
        </div>
        <MoodSelector currentMood={todayMood} onSelect={handleMoodSelect} />
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-neon-green" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Steps</span>
        </div>
        <div className="flex gap-2">
          <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="Steps today" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
          <button onClick={() => steps && logHealthMetric('steps', parseInt(steps))} className="px-4 py-2 rounded-lg bg-neon-green/10 text-neon-green text-sm border border-neon-green/20 hover:bg-neon-green/20 transition-colors">Log</button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Moon size={16} className="text-neon-cyan" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Sleep</span>
        </div>
        <div className="flex gap-2">
          <input type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="Hours slept" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
          <button onClick={() => sleepHours && logHealthMetric('sleep', parseFloat(sleepHours))} className="px-4 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan text-sm border border-neon-cyan/20 hover:bg-neon-cyan/20 transition-colors">Log</button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-neon-purple" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Weight</span>
        </div>
        <div className="flex gap-2">
          <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
          <button onClick={() => weight && logHealthMetric('weight', parseFloat(weight))} className="px-4 py-2 rounded-lg bg-neon-purple/10 text-neon-purple text-sm border border-neon-purple/20 hover:bg-neon-purple/20 transition-colors">Log</button>
        </div>
      </GlassCard>
    </motion.div>
  )
}
