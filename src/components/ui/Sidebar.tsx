import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useContractContext } from '../../context/ContractContext'
import { usePolymarkets } from '../../hooks/usePolymarkets'
import { useReyaWebSocket } from '../../hooks/useReyaWebSocket'
import { SyncStatus } from './SyncStatus'

const MAIN_NAV = [
  { path: '/app', end: true, key: 'markets' },
  { path: '/app/bets', end: false, key: 'bets' },
  { path: '/app/perps', end: false, key: 'perps' },
  { path: '/app/prices', end: false, key: 'prices' },
] as const

const EXTERNAL = [
  { key: 'docs', href: 'https://docs.reya.xyz' },
  { key: 'explorer', href: 'https://explorer.reya.network' },
] as const

interface Props {
  collapsed: boolean
  onToggle: () => void
  claimableCount: number
}

export function Sidebar({ collapsed, onToggle, claimableCount }: Props) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'fa'
  const { connected, usingFallback } = useReyaWebSocket()
  const { usingMock } = usePolymarkets()
  const { hasRUSD, isDeployed } = useContractContext()

  return (
    <aside
      className={`hidden md:flex fixed top-0 ${isRTL ? 'right-0' : 'left-0'} bottom-0 z-30 flex-col
        bg-reya-surface border-r border-reya-border transition-all duration-200
        ${collapsed ? 'w-14' : 'w-[220px]'}`}
    >
      <div className="flex items-center gap-2 h-14 px-3 border-b border-reya-border shrink-0">
        <div className="w-8 h-8 rounded-md bg-reya-accent flex items-center justify-center shrink-0">
          <span className="text-zinc-950 font-bold text-sm">R</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-semibold text-sm text-reya-text truncate">Reya Markets</div>
            <div className="text-2xs text-reya-muted font-mono">Chain 1729</div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={`text-reya-muted hover:text-reya-text text-xs shrink-0 ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          aria-label="Toggle sidebar"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="section-label px-2 mb-2">{t('nav.section')}</p>
        )}
        {MAIN_NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-reya-card text-reya-text border border-reya-border'
                  : 'text-reya-text-secondary hover:bg-reya-card-hover hover:text-reya-text'
              }`
            }
          >
            <span className="w-5 text-center shrink-0 opacity-70">
              {item.key === 'markets' ? '◎' : item.key === 'bets' ? '◉' : item.key === 'perps' ? '◈' : '₿'}
            </span>
            {!collapsed && (
              <span className="flex-1 truncate">{t(`nav.${item.key}`)}</span>
            )}
            {!collapsed && item.key === 'bets' && claimableCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-reya-accent/20 text-reya-accent text-2xs font-mono font-bold">
                {claimableCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className="my-3 border-t border-reya-border" />

        {!collapsed && (
          <p className="section-label px-2 mb-2">{t('nav.resources')}</p>
        )}
        {EXTERNAL.map(item => (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-reya-muted hover:text-reya-text hover:bg-reya-card-hover transition-colors"
          >
            <span className="w-5 text-center shrink-0">↗</span>
            {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
          </a>
        ))}
      </nav>

      <div className="p-3 border-t border-reya-border space-y-2 shrink-0">
        {!collapsed && (
          <div className="flex flex-wrap gap-1.5">
            <SyncStatus connected={connected} demo={usingFallback} />
            {usingMock && (
              <span className="text-2xs font-mono px-2 py-1 rounded-md bg-reya-yellow/10 text-reya-yellow border border-reya-yellow/20">
                PM DEMO
              </span>
            )}
            {isDeployed && (
              <span className={`text-2xs font-mono px-2 py-1 rounded-md border ${
                hasRUSD ? 'border-reya-accent/30 text-reya-accent bg-reya-accent/5' : 'border-reya-yellow/30 text-reya-yellow'
              }`}>
                {hasRUSD ? 'rUSD OK' : 'NO rUSD'}
              </span>
            )}
          </div>
        )}
        {!collapsed && (
          <p className="text-2xs text-reya-muted font-mono leading-relaxed">
            {t('nav.footerHint')}
          </p>
        )}
      </div>
    </aside>
  )
}
