interface Props {
  xp: number
  level: number
}

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700,
  7500, 10000, 13000, 17000, 22000, 28000, 36000, 46000, 58000, 73000,
]

export default function XPBar({ xp, level }: Props) {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000
  const progress = Math.min((xp - currentThreshold) / (nextThreshold - currentThreshold), 1)
  const nextLevel = level + 1

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-neon-cyan font-bold">Level {level}</span>
        <span className="text-white/50">{xp.toLocaleString()} / {nextThreshold.toLocaleString()} XP</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #00f0ff, #b44dff)',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
          }}
        />
      </div>
      <p className="text-[10px] text-white/30">Next level: {nextLevel}</p>
    </div>
  )
}
