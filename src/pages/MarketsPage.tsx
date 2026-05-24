import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PredictionCard } from '../components/markets/PredictionCard'
import { CreateMarketModal } from '../components/markets/CreateMarketModal'
import { Panel } from '../components/ui/Panel'
import { StatStrip } from '../components/ui/StatStrip'
import { SyncStatus } from '../components/ui/SyncStatus'
import { usePolymarkets } from '../hooks/usePolymarkets'
import { useContractContext } from '../context/ContractContext'

const CATEGORIES = ['All', 'bitcoin', 'ethereum', 'solana', 'defi', 'regulation', 'macro', 'etf']

export function MarketsPage() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [onChainOnly, setOnChainOnly] = useState(false)

  const { markets: polyMarkets, loading, usingMock, bettingAllowed } = usePolymarkets()
  const { onChainMarkets, onChainIdMap, loading: chainLoading, configError, hasRUSD } = useContractContext()

  const filtered = useMemo(() => {
    let list = category === 'All'
      ? polyMarkets
      : polyMarkets.filter(m => m.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase())))

    if (onChainOnly) list = list.filter(m => onChainIdMap.has(m.conditionId))

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => m.question.toLowerCase().includes(q))
    }
    return list
  }, [polyMarkets, category, onChainOnly, onChainIdMap, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">{t('markets.subtitle')}</p>
          <p className="text-sm text-reya-text-secondary max-w-xl">{t('markets.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatus connected={!usingMock} demo={usingMock} />
          <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
            {t('dashboard.newMarket')}
          </button>
        </div>
      </div>

      {configError && !hasRUSD && (
        <div className="px-4 py-3 rounded-lg border border-reya-yellow/30 bg-reya-yellow/5 text-reya-yellow text-sm">
          {configError}
        </div>
      )}

      <StatStrip
        stats={[
          { label: t('predictions.statsListed'), value: String(polyMarkets.length) },
          { label: t('predictions.statsOnChain'), value: String(onChainMarkets.length) },
          {
            label: t('predictions.statsSource'),
            value: usingMock ? 'Demo' : 'Live',
            delta: usingMock ? t('sync.demo') : t('sync.live'),
            deltaUp: !usingMock,
          },
        ]}
      />

      <Panel
        title={t('markets.rankTitle')}
        subtitle={t('markets.rankSubtitle', { count: filtered.length })}
        badge={<SyncStatus connected={!usingMock} demo={usingMock} />}
        noPadding
      >
        <div className="px-4 py-3 border-b border-reya-border flex flex-col lg:flex-row gap-3 lg:items-center">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('markets.search')}
            className="flex-1 max-w-md bg-reya-surface border border-reya-border rounded-md px-3 py-2 text-sm
              text-reya-text placeholder:text-reya-muted focus:outline-none focus:border-zinc-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`filter-pill capitalize ${category === cat ? 'filter-pill-active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOnChainOnly(v => !v)}
            className={`filter-pill whitespace-nowrap ${onChainOnly ? 'filter-pill-active' : ''}`}
          >
            {t('predictions.filterOnChain')}
          </button>
        </div>

        {loading || chainLoading ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-lg bg-reya-surface animate-pulse border border-reya-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-sm text-reya-muted">{t('predictions.noMarkets')}</p>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(market => (
              <PredictionCard
                key={market.id}
                market={market}
                onChainId={onChainIdMap.get(market.conditionId)}
                bettingDisabled={!bettingAllowed}
              />
            ))}
          </div>
        )}
      </Panel>

      <CreateMarketModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
