const MOODS = [
  { emoji: '😡', label: 'Awful', value: 1 },
  { emoji: '😟', label: 'Bad', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😄', label: 'Great', value: 5 },
]

interface Props {
  currentMood?: { mood_score: number; note?: string } | null
  onSelect: (value: number) => void
}

export default function MoodSelector({ currentMood, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40 uppercase tracking-wider font-medium">How are you feeling?</p>
      <div className="flex gap-2">
        {MOODS.map((m) => {
          const selected = currentMood?.mood_score === m.value
          return (
            <button
              key={m.value}
              onClick={() => onSelect(m.value)}
              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                selected
                  ? 'bg-neon-cyan/20 border border-neon-cyan/50 scale-110'
                  : 'bg-white/5 border border-white/5 hover:bg-white/10'
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className={`text-[10px] ${selected ? 'text-neon-cyan' : 'text-white/40'}`}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
