import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  change?: number
  color?: string
  icon?: string
  delay?: number
}

function useCountUp(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const start = prevRef.current
    const diff = target - start
    if (diff === 0) return
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCurrent(start + diff * eased)
      if (progress < 1) requestAnimationFrame(tick)
      else prevRef.current = target
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return current
}

export function MetricCard({ label, value, prefix = '', suffix = '', decimals = 2, change, color = '#00E87A', icon, delay = 0 }: Props) {
  const animated = useCountUp(value)

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`
    return n.toFixed(decimals)
  }

  const isUp = change !== undefined ? change >= 0 : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -3, scale: 1.01 }}
      className="relative bg-reya-card border border-reya-border rounded-xl p-5 overflow-hidden
        hover:border-reya-green/25 hover:shadow-green-sm transition-all duration-300 cursor-default group"
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />

      {/* Background glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: `${color}10` }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-reya-muted font-mono uppercase tracking-widest">{label}</span>
          {icon && <span className="text-lg opacity-60">{icon}</span>}
        </div>

        <div className="font-mono font-black text-2xl mb-2" style={{ color }}>
          {prefix}{fmt(animated)}{suffix}
        </div>

        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-mono ${isUp ? 'text-reya-green' : 'text-reya-red'}`}>
            <span>{isUp ? '▲' : '▼'}</span>
            <span>{Math.abs(change).toFixed(2)}% 24h</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
