import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { MarketSummary, ReyaExecution } from '../../hooks/useReyaWebSocket'
import { Panel } from '../ui/Panel'

interface Props {
  markets: Record<string, MarketSummary>
  executions: ReyaExecution[]
  connected: boolean
  usingFallback: boolean
  totalVolume: number
  totalOI: number
  liquidations24h: number
  lastUpdated: Date
  professional?: boolean
}

const TOKEN_COLORS: Record<string, string> = {
  BTCRUSDPERP: '#f7931a',
  ETHRUSDPERP: '#627eea',
  SOLRUSDPERP: '#9945ff',
}
const TOKEN_LABELS: Record<string, string> = {
  BTCRUSDPERP: 'BTC', ETHRUSDPERP: 'ETH', SOLRUSDPERP: 'SOL',
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function generateVolumeChart(markets: Record<string, MarketSummary>) {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    BTC: Math.round(parseFloat(markets['BTCRUSDPERP']?.volume24h || '48000000') / 24 / 1000),
    ETH: Math.round(parseFloat(markets['ETHRUSDPERP']?.volume24h || '12000000') / 24 / 1000),
    SOL: Math.round(parseFloat(markets['SOLRUSDPERP']?.volume24h || '8000000') / 24 / 1000),
  }))
}

const TH = 'text-left px-4 py-2.5 text-2xs text-reya-muted font-mono uppercase tracking-wider'
const TD = 'px-4 py-2.5'

