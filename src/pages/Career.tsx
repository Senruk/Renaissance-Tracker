import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../hooks/useData'
import { supabase } from '../lib/supabase-enhanced'
import GlassCard from '../components/ui/GlassCard'
import { motion } from 'framer-motion'
import { Code, Briefcase, DollarSign, BookOpen, TrendingUp, Play, Pause, Plus } from 'lucide-react'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const springConfig = reducedMotion
  ? { duration: 0 }
  : { type: 'spring' as const, stiffness: 400, damping: 30 }
const tapWhileTap = reducedMotion ? {} : { scale: 0.97 }

export type SkillCategory = 'coding' | 'sales' | 'content' | 'trades' | 'marketing'

interface Skill {
  id: string
  name: string
  category: SkillCategory
  description: string
  xp: number
  level: number
  icon: React.ReactElement
}

const SKILLS: Skill[] = [
  { id: 'javascript', name: 'JavaScript', category: 'coding', description: 'Core language fluency', xp: 0, level: 1, icon: <Code size={16} /> },
  { id: 'typescript', name: 'TypeScript', category: 'coding', description: 'Typed JavaScript for production', xp: 0, level: 1, icon: <Code size={16} /> },
  { id: 'react', name: 'React', category: 'coding', description: 'Component-based UI library', xp: 0, level: 1, icon: <Code size={16} /> },
  { id: 'nodejs', name: 'Node.js', category: 'coding', description: 'Server-side JavaScript', xp: 0, level: 1, icon: <Code size={16} /> },
  { id: 'python', name: 'Python', category: 'coding', description: 'Versatile programming language', xp: 0, level: 1, icon: <Code size={16} /> },
  { id: 'ai-ml', name: 'AI/ML', category: 'coding', description: 'Machine learning & LLM integration', xp: 0, level: 1, icon: <Code size={16} /> },

  { id: 'prospecting', name: 'Prospecting', category: 'sales', description: 'Finding and qualifying leads', xp: 0, level: 1, icon: <Briefcase size={16} /> },
  { id: 'negotiation', name: 'Negotiation', category: 'sales', description: 'Closing deals and managing objections', xp: 0, level: 1, icon: <Briefcase size={16} /> },
  { id: 'copywriting', name: 'Copywriting', category: 'sales', description: 'Persuasive writing for conversions', xp: 0, level: 1, icon: <Briefcase size={16} /> },
  { id: 'client-mgmt', name: 'Client Relations', category: 'sales', description: 'Managing client expectations', xp: 0, level: 1, icon: <Briefcase size={16} /> },

  { id: 'video-editing', name: 'Video Editing', category: 'content', description: 'Cutting and producing video content', xp: 0, level: 1, icon: <BookOpen size={16} /> },
  { id: 'graphic-design', name: 'Graphic Design', category: 'content', description: 'Visual branding and layouts', xp: 0, level: 1, icon: <BookOpen size={16} /> },
  { id: 'storytelling', name: 'Storytelling', category: 'content', description: 'Crafting compelling narratives', xp: 0, level: 1, icon: <BookOpen size={16} /> },

  { id: 'plumbing', name: 'Plumbing', category: 'trades', description: 'Pipe systems and fixtures', xp: 0, level: 1, icon: <TrendingUp size={16} /> },
  { id: 'electrical', name: 'Electrical', category: 'trades', description: 'Wiring and electrical systems', xp: 0, level: 1, icon: <TrendingUp size={16} /> },
  { id: 'carpentry', name: 'Carpentry', category: 'trades', description: 'Woodwork and construction', xp: 0, level: 1, icon: <TrendingUp size={16} /> },

  { id: 'seo', name: 'SEO', category: 'marketing', description: 'Search engine optimization', xp: 0, level: 1, icon: <TrendingUp size={16} /> },
  { id: 'ads', name: 'Paid Ads', category: 'marketing', description: 'Facebook/Google ad campaigns', xp: 0, level: 1, icon: <TrendingUp size={16} /> },
  { id: 'social-media', name: 'Social Media', category: 'marketing', description: 'Content strategy and posting', xp: 0, level: 1, icon: <TrendingUp size={16} /> },
  { id: 'email-marketing', name: 'Email Marketing', category: 'marketing', description: 'Campaign design and automation', xp: 0, level: 1, icon: <TrendingUp size={16} /> },
]

