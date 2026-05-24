import { useState, useEffect, useRef, useCallback } from 'react'

export interface MarketSummary {
  symbol: string
  updatedAt: number
  longOiQty: string
  shortOiQty: string
  oiQty: string
  fundingRate: string
  fundingRateVelocity: string
  volume24h: string
  pxChange24h: string
  throttledOraclePrice: string
  throttledPoolPrice: string
  longFundingValue: string
  shortFundingValue: string
}

export interface ReyaExecution {
  symbol: string
  accountId: number
  qty: string
  side: 'B' | 'A'
  price: string
  fee: string
  type: 'ORDER_MATCH' | 'LIQUIDATION' | 'ADL'
  timestamp: number
  sequenceNumber: number
}

export interface ReyaPrice {
  symbol: string
  oraclePrice: string
  poolPrice: string
  updatedAt: number
}

const SYMBOLS = ['BTCRUSDPERP', 'ETHRUSDPERP', 'SOLRUSDPERP']

const FALLBACK_MARKETS: Record<string, MarketSummary> = {
  BTCRUSDPERP: {
    symbol: 'BTCRUSDPERP',
    updatedAt: Date.now(),
    longOiQty: '154.741',
    shortOiQty: '154.706',
    oiQty: '309.447',
    fundingRate: '-0.000509',
    fundingRateVelocity: '-0.000000062',
    volume24h: '48230000',
    pxChange24h: '2.4',
    throttledOraclePrice: '97420',
    throttledPoolPrice: '97418',
    longFundingValue: '412142',
    shortFundingValue: '412142',
  },
  ETHRUSDPERP: {
    symbol: 'ETHRUSDPERP',
    updatedAt: Date.now(),
    longOiQty: '2841.2',
    shortOiQty: '2839.8',
    oiQty: '5681',
    fundingRate: '0.000312',
    fundingRateVelocity: '0.000000031',
    volume24h: '12400000',
    pxChange24h: '-1.2',
    throttledOraclePrice: '3380',
    throttledPoolPrice: '3379.5',
    longFundingValue: '198234',
    shortFundingValue: '198234',
  },
  SOLRUSDPERP: {
    symbol: 'SOLRUSDPERP',
    updatedAt: Date.now(),
    longOiQty: '18420',
    shortOiQty: '18380',
    oiQty: '36800',
    fundingRate: '0.000891',
    fundingRateVelocity: '0.000000089',
    volume24h: '8900000',
    pxChange24h: '4.8',
    throttledOraclePrice: '198',
    throttledPoolPrice: '197.9',
    longFundingValue: '89234',
    shortFundingValue: '89234',
  },
}

function animateFallback(
  markets: Record<string, MarketSummary>
): Record<string, MarketSummary> {
  const next = { ...markets }
  Object.keys(next).forEach(sym => {
    const m = { ...next[sym] }
    const drift = (Math.random() - 0.5) * 0.001
    const price = parseFloat(m.throttledOraclePrice) * (1 + drift)
    const vol = parseFloat(m.volume24h) + Math.random() * 5000
    const oi = parseFloat(m.oiQty) + (Math.random() - 0.5) * 2
    m.throttledOraclePrice = price.toFixed(2)
    m.throttledPoolPrice = (price * 0.9999).toFixed(2)
    m.volume24h = vol.toFixed(2)
    m.oiQty = oi.toFixed(3)
    m.updatedAt = Date.now()
    next[sym] = m
  })
  return next
}

