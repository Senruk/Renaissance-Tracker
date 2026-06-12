import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  glow?: boolean
  onClick?: () => void
}

export default function GlassCard({ children, className = '', glow = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`glass p-4 ${glow ? 'neon-glow' : ''} ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
