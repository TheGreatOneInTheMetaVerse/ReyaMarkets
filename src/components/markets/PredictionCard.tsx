import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { PolyMarket } from '../../hooks/usePolymarkets'
import { useContractContext } from '../../context/ContractContext'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useToast } from '../ui/Toast'

const TAG_COLORS: Record<string, string> = {
  bitcoin: '#f7931a', ethereum: '#627eea', solana: '#9945ff',
  defi: '#38bdf8', regulation: '#eab308', macro: '#22c55e', crypto: '#22c55e',
}

function tagColor(tags: string[]) {
  for (const t of tags) if (TAG_COLORS[t]) return TAG_COLORS[t]
  return '#71717a'
}

interface Props {
  market: PolyMarket
  onChainId?: number
  bettingDisabled?: boolean
}

export function PredictionCard({ market, onChainId, bettingDisabled }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { isConnected } = useAccount()
  const { placeBet, estimatePayout, rUSDBalance, rUSDFormatted, isDeployed, hasRUSD, configError } =
    useContractContext()

  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [payoutPreview, setPayoutPreview] = useState<{ gross: string; net: string } | null>(null)
  const debouncedAmount = useDebouncedValue(betAmount, 450)

  const accent = tagColor(market.tags)
  const hoursLeft = Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 3_600_000)
  const timeLabel = hoursLeft < 24 ? `${hoursLeft}h` : `${Math.ceil(hoursLeft / 24)}d`
  const isClosed = market.resolved || !market.active || hoursLeft <= 0
  const canBet = !bettingDisabled && isDeployed && hasRUSD && onChainId !== undefined && !isClosed

  useEffect(() => {
    if (!canBet || selectedOutcome === null || !debouncedAmount || onChainId === undefined) {
      setPayoutPreview(null)
      return
    }
    let cancelled = false
    estimatePayout(onChainId, selectedOutcome, debouncedAmount).then(r => {
      if (!cancelled) setPayoutPreview(r)
    })
    return () => { cancelled = true }
  }, [canBet, selectedOutcome, debouncedAmount, onChainId, estimatePayout])

  const handleBet = useCallback(async () => {
    if (bettingDisabled) { toast(t('predictions.demoNoBet'), 'error'); return }
    if (!isConnected) { toast(t('dashboard.connectFirst'), 'error'); return }
    if (!hasRUSD) { toast(configError || t('predictions.rusdMissing'), 'error'); return }
    if (selectedOutcome === null) { toast(t('predictions.selectOutcome'), 'error'); return }
    if (!betAmount || parseFloat(betAmount) <= 0) { toast(t('predictions.invalidAmount'), 'error'); return }
    if (!canBet) { toast(t('predictions.notOnChain'), 'info'); return }

    const amount = ethers.parseUnits(betAmount, 18)
    if (rUSDBalance < amount) {
      toast(t('predictions.insufficientBalance', { balance: parseFloat(rUSDFormatted).toFixed(2) }), 'error')
      return
    }

    setLoading(true)
    try {
      await placeBet(onChainId!, selectedOutcome, betAmount)
      toast(t('predictions.betSuccess', { amount: betAmount, outcome: market.outcomes[selectedOutcome].title }), 'success')
      setBetAmount('')
      setSelectedOutcome(null)
      setPayoutPreview(null)
    } catch (err: unknown) {
      toast((err instanceof Error ? err.message : 'Failed').slice(0, 80), 'error')
    } finally {
      setLoading(false)
    }
  }, [bettingDisabled, isConnected, hasRUSD, configError, selectedOutcome, betAmount, canBet, rUSDBalance, rUSDFormatted, placeBet, onChainId, market, toast, t])

  const status = bettingDisabled ? 'DEMO' : canBet ? 'LIVE' : isClosed ? 'CLOSED' : 'SYNC'

  return (
    <article className="flex flex-col rounded-lg border border-reya-border bg-reya-card hover:border-zinc-600 transition-colors">
      <div className="px-4 pt-4 pb-3 border-b border-reya-border-subtle">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className="text-2xs font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
            style={{ color: accent, borderColor: `${accent}40`, background: `${accent}10` }}
          >
            {market.tags[0] || 'crypto'}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xs font-mono text-reya-muted">{timeLabel}</span>
            <span className={`text-2xs font-mono font-bold px-1.5 py-0.5 rounded ${
              status === 'LIVE' ? 'bg-reya-accent/10 text-reya-accent' :
              status === 'DEMO' ? 'bg-reya-yellow/10 text-reya-yellow' :
              'bg-reya-surface text-reya-muted'
            }`}>
              {status}
            </span>
          </div>
        </div>
        <h3 className="text-sm font-medium text-reya-text leading-snug line-clamp-3">{market.question}</h3>
        {onChainId !== undefined && (
          <p className="text-2xs font-mono text-reya-muted mt-1">Reya #{onChainId}</p>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        {market.outcomes.map((outcome, i) => {
          const pct = Math.round(outcome.price * 100)
          const selected = selectedOutcome === i
          return (
            <button
              key={i}
              type="button"
              disabled={isClosed}
              onClick={() => setSelectedOutcome(selected ? null : i)}
              className={`flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                selected ? 'border-reya-accent/50 bg-reya-accent/5' : 'border-reya-border-subtle hover:bg-reya-card-hover'
              }`}
            >
              <span className="text-xs text-reya-text truncate pr-2">{outcome.title}</span>
              <span className="font-mono text-xs font-semibold tabular-nums shrink-0" style={{ color: accent }}>
                {pct}%
              </span>
            </button>
          )
        })}
      </div>

      {!isClosed && (
        <div className="px-3 pb-4 pt-0 space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
              placeholder={t('predictions.amountPlaceholder')}
              className="flex-1 min-w-0 bg-reya-surface border border-reya-border rounded-md px-3 py-2 text-xs font-mono
                text-reya-text placeholder:text-reya-muted focus:outline-none focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={handleBet}
              disabled={loading || !canBet}
              className="btn-primary shrink-0 disabled:opacity-40"
            >
              {loading ? '…' : canBet ? t('dashboard.placeBet') : t('predictions.soon')}
            </button>
          </div>
          {payoutPreview && (
            <p className="text-2xs font-mono text-reya-accent">
              {t('predictions.estimatedPayout', { net: payoutPreview.net, gross: payoutPreview.gross })}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
