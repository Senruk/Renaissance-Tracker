import { useData } from './useData'
import { todayStr } from '../lib/supabase'

export type CoachCardType =
  | 'priority'
  | 'streak_saver'
  | 'meal_insight'
  | 'work_pattern'
  | 'career_tip'
  | 'skill_nudge'
  | 'weekly_wrap'

export interface CoachCard {
  id: string
  type: CoachCardType
  title: string
  body: string
  icon: string
  priority: number
  dismissible: boolean
  action?: { label: string; href: string }
}

function lastNdays(n: number): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function hasLoggedOn(dateStr: string, data: any): boolean {
  return Boolean(
    data.habit_logs.some((l: any) => l.date === dateStr) ||
      data.mood_logs.some((l: any) => l.date === dateStr) ||
      data.water_logs.some((l: any) => l.date === dateStr),
  )
}

export function useCoach() {
  const { data } = useData()

  const today = todayStr()
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const days: string[] = lastNdays(7)

  const cards: CoachCard[] = []

  // 1. Priority Alert — urgent health/sitting/streak issues
  const todaySitting = data.work_sessions
    .filter((w: any) => w.date === today)
    .reduce((acc: number, w: any) => acc + (w.total_minutes || 0), 0)

  const todayLogged = hasLoggedOn(today, data)

  if (!todayLogged) {
    cards.push({
      id: 'priority-no-logging',
      type: 'priority',
      title: 'Data Gap Detected',
      body: 'You haven\'t logged anything today. A quick mood check + water log keeps your streak alive.',
      icon: '⚠️',
      priority: 1,
      dismissible: true,
      action: { label: 'Log now', href: '/dashboard' },
    })
  }

  if (todaySitting > 480) {
    cards.push({
      id: 'priority-sitting',
      type: 'priority',
      title: 'Long Sitting Session',
      body: `You've been seated for ${Math.round(todaySitting / 60)} hours today. Take a break and get moving.`,
      icon: '🪑',
      priority: 2,
      dismissible: true,
      action: { label: 'Start break timer', href: '/body' },
    })
  }

  // 2. Streak Saver — about to lose a streak
  const streakHabits = data.habits.filter((h: any) => h.category !== 'health' && h.category !== 'gym')
  const missingToday = streakHabits.filter(
    (h: any) => !data.habit_logs.some((l: any) => l.habit_id === h.id && l.date === today),
  )

  if (missingToday.length > 0 && streakHabits.length > 0) {
    cards.push({
      id: 'streak-saver',
      type: 'streak_saver',
      title: 'Streak at Risk',
      body: `You might lose streak on: ${missingToday.slice(0, 3).map((h: any) => h.name).join(', ')}. Log them before midnight.`,
      icon: '🔥',
      priority: 3,
      dismissible: true,
      action: { label: 'Log habits', href: '/habits' },
    })
  }

  // 3. Meal Insight — macro imbalance detected
  const todayMeals = data.meal_logs.filter((m: any) => m.date === today)
  const totalProtein = todayMeals.reduce((acc: number, m: any) => acc + (m.protein_g || 0), 0)
  const totalCalories = todayMeals.reduce((acc: number, m: any) => acc + (m.calories || 0), 0)

  if (todayMeals.length > 0 && totalProtein < 50 && totalCalories > 1200) {
    cards.push({
      id: 'meal-insight',
      type: 'meal_insight',
      title: 'Protein Gap Detected',
      body: `Only ${Math.round(totalProtein)}g protein so far. Aim for 20-30g per meal to stay full and maintain muscle.`,
      icon: '🍽️',
      priority: 5,
      dismissible: true,
      action: { label: 'Log protein', href: '/body' },
    })
  }

  // 4. Work Pattern — sitting time pattern detected
  const yesterday = lastNdays(1)[0]
  const yesterdayWork = data.work_sessions
    .filter((w: any) => w.date === yesterday)
    .reduce((acc: number, w: any) => acc + (w.total_minutes || 0), 0)

  if (yesterdayWork > 420 && todaySitting > 0) {
    const avgWork = (yesterdayWork + todaySitting) / 2
    cards.push({
      id: 'work-pattern',
      type: 'work_pattern',
      title: 'Work Pattern Detected',
      body: `You average ${Math.round(avgWork / 60)}h seated work daily. Consider a standing desk or scheduled walking meetings.`,
      icon: '💼',
      priority: 6,
      dismissible: true,
    })
  }

  // 5. Career Tip — skill tree progress insight
  const skillSessions = data.skill_sessions.filter((s: any) => s.date === today)
  const totalSkillMinutes = skillSessions.reduce((acc: number, s: any) => acc + (s.duration_min || 0), 0)

  if (totalSkillMinutes < 25 && skillSessions.length === 0) {
    cards.push({
      id: 'career-tip',
      type: 'career_tip',
      title: 'Skill Building Opportunity',
      body: 'You haven\'t logged any career skill practice today. Just 25 minutes of focused coding or sales practice accelerates your growth.',
      icon: '🎯',
      priority: 8,
      dismissible: true,
      action: { label: 'Start learning', href: '/career' },
    })
  }

  // 6. Skill Nudge — learning gap detected
  if (totalSkillMinutes > 0 && data.skill_progress.length > 0) {
    const currentSkills = data.skill_progress.map((s: any) => s.skill_id)
    const practicedToday = new Set(skillSessions.map((s: any) => s.skill_id))
    const neglected = currentSkills.filter((sid: string) => !practicedToday.has(sid))

    if (neglected.length > 0 && totalSkillMinutes < 60) {
      cards.push({
        id: 'skill-nudge',
        type: 'skill_nudge',
        title: 'Learning Gap',
        body: 'You\'re focusing on one skill area. Diversifying practice improves retention by 40%.',
        icon: '📚',
        priority: 9,
        dismissible: true,
        action: { label: 'See skill trees', href: '/career' },
      })
    }
  }

  // 7. Weekly Wrap — end of week summary (Sunday evening)
  const isSundayEvening = dayOfWeek === 0 && now.getHours() >= 18

  if (isSundayEvening) {
    const weekLogs = days.filter((d) => hasLoggedOn(d, data))
    const completionRate = Math.round((weekLogs.length / 7) * 100)
    const totalWorkMinutes = days.reduce((acc, d) => {
      return acc + data.work_sessions.filter((w: any) => w.date === d).reduce((sum: number, w: any) => sum + (w.total_minutes || 0), 0)
    }, 0)

    cards.push({
      id: 'weekly-wrap',
      type: 'weekly_wrap',
      title: 'Weekly Wrap',
      body: `${weekLogs.length}/7 days logged (${completionRate}%). ${Math.round(totalWorkMinutes / 60)}h of work tracked. Ready for next week?`,
      icon: '📊',
      priority: 10,
      dismissible: true,
      action: { label: 'View analytics', href: '/analytics' },
    })
  }

  // Sort by priority and cap at 5
  const sorted = [...cards].sort((a, b) => a.priority - b.priority).slice(0, 5)

  return { coachCards: sorted }
}
