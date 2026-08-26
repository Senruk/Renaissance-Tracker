import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  glow?: boolean
  strong?: boolean
  onClick?: () => void
}

export default function GlassCard({ children, className = '', glow = false, strong = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`${strong ? 'glass-luxury-strong' : 'glass-luxury'} p-4 ${glow ? 'shadow-luxury' : ''} ${onClick ? 'hover-lift hover-scale transition-luxury cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
