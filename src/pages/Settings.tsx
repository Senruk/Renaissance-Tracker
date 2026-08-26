import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase-enhanced'
import GlassCard from '../components/ui/GlassCard'
import { motion } from 'framer-motion'
import { LogOut, User, Palette, Shield, Trash2 } from 'lucide-react'

const THEMES = [
  { id: 'renaissance', label: 'Renaissance', colors: ['#00f0ff', '#b44dff'] },
  { id: 'midnight', label: 'Midnight', colors: ['#4a90d9', '#1a1a3e'] },
  { id: 'emerald', label: 'Emerald', colors: ['#00ff88', '#004d40'] },
  { id: 'royal', label: 'Royal', colors: ['#ffd700', '#800080'] },
]

export default function Settings() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(profile?.username || '')
  const [currentTheme, setCurrentTheme] = useState('renaissance')

  async function saveUsername() {
    if (username.trim()) {
      await updateProfile({ username: username.trim() })
      setEditing(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure? This will delete all your data.')) return
    if (!confirm('This cannot be undone. Continue?')) return
    // Clear all local data for the user
    const tables = ['profiles', 'habits', 'habit_logs', 'water_logs', 'mood_logs',
      'tasks', 'time_logs', 'workout_logs', 'health_logs', 'quest_progress',
      'focus_sessions', 'leads', 'call_logs', 'xp_logs']
    for (const t of tables) {
      await supabase.from(t).delete().eq('user_id', user?.id)
    }
    await supabase.from('profiles').delete().eq('id', user?.id)
    await signOut()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Profile */}
      <GlassCard>
        <div className="flex items-center gap-3 mb-3">
          <User size={16} className="text-neon-cyan" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Profile</span>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" autoFocus />
            <button onClick={saveUsername} className="px-3 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan text-sm border border-neon-cyan/20">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg bg-white/5 text-white/40 text-sm border border-white/10">Cancel</button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div>
              <div className="text-white font-medium">{profile?.username || 'User'}</div>
              <div className="text-xs text-white/40">{user?.email}</div>
            </div>
            <button onClick={() => { setUsername(profile?.username || ''); setEditing(true) }} className="text-xs text-neon-cyan hover:underline">Edit</button>
          </div>
        )}
      </GlassCard>

      {/* Theme */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-neon-purple" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Theme</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setCurrentTheme(theme.id)}
              className={`p-3 rounded-lg border transition-all ${currentTheme === theme.id ? 'border-white/30 bg-white/10' : 'border-white/5 bg-white/5'}`}
            >
              <div className="flex gap-1 mb-1">
                {theme.colors.map((color, i) => (
                  <div key={i} className="w-4 h-4 rounded-full" style={{ background: color }} />
                ))}
              </div>
              <div className="text-xs text-white/60">{theme.label}</div>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Account */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-white/40" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Account</span>
        </div>
        <div className="space-y-2">
          <button onClick={signOut} className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
          <button onClick={handleDeleteAccount} className="w-full flex items-center gap-2 p-2 rounded-lg bg-red-400/5 hover:bg-red-400/10 text-red-400/70 text-sm transition-colors">
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      </GlassCard>

      <p className="text-center text-[10px] text-white/20">Renaissance v1.0 — Public Edition</p>
    </motion.div>
  )
}
