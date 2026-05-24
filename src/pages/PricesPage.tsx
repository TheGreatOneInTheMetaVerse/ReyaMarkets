import { useTranslation } from 'react-i18next'
import { Panel } from '../components/ui/Panel'
import { StatStrip } from '../components/ui/StatStrip'
import { usePrices, useFearGreed } from '../hooks/useMarketData'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const TOKEN_META: Record<string, { color: string; name: string }> = {
  BTC: { color: '#f7931a', name: 'Bitcoin' },
  ETH: { color: '#627eea', name: 'Ethereum' },
  SOL: { color: '#9945ff', name: 'Solana' },
}

export function PricesPage() {
  const { t } = useTranslation()
  const { prices, loading, lastUpdated } = usePrices()
  const fearGreed = useFearGreed()

  const list = Object.values(prices)

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">{t('prices.subtitle')}</p>
        <p className="text-sm text-reya-text-secondary">{t('prices.description')}</p>
      </div>

      {fearGreed && (
        <StatStrip
          stats={[
            {
              label: 'Fear & Greed',
              value: String(fearGreed.value),
              delta: fearGreed.label,
              deltaUp: fearGreed.value > 55,
            },
            ...list.map(p => ({
              label: p.symbol,
              value: `$${p.price.toLocaleString('en', { maximumFractionDigits: p.price > 100 ? 0 : 2 })}`,
              delta: `${p.change24h >= 0 ? '+' : ''}${p.change24h.toFixed(2)}%`,
              deltaUp: p.change24h >= 0,
            })),
          ]}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {list.map(p => {
          const meta = TOKEN_META[p.symbol] ?? { color: '#22c55e', name: p.symbol }
          return (
            <Panel
              key={p.symbol}
              title={meta.name}
              subtitle={`${p.symbol} · ${t('dashboard.lastUpdated')} ${lastUpdated.toLocaleTimeString()}`}
            >
              <div className="mb-4">
                <span className="text-2xl font-semibold font-mono tabular-nums text-reya-text">
                  ${p.price.toLocaleString('en', { maximumFractionDigits: 2 })}
                </span>
                <span className={`ml-2 text-sm font-mono font-medium ${p.change24h >= 0 ? 'text-reya-accent' : 'text-reya-red'}`}>
                  {p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="h-32">
                {loading ? (
                  <div className="h-full rounded bg-reya-surface animate-pulse" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={p.history}>
                      <defs>
                        <linearGradient id={`g-${p.symbol}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={meta.color} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip
                        contentStyle={{
                          background: '#131316',
                          border: '1px solid #27272a',
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                        formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={meta.color}
                        fill={`url(#g-${p.symbol})`}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 flex justify-between text-2xs font-mono text-reya-muted">
                <span>24h H ${p.high24h.toLocaleString()}</span>
                <span>24h L ${p.low24h.toLocaleString()}</span>
              </div>
            </Panel>
          )
        })}
      </div>

      {fearGreed && (
        <Panel title="Market Sentiment" subtitle="Alternative.me Fear & Greed Index">
          <div className="flex items-center gap-6">
            <span className="text-4xl font-bold font-mono tabular-nums text-reya-text">{fearGreed.value}</span>
            <div className="flex-1">
              <p className="font-medium text-reya-text">{fearGreed.label}</p>
              <div className="mt-3 h-2 rounded-full bg-reya-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fearGreed.value}%`,
                    background: 'linear-gradient(90deg, #ef4444, #eab308, #22c55e)',
                  }}
                />
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
