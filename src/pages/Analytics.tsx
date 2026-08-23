import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase'
import GlassCard from '../components/ui/GlassCard'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Calendar, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { BADGES } from '../lib/constants'

export default function Analytics() {
  const { profile, user } = useAuth()
  const { todayWater, todayMood, completedTasks, todayFocus } = useData()

  const [weeklyWater, setWeeklyWater] = useState<{ day: string; ml: number }[]>([])
  const [weeklyMood, setWeeklyMood] = useState<{ day: string; mood: number }[]>([])
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  useEffect(() => {
    if (!user) return
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    supabase.from('water_logs')
      .select('date, amount_ml')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .then(({ data }) => {
        const grouped: Record<string, number> = {}
        data?.forEach((l: any) => { grouped[l.date] = (grouped[l.date] || 0) + l.amount_ml })
        const days = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          const key = d.toISOString().split('T')[0]
          const idx = d.getDay()
          days.push({ day: DAYS[idx], ml: grouped[key] || 0 })
        }
        setWeeklyWater(days)
      })

    supabase.from('mood_logs')
      .select('date, mood_score')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .then(({ data }) => {
        const byDate: Record<string, number[]> = {}
        data?.forEach((l: any) => {
          if (!byDate[l.date]) byDate[l.date] = []
          byDate[l.date].push(l.mood_score)
        })
        const days = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          const key = d.toISOString().split('T')[0]
          const idx = d.getDay()
          const scores = byDate[key]
          const avg = scores ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
          days.push({ day: DAYS[idx], mood: avg || 3 })
        }
        setWeeklyMood(days)
      })
  }, [user])

  const earnedBadges = BADGES.slice(0, Math.min(profile?.level || 1, BADGES.length))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white">Analytics</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={14} className="text-neon-cyan" />
            <span className="text-xs text-white/40">Streak</span>
          </div>
          <div className="text-2xl font-bold neon-text">{profile?.streak || 0} days</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={14} className="text-neon-green" />
            <span className="text-xs text-white/40">Level</span>
          </div>
          <div className="text-2xl font-bold text-neon-green">{profile?.level || 1}</div>
        </GlassCard>
      </div>

      {/* Weekly Water Chart */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-neon-cyan" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Weekly Water (ml)</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyWater}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgba(15,15,35,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="ml" fill="#00f0ff" radius={[4, 4, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Weekly Mood Chart */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-neon-purple" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Weekly Mood</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyMood}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis domain={[1, 5]} stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgba(15,15,35,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="mood" stroke="#b44dff" strokeWidth={2} dot={{ fill: '#b44dff', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Badges */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Award size={14} className="text-gold" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Badges</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {earnedBadges.map((badge) => (
            <div key={badge.id} className="text-center p-2 rounded-lg bg-white/5">
              <div className="text-2xl">{badge.icon}</div>
              <div className="text-[9px] text-white/40 mt-1 leading-tight">{badge.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Today's Summary */}
      <GlassCard>
        <div className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Today's Summary</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between"><span className="text-white/40">Water</span><span className="text-white/70">{todayWater}ml</span></div>
          <div className="flex justify-between"><span className="text-white/40">Mood</span><span className="text-white/70">{todayMood?.mood_score || '-'}/5</span></div>
          <div className="flex justify-between"><span className="text-white/40">Tasks Done</span><span className="text-white/70">{completedTasks}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Focus</span><span className="text-white/70">{todayFocus}m</span></div>
        </div>
      </GlassCard>
    </motion.div>
  )
}
