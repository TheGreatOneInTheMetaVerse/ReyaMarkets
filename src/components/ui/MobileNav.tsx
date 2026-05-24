import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const ITEMS = [
  { path: '/app', end: true, key: 'markets', icon: '◎' },
  { path: '/app/bets', end: false, key: 'bets', icon: '◉' },
  { path: '/app/perps', end: false, key: 'perps', icon: '◈' },
  { path: '/app/prices', end: false, key: 'prices', icon: '₿' },
] as const

export function MobileNav({ claimableCount }: { claimableCount: number }) {
  const { t } = useTranslation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-reya-surface border-t border-reya-border safe-area-pb">
      <div className="flex justify-around py-2">
        {ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-md text-2xs font-medium transition-colors relative ${
                isActive ? 'text-reya-accent' : 'text-reya-muted'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{t(`nav.${item.key}`)}</span>
            {item.key === 'bets' && claimableCount > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-reya-accent text-zinc-950 text-[10px] font-bold flex items-center justify-center">
                {claimableCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
