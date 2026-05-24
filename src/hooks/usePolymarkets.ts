import { useState, useEffect } from 'react'

export interface PolyMarket {
  id: string
  conditionId: string
  question: string
  endDate: string
  volume: number
  liquidity: number
  outcomes: { title: string; price: number }[]
  tags: string[]
  resolved: boolean
  active: boolean
}

const CRYPTO_SLUGS = ['crypto', 'bitcoin', 'ethereum', 'solana', 'defi', 'nft', 'web3', 'blockchain']

function isCrypto(market: Record<string, unknown>): boolean {
  const tags = ((market.tags as unknown[]) || []).map((t: unknown) =>
    ((t as Record<string, string>).slug || (t as Record<string, string>).name || '').toLowerCase()
  )
  const q = (market.question as string || '').toLowerCase()
  return (
    tags.some((t: string) => CRYPTO_SLUGS.some(c => t.includes(c))) ||
    CRYPTO_SLUGS.some(c => q.includes(c))
  )
}

function parseMarket(raw: Record<string, unknown>): PolyMarket {
  const outcomes = ((raw.outcomes as unknown[]) || []).map((o: unknown, i: number) => ({
    title: (o as Record<string, string>).title || (o as Record<string, string>).name || `Option ${i + 1}`,
    price: parseFloat((o as Record<string, string>).price || '0.5'),
  }))
  return {
    id:          (raw.id || raw.condition_id) as string,
    conditionId: (raw.condition_id || raw.id) as string,
    question:    (raw.question || 'Unknown') as string,
    endDate:     (raw.end_date_iso || raw.end_date || '') as string,
    volume:      parseFloat((raw.volume as string) || '0'),
    liquidity:   parseFloat((raw.liquidity as string) || '0'),
    outcomes,
    tags:        ((raw.tags as unknown[]) || []).map((t: unknown) =>
      (t as Record<string, string>).slug || (t as Record<string, string>).name || ''
    ),
    resolved:    !!(raw.resolved),
    active:      !!(raw.active),
  }
}

