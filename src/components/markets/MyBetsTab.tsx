import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import { useContractContext } from '../../context/ContractContext'
import { useToast } from '../ui/Toast'

function formatAmount(amount: bigint): string {
  return parseFloat(ethers.formatUnits(amount, 18)).toFixed(4)
}

export function MyBetsTab() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { isConnected } = useAccount()
  const { userBets, userBetsLoading, claimWinnings, configError, hasRUSD } = useContractContext()
  const [claimingId, setClaimingId] = useState<number | null>(null)

  const handleClaim = useCallback(
    async (marketId: number) => {
      setClaimingId(marketId)
      try {
        await claimWinnings(marketId)
        toast(t('portfolio.claimSuccess'), 'success')
      } catch (err: unknown) {
        toast((err instanceof Error ? err.message : 'Failed').slice(0, 80), 'error')
      } finally {
        setClaimingId(null)
      }
    },
    [claimWinnings, toast, t],
  )

  if (!isConnected) {
    return <p className="text-sm text-reya-muted text-center py-8">{t('dashboard.connectFirst')}</p>
  }

  if (configError && !hasRUSD) {
    return <p className="text-sm text-reya-yellow py-4">{configError}</p>
  }

  if (userBetsLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-reya-surface animate-pulse" />
        ))}
      </div>
    )
  }

  if (userBets.length === 0) {
    return <p className="text-sm text-reya-muted text-center py-8">{t('portfolio.empty')}</p>
  }

  const groups = {
    claimable: userBets.filter(b => b.canClaim),
    open: userBets.filter(b => !b.resolved && !b.cancelled),
    closed: userBets.filter(b => (b.resolved || b.cancelled) && !b.canClaim),
  }

  return (
    <div className="space-y-6">
      {(['claimable', 'open', 'closed'] as const).map(key => {
        const list = groups[key]
        if (list.length === 0) return null
        return (
          <div key={key}>
            <p className="section-label mb-2">
              {key === 'claimable' ? t('portfolio.status.won') : key === 'open' ? t('portfolio.status.open') : 'History'}
            </p>
            <div className="rounded-lg border border-reya-border overflow-hidden divide-y divide-reya-border">
              {list.map(bet => (
                <div
                  key={`${bet.marketId}-${bet.betIndex}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-reya-card hover:bg-reya-card-hover"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-reya-text truncate">{bet.question}</p>
                    <p className="text-2xs font-mono text-reya-muted mt-1">
                      #{bet.marketId} · {bet.outcomeLabel} · {formatAmount(bet.amount)} rUSD
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-2xs font-mono uppercase text-reya-text-secondary">
                      {t(`portfolio.status.${bet.canClaim ? 'won' : bet.resolved ? (bet.isWinner ? 'won' : 'lost') : 'open'}`)}
                    </span>
                    {bet.canClaim && (
                      <button
                        type="button"
                        onClick={() => handleClaim(bet.marketId)}
                        disabled={claimingId === bet.marketId}
                        className="btn-primary text-xs py-1.5"
                      >
                        {claimingId === bet.marketId ? '…' : t('portfolio.claim')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
