import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { useCoach } from '../hooks/useCoach'
import GlassCard from '../components/ui/GlassCard'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, X, Sparkles, TrendingUp, Calendar } from 'lucide-react'

// Apple UI System: Spring-based transitions, proper touch targets, SF Pro typography
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const springConfig = reducedMotion
  ? { duration: 0 }
  : { type: 'spring' as const, stiffness: 400, damping: 30 }
const tapWhileTap = reducedMotion ? {} : { scale: 0.97 }

export default function Coach() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.body.classList.add('reduce-motion')
      } else {
        document.body.classList.remove('reduce-motion')
      }
    }
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  const { coachCards } = useCoach()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visibleCards = coachCards.filter(c => !dismissed.has(c.id))

  const iconMap: Record<string, ReactElement> = {
    priority: <Brain className="w-5 h-5 text-accent-gold" />,
    streak_saver: <Sparkles className="w-5 h-5 text-accent-amber" />,
    meal_insight: <Sparkles className="w-5 h-5 text-accent-copper" />,
    work_pattern: <TrendingUp className="w-5 h-5 text-accent-amber" />,
    career_tip: <Sparkles className="w-5 h-5 text-accent-gold" />,
    skill_nudge: <Sparkles className="w-5 h-5 text-accent-copper" />,
    weekly_wrap: <Calendar className="w-5 h-5 text-accent-amber" />,
  }

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
      exit={reducedMotion ? {} : { opacity: 0, y: -10 }}
      transition={springConfig}
      className="p-4 pb-24 space-y-4 max-w-lg mx-auto font-apple"
    >
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white">AI Coach</h1>
        <div className="text-xs text-text-tertiary">
          {visibleCards.length} {visibleCards.length === 1 ? 'insight' : 'insights'} for you
        </div>
      </div>

      <AnimatePresence>
        {visibleCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={springConfig}
          >
            <GlassCard className="glass-luxury text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-text-secondary">All caught up! Your coach will surface new insights as your data evolves.</p>
            </GlassCard>
          </motion.div>
        ) : (
          visibleCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ ...springConfig, delay: index * 0.08 }}
            >
              <GlassCard className="glass-luxury">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{iconMap[card.type] || <Sparkles className="w-5 h-5 text-accent-gold" />}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-white">{card.title}</h3>
                      {card.dismissible && (
                        <motion.button
                          whileTap={tapWhileTap}
                          onClick={() => setDismissed(prev => new Set(prev).add(card.id))}
                          className="p-2 rounded-md hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-gold/30"
                          aria-label="Dismiss card"
                        >
                          <X size={16} className="text-text-tertiary" />
                        </motion.button>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary/80 mt-1 leading-relaxed">{card.body}</p>
                    {card.action && (
                      <motion.a
                        href={card.action.href}
                        whileTap={tapWhileTap}
                        className="inline-block mt-2 text-xs font-medium text-accent-gold transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 rounded"
                      >
                        {card.action.label} →
                      </motion.a>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {visibleCards.length > 0 && visibleCards.length < 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: visibleCards.length * 0.1 + 0.1 }}
        >
          <GlassCard className="glass-luxury text-center py-3">
            <span className="text-xs text-text-tertiary">
              Coach analyzes your data each time you log an entry. More insights coming soon.
            </span>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  )
}
