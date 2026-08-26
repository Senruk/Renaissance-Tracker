import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, CheckSquare2, Droplets, Dumbbell, BarChart3, Settings, Users } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Today' },
  { path: '/habits', icon: CheckSquare2, label: 'Habits' },
  { path: '/health', icon: Droplets, label: 'Health' },
  { path: '/gym', icon: Dumbbell, label: 'Gym' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/analytics', icon: BarChart3, label: 'Stats' },
  { path: '/settings', icon: Settings, label: 'More' },
]

export default function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-luxury-strong border-t border-white/10 safe-area-bottom backdrop-blur-sm">
      <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-luxury hover-lift ${
                active
                  ? 'bg-bg-secondary/80 accent-gold text-text-on-accent shadow-lg'
                  : 'text-text-secondary/60 hover:text-text-primary hover:bg-bg-secondary/20'
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2 : 1.5}
                className={`${active ? 'text-accent-gold' : 'text-text-tertiary'}`}
              />
              <span className="text-xs font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
