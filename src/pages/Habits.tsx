import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import { XP } from '../lib/constants'
import GlassCard from '../components/ui/GlassCard'
import { motion } from 'framer-motion'
import { Plus, Check, Trash2, Target } from 'lucide-react'

export default function Habits() {
  const { user, addXP } = useAuth()
  const { data, today, refresh } = useData()
  const [newHabit, setNewHabit] = useState('')
  const [newTask, setNewTask] = useState('')

  async function addHabit() {
    if (!newHabit.trim()) return
    await supabase.from('habits').insert({ user_id: user?.id, name: newHabit, active: true })
    setNewHabit('')
    await addXP(5, 'create_habit')
    await refresh()
  }

  async function toggleHabit(id: string, completed: boolean) {
    if (!completed) {
      await supabase.from('habit_logs').insert({ user_id: user?.id, habit_id: id, date: today })
      await addXP(XP.HABIT_COMPLETE, 'habit_complete')
    } else {
      await supabase.from('habit_logs').delete().eq('habit_id', id).eq('date', today)
    }
    await refresh()
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    await refresh()
  }

  async function addTask() {
    if (!newTask.trim()) return
    await supabase.from('tasks').insert({ user_id: user?.id, title: newTask })
    setNewTask('')
    await refresh()
  }

  async function toggleTask(id: string, completed: boolean) {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
    if (!completed) await addXP(XP.TASK_COMPLETE, 'task_complete')
    await refresh()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    await refresh()
  }

  const todayHabitIds = data.habit_logs.map(l => l.habit_id)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-white">Habits & Tasks</h1>

      {/* Habits */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-neon-cyan" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Daily Habits</span>
        </div>
        <div className="space-y-1">
          {data.habits.filter(h => h.active !== false).map((habit) => {
            const done = todayHabitIds.includes(habit.id)
            return (
              <div key={habit.id} className="flex items-center gap-2 group">
                <button onClick={() => toggleHabit(habit.id, done)} className={`flex-1 flex items-center gap-3 p-2 rounded-lg transition-all ${done ? 'bg-neon-green/10 line-through text-white/30' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${done ? 'bg-neon-green border-neon-green' : 'border-white/20 group-hover:border-white/40'}`}>
                    {done && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm">{habit.name}</span>
                </button>
                <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <input type="text" value={newHabit} onChange={(e) => setNewHabit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addHabit()} placeholder="New habit..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
          <button onClick={addHabit} className="px-3 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 transition-colors"><Plus size={16} /></button>
        </div>
      </GlassCard>

      {/* Tasks */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Check size={16} className="text-neon-purple" />
          <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Tasks</span>
        </div>
        <div className="space-y-1">
          {data.tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleTask(task.id, task.completed)} className={`flex-1 flex items-center gap-3 p-2 rounded-lg transition-all ${task.completed ? 'bg-neon-green/10 line-through text-white/30' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${task.completed ? 'bg-neon-green border-neon-green' : 'border-white/20'}`}>
                  {task.completed && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm">{task.title}</span>
              </button>
              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="New task..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan/50" />
          <button onClick={addTask} className="px-3 py-2 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/20 hover:bg-neon-purple/20 transition-colors"><Plus size={16} /></button>
        </div>
      </GlassCard>
    </motion.div>
  )
}
