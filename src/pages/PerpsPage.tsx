import { useTranslation } from 'react-i18next'
import { MarketInfoTab } from '../components/markets/MarketInfoTab'
import { StatStrip } from '../components/ui/StatStrip'
import { SyncStatus } from '../components/ui/SyncStatus'
import { useReyaWebSocket } from '../hooks/useReyaWebSocket'

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function PerpsPage() {
  const { t } = useTranslation()
  const {
    markets,
    executions,
    connected,
    usingFallback,
    liquidations24h,
    totalVolume24h,
    totalOI,
  } = useReyaWebSocket()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">{t('perps.subtitle')}</p>
          <p className="text-sm text-reya-text-secondary">{t('perps.description')}</p>
        </div>
        <SyncStatus connected={connected} demo={usingFallback} />
      </div>

      <StatStrip
        stats={[
          { label: t('dashboard.volume'), value: fmtUsd(totalVolume24h) },
          { label: t('dashboard.openInterest'), value: fmtUsd(totalOI) },
          { label: 'Liquidations', value: String(liquidations24h) },
          { label: 'Markets', value: String(Object.keys(markets).length) },
          { label: 'Trades feed', value: String(executions.length) },
        ]}
      />

      <MarketInfoTab
        markets={markets}
        executions={executions}
        connected={connected}
        usingFallback={usingFallback}
        totalVolume={totalVolume24h}
        totalOI={totalOI}
        liquidations24h={liquidations24h}
        lastUpdated={new Date()}
        professional
      />
    </div>
  )
}
