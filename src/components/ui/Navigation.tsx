import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare2, Droplets, Dumbbell, Clock, BarChart3, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Today' },
  { path: '/habits', icon: CheckSquare2, label: 'Habits' },
  { path: '/health', icon: Droplets, label: 'Health' },
  { path: '/gym', icon: Dumbbell, label: 'Gym' },
  { path: '/time', icon: Clock, label: 'Time' },
  { path: '/analytics', icon: BarChart3, label: 'Stats' },
  { path: '/settings', icon: Settings, label: 'More' },
]

export default function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/5 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center py-2 px-1">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                active ? 'text-neon-cyan scale-110' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
