import { Plus, Minus } from 'lucide-react'

const GLASS_ML = 250
const DAILY_GOAL = 2000

interface Props {
  currentMl: number
  onAdd: (amount: number) => void
}

export default function WaterTracker({ currentMl, onAdd }: Props) {
  const progress = Math.min(currentMl / DAILY_GOAL, 1)
  const glasses = Math.floor(currentMl / GLASS_ML)
  const totalGlasses = Math.ceil(DAILY_GOAL / GLASS_ML)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Water Intake</p>
        <span className="text-sm text-white/60">{currentMl}ml / {DAILY_GOAL}ml</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #00f0ff, #0074d9)',
          }}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: totalGlasses }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-6 rounded-md flex items-center justify-center text-[10px] transition-all ${
              i < glasses ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-white/5 text-white/20 border border-white/5'
            }`}
          >
            💧
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onAdd(-GLASS_ML)} className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors text-xs">
          <Minus size={14} className="inline" /> Remove
        </button>
        <button onClick={() => onAdd(GLASS_ML)} className="flex-1 py-1.5 rounded-lg bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan transition-colors text-xs font-medium">
          <Plus size={14} className="inline" /> Add Glass
        </button>
      </div>
    </div>
  )
}