export function MarketInfoTab({
  markets,
  executions,
  connected,
  usingFallback,
  lastUpdated,
  professional = false,
}: Props) {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState<'volume' | 'price' | 'change'>('volume')

  const marketList = Object.values(markets).sort((a, b) => {
    if (sortBy === 'volume') return parseFloat(b.volume24h) - parseFloat(a.volume24h)
    if (sortBy === 'price') return parseFloat(b.throttledOraclePrice) - parseFloat(a.throttledOraclePrice)
    return parseFloat(b.pxChange24h) - parseFloat(a.pxChange24h)
  })

  const volumeChart = generateVolumeChart(markets)
  const maxVol = Math.max(...Object.values(markets).map(m => parseFloat(m.volume24h || '0')))

  const sortButtons = (
    <div className="flex gap-1">
      {(['volume', 'price', 'change'] as const).map(s => (
        <button
          key={s}
          type="button"
          onClick={() => setSortBy(s)}
          className={`filter-pill capitalize ${sortBy === s ? 'filter-pill-active' : ''}`}
        >
          {s}
        </button>
      ))}
    </div>
  )

  const perpTable = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-reya-border bg-reya-surface">
            {['Market', 'Price', '24h', 'Volume', 'OI', 'Funding', 'L/S'].map(h => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {marketList.map(m => {
            const color = TOKEN_COLORS[m.symbol] || '#22c55e'
            const label = TOKEN_LABELS[m.symbol] || m.symbol
            const price = parseFloat(m.throttledOraclePrice)
            const change = parseFloat(m.pxChange24h)
            const volume = parseFloat(m.volume24h)
            const oi = parseFloat(m.oiQty)
            const fr = parseFloat(m.fundingRate)
            const longPct = (parseFloat(m.longOiQty) / parseFloat(m.oiQty)) * 100
            const volPct = maxVol > 0 ? (volume / maxVol) * 100 : 0

            return (
              <tr key={m.symbol} className="border-b border-reya-border/50 hover:bg-reya-card-hover">
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="font-mono text-xs font-semibold text-reya-text">{label}</span>
                  </div>
                </td>
                <td className={TD}>
                  <span className="font-mono text-xs tabular-nums">
                    ${price.toLocaleString('en', { maximumFractionDigits: price > 100 ? 0 : 2 })}
                  </span>
                </td>
                <td className={TD}>
                  <span className={`font-mono text-xs font-medium tabular-nums ${change >= 0 ? 'text-reya-accent' : 'text-reya-red'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </span>
                </td>
                <td className={TD}>
                  <span className="font-mono text-xs tabular-nums">{fmt(volume)}</span>
                  <div className="mt-1 h-0.5 w-14 rounded-full bg-reya-border overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${volPct}%`, background: color }} />
                  </div>
                </td>
                <td className={TD}>
                  <span className="font-mono text-xs text-reya-muted tabular-nums">{oi.toFixed(1)}</span>
                </td>
                <td className={TD}>
                  <span className={`font-mono text-xs tabular-nums ${fr >= 0 ? 'text-reya-accent' : 'text-reya-red'}`}>
                    {(fr * 100).toFixed(4)}%
                  </span>
                </td>
                <td className={TD}>
                  <span className="font-mono text-2xs text-reya-muted">{longPct.toFixed(0)}% L</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const tradesTable = (
    <div className="overflow-x-auto max-h-80">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-reya-border bg-reya-surface">
            {['Market', 'Side', 'Type', 'Price', 'Qty', 'Time'].map(h => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {executions.slice(0, 20).map((ex, i) => (
              <motion.tr
                key={`${ex.sequenceNumber}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-reya-border/40 hover:bg-reya-card-hover"
              >
                <td className={TD}>
                  <span className="font-mono font-semibold" style={{ color: TOKEN_COLORS[ex.symbol] }}>
                    {TOKEN_LABELS[ex.symbol]}
                  </span>
                </td>
                <td className={TD}>
                  <span className={`font-mono font-bold ${ex.side === 'B' ? 'text-reya-accent' : 'text-reya-red'}`}>
                    {ex.side === 'B' ? 'LONG' : 'SHORT'}
                  </span>
                </td>
                <td className={TD}>
                  <span className={`font-mono ${ex.type === 'LIQUIDATION' ? 'text-reya-red' : 'text-reya-muted'}`}>
                    {ex.type}
                  </span>
                </td>
                <td className={`${TD} font-mono tabular-nums`}>
                  ${parseFloat(ex.price).toLocaleString()}
                </td>
                <td className={`${TD} font-mono text-reya-muted tabular-nums`}>
                  {parseFloat(ex.qty).toFixed(3)}
                </td>
                <td className={`${TD} font-mono text-reya-muted`}>
                  {new Date(ex.timestamp).toLocaleTimeString()}
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )

  if (professional) {
    return (
      <div className="space-y-4">
        <Panel
          title={t('perps.volumeRank')}
          subtitle={`${marketList.length} markets · ${t('dashboard.lastUpdated')} ${lastUpdated.toLocaleTimeString()}`}
          actions={sortButtons}
          noPadding
        >
          {perpTable}
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title={t('perps.volumeChart')} subtitle={usingFallback ? t('sync.demo') : undefined}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChart} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 9 }} interval={5} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: '#131316', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }} />
                  <Bar dataKey="BTC" stackId="a" fill="#f7931a" />
                  <Bar dataKey="ETH" stackId="a" fill="#627eea" />
                  <Bar dataKey="SOL" stackId="a" fill="#9945ff" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={t('perps.funding')} subtitle="Perpetual funding rates">
            <div className="space-y-3">
              {marketList.map(m => {
                const fr = parseFloat(m.fundingRate)
                return (
                  <div key={m.symbol} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-reya-text-secondary">{TOKEN_LABELS[m.symbol]}</span>
                    <span className={fr >= 0 ? 'text-reya-accent' : 'text-reya-red'}>
                      {(fr * 100).toFixed(4)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>

        <Panel
          title={t('dashboard.liveTrades')}
          subtitle={connected ? 'wss://ws.reya.xyz' : t('sync.demo')}
          noPadding
        >
          {tradesTable}
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="panel p-3 flex justify-between text-2xs font-mono text-reya-muted">
        <span>{connected ? 'LIVE' : usingFallback ? 'DEMO' : '…'}</span>
        <span>{lastUpdated.toLocaleTimeString()}</span>
      </div>
      <div className="panel overflow-hidden">{perpTable}</div>
      {tradesTable}
    </div>
  )
}
