import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase-enhanced'
import { useAuth } from '../contexts/AuthContext'

interface UserData {
  habits: any[]
  habit_logs: any[]
  water_logs: any[]
  mood_logs: any[]
  tasks: any[]
  time_logs: any[]
  workout_logs: any[]
  quest_progress: any[]
  focus_sessions: any[]
  meal_logs: any[]
  work_sessions: any[]
  break_logs: any[]
  skill_progress: any[]
  skill_sessions: any[]
  income_logs: any[]
}

export function useData() {
  const { user } = useAuth()
  const [data, setData] = useState<UserData>({
    habits: [],
    habit_logs: [],
    water_logs: [],
    mood_logs: [],
    tasks: [],
    time_logs: [],
    workout_logs: [],
    quest_progress: [],
    focus_sessions: [],
    meal_logs: [],
    work_sessions: [],
    break_logs: [],
    skill_progress: [],
    skill_sessions: [],
    income_logs: [],
  })
  const [today, setToday] = useState(new Date().toISOString().split('T')[0])

  const fetchData = useCallback(async () => {
    if (!user) return
    const todayStr = new Date().toISOString().split('T')[0]
    setToday(todayStr)

    const queries = {
      habits: supabase.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      habit_logs: supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      water: supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      mood: supabase.from('mood_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      tasks: supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at'),
      time: supabase.from('time_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      workouts: supabase.from('workout_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      quests: supabase.from('quest_progress').select('*').eq('user_id', user.id).eq('date', todayStr),
      focus: supabase.from('focus_sessions').select('*').eq('user_id', user.id).eq('date', todayStr),
      meals: supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      work: supabase.from('work_sessions').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      breaks: supabase.from('break_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      skills: supabase.from('skill_progress').select('*').eq('user_id', user.id),
      skillSessions: supabase.from('skill_sessions').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
      income: supabase.from('income_logs').select('*').eq('user_id', user.id).eq('date', todayStr).order('created_at', { ascending: false }),
    }

    const settled = await Promise.allSettled(Object.values(queries))
    const get = (_key: string, settledIdx: number): any[] => {
      const r = settled[settledIdx]
      return r.status === 'fulfilled' ? (r.value?.data || []) : []
    }
    const failed = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed.length > 0) {
      console.warn(`[useData] ${failed.length} of ${Object.keys(queries).length} table queries failed — using partial data`)
    }

    const idx: Record<string, number> = {}
    Object.keys(queries).forEach((k, i) => { idx[k] = i })

    setData({
      habits: get('habits', idx.habits),
      habit_logs: get('habit_logs', idx.habit_logs),
      water_logs: get('water', idx.water),
      mood_logs: get('mood', idx.mood),
      tasks: get('tasks', idx.tasks),
      time_logs: get('time', idx.time),
      workout_logs: get('workouts', idx.workouts),
      quest_progress: get('quests', idx.quests),
      focus_sessions: get('focus', idx.focus),
      meal_logs: get('meals', idx.meals),
      work_sessions: get('work', idx.work),
      break_logs: get('breaks', idx.breaks),
      skill_progress: get('skills', idx.skills),
      skill_sessions: get('skillSessions', idx.skillSessions),
      income_logs: get('income', idx.income),
    })
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const todayWater = data.water_logs.reduce((sum, l) => sum + (l.amount_ml || 0), 0)
  const todayMood = data.mood_logs[0] || null
  const todayFocus = data.focus_sessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
  const completedTasks = data.tasks.filter(t => t.completed).length
  const activeHabits = data.habits.filter(h => h.active !== false).length

  return { data, today, todayWater, todayMood, todayFocus, completedTasks, activeHabits, refresh: fetchData }
}
