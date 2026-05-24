import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WalletButton } from '../wallet/WalletButton'
import { LanguageSelector } from './LanguageSelector'
import { useContractContext } from '../../context/ContractContext'

const PAGE_KEYS: Record<string, string> = {
  '/app': 'markets',
  '/app/bets': 'bets',
  '/app/perps': 'perps',
  '/app/prices': 'prices',
}

interface Props {
  sidebarWidth: number
}

export function Header({ sidebarWidth }: Props) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const isRTL = i18n.language === 'fa'
  const isApp = location.pathname.startsWith('/app')
  const pageKey = PAGE_KEYS[location.pathname] ?? 'markets'
  const { rUSDFormatted, hasRUSD, isDeployed } = useContractContext()

  if (!isApp) {
    return (
      <header className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-5 border-b border-reya-border bg-reya-bg/95 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-md bg-reya-accent flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-xs">R</span>
          </div>
          <span className="font-semibold text-sm">Reya Markets</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link to="/app" className="btn-primary">{t('nav.launch')}</Link>
        </div>
      </header>
    )
  }

  return (
    <header
      className="fixed top-0 right-0 z-30 h-14 flex items-center px-4 sm:px-6 gap-4 border-b border-reya-border bg-reya-bg/95 backdrop-blur-md"
      style={{ left: isRTL ? 0 : sidebarWidth, right: isRTL ? sidebarWidth : 0 }}
    >
      <div className="mr-auto min-w-0">
        <p className="text-2xs text-reya-muted font-mono uppercase tracking-wider">Reya Markets</p>
        <h1 className="text-base font-semibold text-reya-text truncate">{t(`pages.${pageKey}`)}</h1>
      </div>

      {isDeployed && hasRUSD && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-reya-card border border-reya-border">
          <span className="text-2xs text-reya-muted uppercase">{t('predictions.balanceLabel')}</span>
          <span className="font-mono text-sm font-semibold text-reya-accent tabular-nums">
            {parseFloat(rUSDFormatted).toFixed(2)} rUSD
          </span>
        </div>
      )}

      <LanguageSelector />
      <WalletButton />
    </header>
  )
}
