import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePrices, useFearGreed } from '../hooks/useMarketData'

export function LandingPage() {
  const { t } = useTranslation()
  const { prices } = usePrices()
  const fearGreed = useFearGreed()

  return (
    <div className="min-h-screen bg-reya-bg pt-14">
      <div className="border-b border-reya-border bg-reya-surface/80">
        <div className="max-w-6xl mx-auto px-4 py-2 flex gap-4 overflow-x-auto scrollbar-hide">
          {Object.values(prices).map(p => (
            <div key={p.symbol} className="flex items-center gap-2 shrink-0 text-xs font-mono">
              <span className="text-reya-muted">{p.symbol}</span>
              <span className="text-reya-text tabular-nums">${p.price.toLocaleString('en', { maximumFractionDigits: 0 })}</span>
              <span className={p.change24h >= 0 ? 'text-reya-accent' : 'text-reya-red'}>
                {p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(2)}%
              </span>
            </div>
          ))}
          {fearGreed && (
            <div className="flex items-center gap-2 shrink-0 text-xs font-mono border-l border-reya-border pl-4">
              <span className="text-reya-muted">F&G</span>
              <span className="text-reya-text">{fearGreed.value}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="section-label mb-4">{t('landing.tagline')}</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-reya-text tracking-tight mb-4">
          {t('landing.headline')}
        </h1>
        <p className="text-reya-text-secondary text-lg max-w-lg mx-auto mb-10 leading-relaxed">
          {t('landing.subheadline')}
        </p>
        <Link to="/app" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3">
          {t('landing.cta')}
          <span aria-hidden>→</span>
        </Link>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px bg-reya-border rounded-lg overflow-hidden border border-reya-border max-w-2xl mx-auto">
          {[
            { label: t('landing.stats.markets'), value: '20+' },
            { label: t('landing.stats.volume'), value: 'Live' },
            { label: t('landing.stats.traders'), value: 'Reya' },
          ].map(s => (
            <div key={s.label} className="bg-reya-card px-6 py-5">
              <p className="section-label mb-1">{s.label}</p>
              <p className="text-xl font-semibold font-mono text-reya-text tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-2xs text-reya-muted font-mono">
          Inspired by professional Reya dashboards · Prediction markets on chain 1729
        </p>
      </div>
    </div>
  )
}