const MOCK_MARKETS: PolyMarket[] = [
  {
    id: 'mock-1', conditionId: 'mock-1',
    question: 'Will BTC exceed $120,000 before end of 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 4200000, liquidity: 890000,
    outcomes: [{ title: 'Yes', price: 0.67 }, { title: 'No', price: 0.33 }],
    tags: ['crypto', 'bitcoin'], resolved: false, active: true,
  },
  {
    id: 'mock-2', conditionId: 'mock-2',
    question: 'Will ETH reach $5,000 in 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 2100000, liquidity: 450000,
    outcomes: [{ title: 'Yes', price: 0.48 }, { title: 'No', price: 0.52 }],
    tags: ['crypto', 'ethereum'], resolved: false, active: true,
  },
  {
    id: 'mock-3', conditionId: 'mock-3',
    question: 'Will SOL price exceed $300 before July 2025?',
    endDate: '2025-07-01T00:00:00Z', volume: 980000, liquidity: 210000,
    outcomes: [{ title: 'Yes', price: 0.38 }, { title: 'No', price: 0.62 }],
    tags: ['crypto', 'solana'], resolved: false, active: true,
  },
  {
    id: 'mock-4', conditionId: 'mock-4',
    question: 'Will the Fed cut rates in Q3 2025?',
    endDate: '2025-09-30T00:00:00Z', volume: 3400000, liquidity: 720000,
    outcomes: [{ title: 'Yes', price: 0.54 }, { title: 'No', price: 0.46 }],
    tags: ['crypto', 'macro'], resolved: false, active: true,
  },
  {
    id: 'mock-5', conditionId: 'mock-5',
    question: 'Which crypto will have highest returns in H2 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 1800000, liquidity: 380000,
    outcomes: [
      { title: 'BTC', price: 0.35 }, { title: 'ETH', price: 0.28 },
      { title: 'SOL', price: 0.22 }, { title: 'Other', price: 0.15 },
    ],
    tags: ['crypto'], resolved: false, active: true,
  },
  {
    id: 'mock-6', conditionId: 'mock-6',
    question: 'Will XRP win its SEC lawsuit in 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 4100000, liquidity: 870000,
    outcomes: [
      { title: 'Full Win', price: 0.42 }, { title: 'Partial', price: 0.35 }, { title: 'Loss', price: 0.23 },
    ],
    tags: ['crypto', 'regulation'], resolved: false, active: true,
  },
  {
    id: 'mock-7', conditionId: 'mock-7',
    question: 'Will BTC ETF AUM exceed $100B by end of 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 2900000, liquidity: 610000,
    outcomes: [{ title: 'Yes', price: 0.71 }, { title: 'No', price: 0.29 }],
    tags: ['crypto', 'bitcoin', 'etf'], resolved: false, active: true,
  },
  {
    id: 'mock-8', conditionId: 'mock-8',
    question: 'Will total crypto market cap exceed $6T in 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 5600000, liquidity: 1200000,
    outcomes: [
      { title: 'Under $4T', price: 0.22 }, { title: '$4T–$6T', price: 0.41 }, { title: 'Over $6T', price: 0.37 },
    ],
    tags: ['crypto'], resolved: false, active: true,
  },
  {
    id: 'mock-9', conditionId: 'mock-9',
    question: 'Will DOGE reach $1 before 2026?',
    endDate: '2025-12-31T00:00:00Z', volume: 1700000, liquidity: 340000,
    outcomes: [{ title: 'Yes', price: 0.31 }, { title: 'No', price: 0.69 }],
    tags: ['crypto'], resolved: false, active: true,
  },
  {
    id: 'mock-10', conditionId: 'mock-10',
    question: 'Will Reya Network TVL exceed $1B by Q3 2025?',
    endDate: '2025-09-30T00:00:00Z', volume: 890000, liquidity: 180000,
    outcomes: [{ title: 'Yes', price: 0.74 }, { title: 'No', price: 0.26 }],
    tags: ['crypto', 'defi'], resolved: false, active: true,
  },
  {
    id: 'mock-11', conditionId: 'mock-11',
    question: 'Will BTC dominance stay above 50% through 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 2200000, liquidity: 460000,
    outcomes: [{ title: 'Yes', price: 0.58 }, { title: 'No', price: 0.42 }],
    tags: ['crypto', 'bitcoin'], resolved: false, active: true,
  },
  {
    id: 'mock-12', conditionId: 'mock-12',
    question: 'Will a G7 nation adopt Bitcoin as legal tender in 2025?',
    endDate: '2025-12-31T00:00:00Z', volume: 3100000, liquidity: 650000,
    outcomes: [{ title: 'Yes', price: 0.12 }, { title: 'No', price: 0.88 }],
    tags: ['crypto', 'bitcoin', 'regulation'], resolved: false, active: true,
  },
]

export function usePolymarkets() {
  const [markets, setMarkets]   = useState<PolyMarket[]>(MOCK_MARKETS)
  const [loading, setLoading]   = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const res = await fetch(
          'https://gamma-api.polymarket.com/markets?' +
          new URLSearchParams({
            active: 'true', closed: 'false', tag_slug: 'crypto',
            limit: '30', order: 'volume', ascending: 'false',
          }),
          { signal: AbortSignal.timeout(8000) }
        )
        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        const raw  = (data.markets || data || []) as Record<string, unknown>[]
        const filtered = raw.filter(isCrypto).map(parseMarket)
        if (filtered.length > 0) {
          setMarkets(filtered)
          setUsingMock(false)
        } else {
          setUsingMock(true)
        }
      } catch {
        setUsingMock(true)
      } finally {
        setLoading(false)
      }
    }
    fetchMarkets()
    const iv = setInterval(fetchMarkets, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  return {
    markets,
    loading,
    usingMock,
    /** Real bets only when Polymarket API is live (not mock fallback) */
    bettingAllowed: !usingMock,
  }
}
