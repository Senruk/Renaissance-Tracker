import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import GlassCard from '../components/ui/GlassCard'
import { motion } from 'framer-motion'
import { Play, Square, List } from 'lucide-react'

const CATEGORIES = [
  'Coding', 'Study', 'Work', 'Exercise', 'Reading', 'Social', 'Entertainment', 'Other'
]

const DOMAINS = ['Productivity', 'Learning', 'Health', 'Leisure', 'Social', 'Chores']

export default function TimePage() {
  const { user, addXP } = useAuth()
  const { data, today, refresh } = useData()
  const [tracking, setTracking] = useState<{ category: string; startTime: Date } | null>(null)
  const [selectedDomain, setSelectedDomain] = useState('Productivity')

  function startTracking(category: string) {
    setTracking({ category, startTime: new Date() })
  }

  async function stopTracking() {
    if (!tracking) return
    const elapsed = Math.round((Date.now() - tracking.startTime.getTime()) / 60000)
    if (elapsed >= 1) {
      await supabase.from('time_logs').insert({
        user_id: user?.id,
        date: today,
        category: tracking.category,
        domain: selectedDomain,
        minutes: elapsed,
      })
      await addXP(Math.floor(elapsed / 10) * 5, 'time_tracking')
      await refresh()
    }
    setTracking(null)
  }

  const todayMinutes = data.time_logs.reduce((sum: number, l: any) => sum + (l.minutes || 0), 0)
  const categoryMinutes = data.time_logs.reduce((acc: Record<string, number>, l: any) => {
    acc[l.category] = (acc[l.category] || 0) + (l.minutes || 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white">Time Tracker</h1>

      {/* Today Summary */}
      <GlassCard>
        <div className="text-center">
          <div className="text-3xl font-bold neon-text">{todayMinutes}m</div>
          <div className="text-xs text-white/40 uppercase tracking-wider">Tracked Today</div>
        </div>
        {Object.entries(categoryMinutes).map(([cat, mins]) => (
          <div key={cat} className="flex justify-between items-center mt-2 text-sm">
            <span className="text-white/60">{cat}</span>
            <span className="text-white/40">{mins}m</span>
          </div>
        ))}
      </GlassCard>

      {/* Active Tracker */}
      {tracking && (
        <GlassCard glow>
          <div className="text-center space-y-2">
            <div className="text-xs text-white/40 uppercase tracking-wider">Tracking</div>
            <div className="text-lg font-bold text-neon-green">{tracking.category}</div>
            <div className="text-2xl font-bold text-white">
              {Math.floor((Date.now() - tracking.startTime.getTime()) / 60000)} min
            </div>
            <button onClick={stopTracking} className="px-6 py-2 rounded-lg bg-red-400/20 text-red-400 border border-red-400/30 hover:bg-red-400/30 transition-colors text-sm">
              <Square size={14} className="inline mr-1" /> Stop
            </button>
          </div>
        </GlassCard>
      )}

      {/* Domain Filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DOMAINS.map(d => (
          <button key={d} onClick={() => setSelectedDomain(d)} className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${selectedDomain === d ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-white/5 text-white/40 border border-white/5'}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => {
          const isTracking = tracking?.category === cat
          return (
            <GlassCard key={cat} onClick={() => isTracking ? stopTracking() : startTracking(cat)} className={`text-center transition-all ${isTracking ? 'border-neon-green/50 neon-glow' : ''}`}>
              <div className="text-lg font-bold text-white">{cat}</div>
              <div className="text-xs text-white/40 mt-1">{categoryMinutes[cat] || 0}m today</div>
              <div className={`mt-2 ${isTracking ? 'text-neon-green' : 'text-white/30'}`}>
                {isTracking ? <Square size={16} className="inline" /> : <Play size={16} className="inline" />}
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Recent Logs */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-2">
          <List size={14} className="text-white/40" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Today's Log</span>
        </div>
        {data.time_logs.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-2">No entries yet</p>
        ) : (
          <div className="space-y-1">
            {data.time_logs.slice(0, 10).map((log: any) => (
              <div key={log.id} className="flex justify-between text-xs text-white/50 py-1 border-b border-white/5 last:border-0">
                <span>{log.category}</span>
                <span>{log.minutes}m</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
