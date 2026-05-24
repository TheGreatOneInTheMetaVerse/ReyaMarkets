import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  RUSD_ADDRESS,
  RUSD_ABI,
  contractConfig,
} from '../lib/contract'
import { REYA_RPC_URL } from '../lib/config'
import { walletClientToSigner } from '../lib/wallet'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnChainMarket {
  id: number
  polymarketId: string
  question: string
  category: string
  endTime: number
  resolved: boolean
  cancelled: boolean
  winningOutcome: number
  totalPool: bigint
  outcomePools: bigint[]
  outcomeLabels: string[]
  createdAt: number
}

export interface UserBetPosition {
  marketId: number
  betIndex: number
  outcome: number
  amount: bigint
  claimed: boolean
  question: string
  outcomeLabel: string
  resolved: boolean
  cancelled: boolean
  winningOutcome: number
  polymarketId: string
  canClaim: boolean
  isWinner: boolean
}

export interface ContractContextValue {
  markets: OnChainMarket[]
  userBets: UserBetPosition[]
  loading: boolean
  userBetsLoading: boolean
  error: string | null
  isDeployed: boolean
  hasRUSD: boolean
  configError: string | null
  marketCount: number
  rUSDBalance: bigint
  rUSDFormatted: string
  onChainIdMap: Map<string, number>
  placeBet: (marketId: number, outcome: number, amountRUSD: string) => Promise<unknown>
  claimWinnings: (marketId: number) => Promise<unknown>
  estimatePayout: (
    marketId: number,
    outcome: number,
    amountRUSD: string,
  ) => Promise<{ gross: string; net: string } | null>
  refetch: () => void
}

// ─── RPC helpers ─────────────────────────────────────────────────────────────

function getProvider() {
  return new ethers.JsonRpcProvider(REYA_RPC_URL)
}

function getReadContract(address: string, abi: readonly string[]) {
  return new ethers.Contract(address, abi, getProvider())
}

function parseMarket(id: number, m: {
  polymarketId: string
  question: string
  category: string
  endTime: bigint
  resolved: boolean
  cancelled: boolean
  winningOutcome: number
  totalPool: bigint
  outcomePools: bigint[]
  outcomeLabels: string[]
  createdAt: bigint
}): OnChainMarket {
  return {
    id,
    polymarketId: m.polymarketId,
    question: m.question,
    category: m.category,
    endTime: Number(m.endTime),
    resolved: m.resolved,
    cancelled: m.cancelled,
    winningOutcome: Number(m.winningOutcome),
    totalPool: BigInt(m.totalPool.toString()),
    outcomePools: Array.from(m.outcomePools).map(v => BigInt(v.toString())),
    outcomeLabels: Array.from(m.outcomeLabels) as string[],
    createdAt: Number(m.createdAt),
  }
}

async function fetchAllMarkets(): Promise<OnChainMarket[]> {
  if (!contractConfig.isContractDeployed) return []
  const contract = getReadContract(CONTRACT_ADDRESS, CONTRACT_ABI)
  const count = Number(await contract.getMarketCount())
  if (count === 0) return []

  const fetched: OnChainMarket[] = []
  const batchSize = 8
  for (let i = 0; i < count; i += batchSize) {
    const slice = Math.min(batchSize, count - i)
    const batch = await Promise.all(
      Array.from({ length: slice }, (_, j) => contract.getMarket(i + j)),
    )
    batch.forEach((m: ethers.Result, j: number) => {
      fetched.push(parseMarket(i + j, m as unknown as Parameters<typeof parseMarket>[1]))
    })
  }
  return fetched.reverse()
}

