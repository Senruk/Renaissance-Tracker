interface Props {
  streak: number
  maxStreak: number
  streakFreeze: number
  todayLogged: boolean
}

export default function StreakCounter({ streak, maxStreak, streakFreeze, todayLogged }: Props) {
  return (
    <div className="flex gap-4 items-center">
      <div className="text-center">
        <div className="text-3xl font-bold neon-text">{streak}</div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">Day Streak</div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div className="text-center">
        <div className="text-lg font-bold text-white/60">{maxStreak}</div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">Best</div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div className="text-center">
        <div className="text-lg font-bold text-white/60">❄️ {streakFreeze}</div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">Freezes</div>
      </div>
      <div className="ml-auto">
        <div className={`text-2xl ${todayLogged ? 'text-neon-green' : 'text-white/20'}`}>
          {todayLogged ? '✅' : '○'}
        </div>
        <div className="text-[10px] text-white/40 uppercase tracking-wider">Today</div>
      </div>
    </div>
  )
}
