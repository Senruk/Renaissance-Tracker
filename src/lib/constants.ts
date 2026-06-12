export const XP = {
  TASK_COMPLETE: 10,
  HABIT_COMPLETE: 15,
  WATER_GOAL: 5,
  MOOD_LOG: 3,
  STREAK_BONUS: 20,
  QUEST_COMPLETE: 50,
  FOCUS_SESSION: 30,
  WORKOUT_LOG: 25,
  DAILY_LOGIN: 5,
} as const

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700,
  7500, 10000, 13000, 17000, 22000, 28000, 36000, 46000, 58000, 73000,
]

export const WATER_DAILY_GOAL_ML = 2000

export const MOOD_OPTIONS = [
  { emoji: '😡', label: 'Awful', value: 1 },
  { emoji: '😟', label: 'Bad', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😄', label: 'Great', value: 5 },
]

export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', color: '#ff4136' },
  { id: 'back', label: 'Back', color: '#ff851b' },
  { id: 'shoulders', label: 'Shoulders', color: '#ffdc00' },
  { id: 'biceps', label: 'Biceps', color: '#2ecc40' },
  { id: 'triceps', label: 'Triceps', color: '#39cccc' },
  { id: 'forearms', label: 'Forearms', color: '#0074d9' },
  { id: 'abs', label: 'Core / Abs', color: '#b10dc9' },
  { id: 'quads', label: 'Quads', color: '#f012be' },
  { id: 'hamstrings', label: 'Hamstrings', color: '#01ff70' },
  { id: 'glutes', label: 'Glutes', color: '#ff4136' },
  { id: 'calves', label: 'Calves', color: '#85144b' },
]

export const DAILY_QUESTS = [
  { id: 'water', label: 'Drink 8 glasses of water', target: 8, unit: 'glasses' },
  { id: 'steps', label: 'Walk 5,000 steps', target: 5000, unit: 'steps' },
  { id: 'mood', label: 'Log your mood', target: 1, unit: 'time' },
  { id: 'habits', label: 'Complete 5 habits', target: 5, unit: 'habits' },
  { id: 'tasks', label: 'Finish 3 tasks', target: 3, unit: 'tasks' },
  { id: 'focus', label: '30 min focus session', target: 30, unit: 'min' },
  { id: 'workout', label: 'Log a workout', target: 1, unit: 'workout' },
  { id: 'reflection', label: 'Write a reflection', target: 1, unit: 'entry' },
]

export const BADGES = [
  { id: 'first_habit', label: 'First Habit', desc: 'Complete your first habit', icon: '🌱' },
  { id: 'week_streak', label: 'Week Warrior', desc: '7-day streak', icon: '🔥' },
  { id: 'month_streak', label: 'Unstoppable', desc: '30-day streak', icon: '💎' },
  { id: 'water_master', label: 'Hydration King', desc: 'Hit water goal 7 days straight', icon: '💧' },
  { id: 'mood_logger', label: 'Self Aware', desc: 'Log mood for 7 days', icon: '🧠' },
  { id: 'task_killer', label: 'Task Slayer', desc: 'Complete 50 tasks', icon: '⚔️' },
  { id: 'xp_1000', label: 'Rising Star', desc: 'Earn 1000 XP', icon: '⭐' },
  { id: 'xp_5000', label: 'Elite', desc: 'Earn 5000 XP', icon: '👑' },
  { id: 'gym_newbie', label: 'Gym Newbie', desc: 'Log first workout', icon: '🏋️' },
  { id: 'gym_dedicated', label: 'Dedicated', desc: '10 workouts logged', icon: '💪' },
  { id: 'focus_frog', label: 'Focused', desc: '5 focus sessions', icon: '🐸' },
  { id: 'early_bird', label: 'Early Bird', desc: 'Log in before 7am', icon: '🐦' },
  { id: 'night_owl', label: 'Night Owl', desc: 'Log in after 11pm', icon: '🦉' },
  { id: 'quest_hero', label: 'Quest Hero', desc: 'Complete 10 daily quests', icon: '🦸' },
  { id: 'all_rounder', label: 'All-Rounder', desc: 'Use every feature in one day', icon: '🏆' },
]