export function useReyaWebSocket() {
  const [markets, setMarkets] = useState<Record<string, MarketSummary>>(FALLBACK_MARKETS)
  const [executions, setExecutions] = useState<ReyaExecution[]>([])
  const [prices, setPrices] = useState<Record<string, ReyaPrice>>({})
  const [connected, setConnected] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const startFallback = useCallback(() => {
    setUsingFallback(true)
    if (fallbackRef.current) clearInterval(fallbackRef.current)
    fallbackRef.current = setInterval(() => {
      setMarkets(prev => animateFallback(prev))
      // generate fake execution
      const syms = ['BTCRUSDPERP', 'ETHRUSDPERP', 'SOLRUSDPERP']
      const prices: Record<string, string> = {
        BTCRUSDPERP: (97000 + Math.random() * 1000).toFixed(2),
        ETHRUSDPERP: (3300 + Math.random() * 100).toFixed(2),
        SOLRUSDPERP: (190 + Math.random() * 20).toFixed(2),
      }
      const sym = syms[Math.floor(Math.random() * syms.length)]
      setExecutions(prev => [{
        symbol: sym,
        accountId: Math.floor(Math.random() * 99999),
        qty: (Math.random() * 5).toFixed(3),
        side: Math.random() > 0.5 ? 'B' : 'A',
        price: prices[sym],
        fee: (Math.random() * 2).toFixed(4),
        type: Math.random() > 0.95 ? 'LIQUIDATION' : 'ORDER_MATCH',
        timestamp: Date.now(),
        sequenceNumber: Math.floor(Math.random() * 999999),
      }, ...prev.slice(0, 49)])
    }, 2000)
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    try {
      const ws = new WebSocket('wss://ws.reya.xyz')
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setUsingFallback(false)
        if (fallbackRef.current) { clearInterval(fallbackRef.current); fallbackRef.current = null }

        // subscribe to all channels
        ws.send(JSON.stringify({ type: 'subscribe', channel: '/v2/markets/summary' }))
        ws.send(JSON.stringify({ type: 'subscribe', channel: '/v2/prices' }))
        SYMBOLS.forEach(sym => {
          ws.send(JSON.stringify({ type: 'subscribe', channel: `/v2/market/${sym}/perpExecutions` }))
        })
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
            return
          }
          if (msg.type !== 'channel_data') return

          const ch: string = msg.channel || ''

          if (ch === '/v2/markets/summary') {
            const arr: MarketSummary[] = Array.isArray(msg.data) ? msg.data : [msg.data]
            setMarkets(prev => {
              const next = { ...prev }
              arr.forEach(m => { next[m.symbol] = m })
              return next
            })
          } else if (ch.includes('/summary')) {
            const m: MarketSummary = msg.data
            setMarkets(prev => ({ ...prev, [m.symbol]: m }))
          } else if (ch === '/v2/prices') {
            const arr: ReyaPrice[] = Array.isArray(msg.data) ? msg.data : [msg.data]
            setPrices(prev => {
              const next = { ...prev }
              arr.forEach(p => { next[p.symbol] = p })
              return next
            })
          } else if (ch.includes('/perpExecutions')) {
            const arr: ReyaExecution[] = Array.isArray(msg.data) ? msg.data : [msg.data]
            setExecutions(prev => [...arr, ...prev].slice(0, 50))
          }
        } catch { /* ignore parse errors */ }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setConnected(false)
        startFallback()
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setConnected(false)
        startFallback()
        reconnectRef.current = setTimeout(connect, 5000)
      }
    } catch {
      startFallback()
    }
  }, [startFallback])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (wsRef.current) wsRef.current.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (fallbackRef.current) clearInterval(fallbackRef.current)
    }
  }, [connect])

  // liquidation counter
  const liquidations24h = executions.filter(e => e.type === 'LIQUIDATION').length

  // totals
  const totalVolume24h = Object.values(markets).reduce(
    (sum, m) => sum + parseFloat(m.volume24h || '0'), 0
  )
  const totalOI = Object.values(markets).reduce(
    (sum, m) => sum + parseFloat(m.oiQty || '0') * parseFloat(m.throttledOraclePrice || '0'), 0
  )

  return {
    markets,
    executions,
    prices,
    connected,
    usingFallback,
    liquidations24h,
    totalVolume24h,
    totalOI,
  }
}
