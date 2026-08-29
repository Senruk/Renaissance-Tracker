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

    const [habits, habit_logs, water, mood, tasks, time, workouts, quests, focus, meals, work, breaks, skills, skillSessions, income] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('mood_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('time_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('workout_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
      supabase.from('quest_progress').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('focus_sessions').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('work_sessions').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('break_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('skill_progress').select('*').eq('user_id', user.id),
      supabase.from('skill_sessions').select('*').eq('user_id', user.id).eq('date', todayStr),
      supabase.from('income_logs').select('*').eq('user_id', user.id).eq('date', todayStr),
    ])

    setData({
      habits: habits.data || [],
      habit_logs: habit_logs.data || [],
      water_logs: water.data || [],
      mood_logs: mood.data || [],
      tasks: tasks.data || [],
      time_logs: time.data || [],
      workout_logs: workouts.data || [],
      quest_progress: quests.data || [],
      focus_sessions: focus.data || [],
      meal_logs: meals.data || [],
      work_sessions: work.data || [],
      break_logs: breaks.data || [],
      skill_progress: skills.data || [],
      skill_sessions: skillSessions.data || [],
      income_logs: income.data || [],
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