const XP_PER_LEVEL = 100

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  coding: 'Coding & Engineering',
  sales: 'Sales & Client Work',
  content: 'Content Creation',
  trades: 'Trades & Construction',
  marketing: 'Digital Marketing',
}

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  coding: 'text-accent-cyan',
  sales: 'text-accent-amber',
  content: 'text-accent-pink',
  trades: 'text-accent-copper',
  marketing: 'text-accent-gold',
}

export default function Career() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      document.body.classList.toggle('reduce-motion', e.matches)
    }
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  const { user, addXP } = useAuth()
  const { data, today, refresh } = useData()
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('coding')
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60)
  const [timerLabel, setTimerLabel] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeSource, setIncomeSource] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Merge skills with progress data
  const skillsWithProgress = SKILLS.map(skill => {
    const prog = data.skill_progress.find((p: any) => p.skill_id === skill.id)
    const sessionsToday = data.skill_sessions.filter(
      (s: any) => s.skill_id === skill.id && s.date === today,
    )
    const todayMinutes = sessionsToday.reduce((acc: number, s: any) => acc + (s.duration_min || 0), 0)

    return {
      ...skill,
      xp: prog?.xp || 0,
      level: prog?.level || 1,
      todayMinutes,
    }
  })

  const categorySkills = skillsWithProgress.filter(s => s.category === activeCategory)
  const totalXp = skillsWithProgress.reduce((acc, s) => acc + s.xp, 0)

  // Timer logic
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      intervalRef.current = setInterval(() => setTimerSeconds(s => s - 1), 1000)
    } else if (timerActive && timerSeconds <= 0 && intervalRef.current) {
      clearInterval(intervalRef.current)
      setTimerActive(false)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerActive, timerSeconds])

  function startTimer() {
    if (!timerLabel.trim()) return
    setTimerActive(true)
  }

  function pauseTimer() {
    setTimerActive(false)
  }

  function resetTimer() {
    setTimerActive(false)
    setTimerSeconds(25 * 60)
    setTimerLabel('')
  }

  async function stopAndLogTimer() {
    if (!timerLabel.trim()) return
    const minutes = Math.ceil((25 * 60 - timerSeconds) / 60)
    if (minutes <= 0) return

    await supabase.from('skill_sessions').insert({
      user_id: user?.id,
      date: today,
      skill_id: 'custom',
      skill_name: timerLabel,
      duration_min: minutes,
    })
    addXP(20 + minutes, 'skill_session')
    resetTimer()
    await refresh()
  }

  async function logIncome() {
    if (!incomeAmount || !incomeSource) return
    await supabase.from('income_logs').insert({
      user_id: user?.id,
      date: today,
      amount: parseFloat(incomeAmount),
      source: incomeSource,
    })
    setIncomeAmount('')
    setIncomeSource('')
    await refresh()
  }

  const todayIncome = data.income_logs.filter((l: any) => l.date === today)
  const totalIncome = todayIncome.reduce((acc: number, l: any) => acc + (l.amount || 0), 0)

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const CATEGORIES: SkillCategory[] = ['coding', 'sales', 'content', 'trades', 'marketing']

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
      exit={reducedMotion ? {} : { opacity: 0, y: -10 }}
      transition={springConfig}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-white">Career</h1>
        <div className="text-xs text-text-tertiary">
          Total XP: <span className="text-accent-gold font-medium">{totalXp}</span>
        </div>
      </div>

      {/* Category Switcher */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 rubber-band-scroll">
        {CATEGORIES.map(cat => (
          <motion.button
            key={cat}
            whileTap={activeCategory === cat ? {} : tapWhileTap}
            onClick={() => setActiveCategory(cat)}
            className={`touch-target flex-1 min-w-[100px] py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40'
            }} focus:outline-none focus:ring-2 focus:ring-accent-gold/30`}
            aria-label={CATEGORY_LABELS[cat]}
          >
            {CATEGORY_LABELS[cat].split(' ')[0]}
          </motion.button>
        ))}
      </div>

      {/* Skill Tree */}
      <div className="space-y-2 mb-4">
        <h2 className={`text-sm font-medium ${CATEGORY_COLORS[activeCategory]}`}>
          {CATEGORY_LABELS[activeCategory]}
        </h2>
        {categorySkills.map(skill => {
          const xpForNext = skill.xp % XP_PER_LEVEL
          const progressPct = (xpForNext / XP_PER_LEVEL) * 100

          return (
            <GlassCard key={skill.id} className="glass-luxury">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-accent-gold">{skill.icon}</div>
                  <div>
                    <div className="text-sm font-medium text-white">{skill.name}</div>
                    <div className="text-[10px] text-text-tertiary">{skill.description}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-text-secondary">
                    {progressPct >= 100
                      ? `Level ${(skill.level || 1) + 1}`
                      : `${xpForNext}/${XP_PER_LEVEL} XP`}
                  </div>
                  <div className="w-16 h-1 bg-bg-secondary/40 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-accent-gold/50 rounded-full transition-all"
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Learning Timer */}
      <GlassCard className="glass-luxury">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-accent-amber" />
          <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Learning Session</span>
        </div>

        {!timerActive && !timerLabel && (
          <div className="space-y-3">
            <input
              type="text" value={timerLabel} onChange={(e) => setTimerLabel(e.target.value)}
              placeholder="What are you learning? (e.g. React, Sales Calls)"
              className="w-full bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
            />
            {timerLabel && (
              <button
                onClick={startTimer}
                className="w-full py-2 rounded-lg font-medium text-sm transition-all bg-accent-amber/20 text-accent-amber border border-accent-amber/30 hover:bg-accent-amber/30"
              >
                <Play size={14} className="inline mr-1" /> Start 25-min session
              </button>
            )}
          </div>
        )}

        {(timerActive || timerLabel) && (
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-3">{formatTime(timerSeconds)}</div>
            <div className="flex justify-center gap-2">
              {!timerActive ? (
                <button
                  onClick={startTimer}
                  className="px-4 py-2 rounded-lg bg-accent-amber/20 text-accent-amber border border-accent-amber/30 hover:bg-accent-amber/30 text-sm"
                >
                  <Play size={14} className="inline mr-1" /> Resume
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="px-4 py-2 rounded-lg bg-bg-secondary/40 text-text-secondary border border-white/10 hover:bg-bg-secondary/60 text-sm"
                >
                  <Pause size={14} className="inline mr-1" /> Pause
                </button>
              )}
              <button
                onClick={stopAndLogTimer}
                className="px-4 py-2 rounded-lg bg-accent-copper/20 text-accent-copper border border-accent-copper/30 hover:bg-accent-copper/30 text-sm"
              >
                Stop & Log
              </button>
              <button
                onClick={resetTimer}
                className="px-4 py-2 rounded-lg bg-bg-secondary/40 text-text-tertiary hover:bg-bg-secondary/60 text-sm"
              >
                Reset
              </button>
            </div>
            {timerLabel && <div className="text-xs text-text-tertiary mt-2">Learning: {timerLabel}</div>}
          </div>
        )}
      </GlassCard>

      {/* Income Tracker */}
      <GlassCard className="glass-luxury">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-accent-gold" />
          <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Income</span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)}
              placeholder="Amount (£)"
              className="bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
            />
            <input
              type="text" value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)}
              placeholder="Source"
              className="bg-bg-secondary/80 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent-gold/50"
            />
          </div>
          <button
            onClick={logIncome}
            disabled={!incomeAmount || !incomeSource}
            className="w-full py-2 rounded-lg font-medium text-sm transition-all bg-accent-gold/20 text-accent-gold border border-accent-gold/30 hover:bg-accent-gold/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} className="inline mr-1" /> Log Income
          </button>
        </div>

        {todayIncome.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Today</div>
            <div className="space-y-1">
              {todayIncome.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">{l.source}</span>
                  <span className="text-accent-gold font-medium">£{l.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t border-white/10 pt-1 mt-1">
                <span className="text-text-primary font-medium">Total Today</span>
                <span className="text-accent-gold font-bold">£{totalIncome.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