async function fetchUserBetPositions(
  userAddress: string,
  markets: OnChainMarket[],
): Promise<UserBetPosition[]> {
  if (!contractConfig.isContractDeployed) return []
  const contract = getReadContract(CONTRACT_ADDRESS, CONTRACT_ABI)
  const marketIds: bigint[] = await contract.getUserBetHistory(userAddress)
  if (marketIds.length === 0) return []

  const marketById = new Map(markets.map(m => [m.id, m]))
  const positions: UserBetPosition[] = []

  for (const rawId of marketIds) {
    const marketId = Number(rawId)
    let market = marketById.get(marketId)
    if (!market) {
      const m = await contract.getMarket(marketId)
      market = parseMarket(marketId, m as unknown as Parameters<typeof parseMarket>[1])
    }

    const indices: bigint[] = await contract.getUserBetIndices(marketId, userAddress)
    if (indices.length === 0) continue

    const allBets = await contract.getMarketBets(marketId)
    const settled = market.resolved || market.cancelled

    for (const rawIdx of indices) {
      const betIndex = Number(rawIdx)
      const bet = allBets[betIndex]
      if (!bet || bet.claimed) continue

      const outcome = Number(bet.outcome)
      const isWinner = settled && !market.cancelled && outcome === market.winningOutcome
      const canClaim =
        settled && (market.cancelled || isWinner)

      positions.push({
        marketId,
        betIndex,
        outcome,
        amount: BigInt(bet.amount.toString()),
        claimed: bet.claimed,
        question: market.question,
        outcomeLabel: market.outcomeLabels[outcome] ?? `Outcome ${outcome}`,
        resolved: market.resolved,
        cancelled: market.cancelled,
        winningOutcome: market.winningOutcome,
        polymarketId: market.polymarketId,
        canClaim,
        isWinner,
      })
    }
  }

  return positions.sort((a, b) => b.marketId - a.marketId)
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ContractContext = createContext<ContractContextValue | null>(null)

export function ContractProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const queryClient = useQueryClient()
  const [rUSDBalance, setRUSDBalance] = useState<bigint>(0n)

  const isDeployed = contractConfig.isContractDeployed
  const hasRUSD = contractConfig.isRUSDConfigured

  const configError = useMemo(() => {
    if (!isDeployed) return 'Contract address not configured'
    if (!hasRUSD) return 'VITE_RUSD_ADDRESS is not set — betting disabled'
    return null
  }, [isDeployed, hasRUSD])

  const marketsQuery = useQuery({
    queryKey: ['onchain-markets'],
    queryFn: fetchAllMarkets,
    enabled: isDeployed,
    staleTime: 20_000,
    refetchInterval: 30_000,
  })

  const markets = marketsQuery.data ?? []

  const onChainIdMap = useMemo(() => {
    const map = new Map<string, number>()
    markets.forEach(m => map.set(m.polymarketId, m.id))
    return map
  }, [markets])

  const userBetsQuery = useQuery({
    queryKey: ['user-bets', address, markets.length],
    queryFn: () => fetchUserBetPositions(address!, markets),
    enabled: !!address && isDeployed,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const fetchBalance = useCallback(async () => {
    if (!address || !hasRUSD) return
    try {
      const rusd = getReadContract(RUSD_ADDRESS, RUSD_ABI)
      const bal = await rusd.balanceOf(address)
      setRUSDBalance(BigInt(bal.toString()))
    } catch (e) {
      console.warn('rUSD balance:', e)
    }
  }, [address, hasRUSD])

  useEffect(() => {
    fetchBalance()
    const iv = setInterval(fetchBalance, 30_000)
    return () => clearInterval(iv)
  }, [fetchBalance])

  const getSigner = useCallback(async () => {
    if (!walletClient) throw new Error('Wallet not connected')
    return walletClientToSigner(walletClient)
  }, [walletClient])

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['onchain-markets'] })
    queryClient.invalidateQueries({ queryKey: ['user-bets'] })
    fetchBalance()
  }, [queryClient, fetchBalance])

  const approveRUSD = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error('Wallet not connected')
      if (!hasRUSD) throw new Error('rUSD not configured — set VITE_RUSD_ADDRESS')

      const readRUSD = getReadContract(RUSD_ADDRESS, RUSD_ABI)
      const allowance = await readRUSD.allowance(address, CONTRACT_ADDRESS)
      if (BigInt(allowance.toString()) >= amount) return

      const signer = await getSigner()
      const writeRUSD = new ethers.Contract(RUSD_ADDRESS, RUSD_ABI, signer)
      const tx = await writeRUSD.approve(CONTRACT_ADDRESS, amount)
      await tx.wait()
    },
    [address, hasRUSD, getSigner],
  )

  const placeBet = useCallback(
    async (marketId: number, outcome: number, amountRUSD: string) => {
      if (!walletClient) throw new Error('Wallet not connected')
      if (!isDeployed) throw new Error('Contract not deployed')
      if (!hasRUSD) throw new Error('rUSD not configured')

      const amount = ethers.parseUnits(amountRUSD, 18)
      if (rUSDBalance < amount) {
        throw new Error('Insufficient rUSD balance')
      }

      await approveRUSD(amount)
      const signer = await getSigner()
      const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const tx = await writeContract.placeBet(marketId, outcome, amount)
      const receipt = await tx.wait()
      invalidateAll()
      return receipt
    },
    [walletClient, isDeployed, hasRUSD, rUSDBalance, approveRUSD, getSigner, invalidateAll],
  )

  const claimWinnings = useCallback(
    async (marketId: number) => {
      if (!walletClient) throw new Error('Wallet not connected')
      if (!isDeployed) throw new Error('Contract not deployed')

      const signer = await getSigner()
      const writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      const tx = await writeContract.claimWinnings(marketId)
      const receipt = await tx.wait()
      invalidateAll()
      return receipt
    },
    [walletClient, isDeployed, getSigner, invalidateAll],
  )

  const estimatePayout = useCallback(
    async (marketId: number, outcome: number, amountRUSD: string) => {
      if (!isDeployed) return null
      const parsed = parseFloat(amountRUSD)
      if (!amountRUSD || Number.isNaN(parsed) || parsed <= 0) return null
      try {
        const contract = getReadContract(CONTRACT_ADDRESS, CONTRACT_ABI)
        const amount = ethers.parseUnits(amountRUSD, 18)
        const result = await contract.estimatePayout(marketId, outcome, amount)
        return {
          gross: parseFloat(ethers.formatUnits(result.gross, 18)).toFixed(4),
          net: parseFloat(ethers.formatUnits(result.net, 18)).toFixed(4),
        }
      } catch {
        return null
      }
    },
    [isDeployed],
  )

  const rUSDFormatted = parseFloat(ethers.formatUnits(rUSDBalance, 18)).toFixed(4)

  const value: ContractContextValue = {
    markets,
    userBets: userBetsQuery.data ?? [],
    loading: marketsQuery.isLoading,
    userBetsLoading: userBetsQuery.isLoading,
    error: marketsQuery.error ? 'Failed to load on-chain markets' : null,
    isDeployed,
    hasRUSD,
    configError,
    marketCount: markets.length,
    rUSDBalance,
    rUSDFormatted,
    onChainIdMap,
    placeBet,
    claimWinnings,
    estimatePayout,
    refetch: invalidateAll,
  }

  return (
    <ContractContext.Provider value={value}>{children}</ContractContext.Provider>
  )
}

export function useContractContext(): ContractContextValue {
  const ctx = useContext(ContractContext)
  if (!ctx) {
    throw new Error('useContractContext must be used within ContractProvider')
  }
  return ctx
}
