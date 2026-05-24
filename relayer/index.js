/**
 * Reya Markets — Backend Relayer
 *
 * 1. Sync crypto markets from Polymarket → ReyaMarkets contract
 * 2. Resolve / cancel when Polymarket settles
 * 3. HTTP API: POST /propose-market, GET /health
 */

import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { ethers } from 'ethers'
import fetch from 'node-fetch'

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  RPC_URL:              process.env.REYA_RPC_URL || 'https://rpc.reya.network',
  PRIVATE_KEY:          process.env.RELAYER_PRIVATE_KEY,
  CONTRACT_ADDRESS:     process.env.CONTRACT_ADDRESS,
  POLYMARKET_API:       'https://gamma-api.polymarket.com',
  POLL_INTERVAL_MS:     5 * 60 * 1000,
  HTTP_PORT:            Number(process.env.HTTP_PORT || 8787),
  CRYPTO_TAGS:          ['crypto', 'bitcoin', 'ethereum', 'solana', 'defi', 'nft', 'web3'],
  MAX_MARKETS_PER_SYNC: 20,
}

const ABI = [
  'function createMarket(string polymarketId, string question, string category, uint256 endTime, string[] outcomeLabels) returns (uint256)',
  'function resolveMarket(uint256 marketId, uint8 winningOutcome)',
  'function cancelMarket(uint256 marketId)',
  'function getMarketCount() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns (tuple(string polymarketId, string question, string category, uint256 endTime, bool resolved, bool cancelled, uint8 winningOutcome, uint256 totalPool, uint256[] outcomePools, string[] outcomeLabels, uint256 createdAt))',
  'function polymarketIdExists(string) view returns (bool)',
  'event MarketCreated(uint256 indexed marketId, string polymarketId, string question, uint256 endTime)',
]

let provider
let wallet
let contract
/** @type {Map<string, number>} polymarketId → on-chain marketId */
let syncedMarkets = new Map()
/** @type {Array<{ polymarketId: string, question: string, category: string, endTime: number, outcomeLabels: string[] }>} */
let proposedMarkets = []

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  console.log('🚀 Reya Markets Relayer starting...')

  if (!CONFIG.PRIVATE_KEY) throw new Error('RELAYER_PRIVATE_KEY not set')
  if (!CONFIG.CONTRACT_ADDRESS) throw new Error('CONTRACT_ADDRESS not set')

  provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)
  wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider)
  contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, ABI, wallet)

  const network = await provider.getNetwork()
  console.log(`✅ Chain ${network.chainId} · ${wallet.address}`)
  console.log(`✅ Contract ${CONFIG.CONTRACT_ADDRESS}`)

  await loadExistingMarkets()
  console.log(`📦 Synced map: ${syncedMarkets.size} markets`)

  startHttpServer()

  syncLoop().catch(err => console.error('Sync loop crashed:', err))
}

// ─── Market index ─────────────────────────────────────────────────────────────

async function loadExistingMarkets() {
  syncedMarkets.clear()
  const count = Number(await contract.getMarketCount())
  for (let i = 0; i < count; i++) {
    try {
      const m = await contract.getMarket(i)
      if (m.polymarketId) syncedMarkets.set(m.polymarketId, i)
    } catch (err) {
      console.warn(`load market #${i}:`, err.message)
    }
  }
}

async function resolveMarketIdByPolyId(polyId) {
  if (syncedMarkets.has(polyId)) return syncedMarkets.get(polyId)

  const exists = await contract.polymarketIdExists(polyId)
  if (!exists) return null

  const count = Number(await contract.getMarketCount())
  for (let i = 0; i < count; i++) {
    const m = await contract.getMarket(i)
    if (m.polymarketId === polyId) {
      syncedMarkets.set(polyId, i)
      return i
    }
  }
  return null
}

function normalizeLabels(labels) {
  return labels.map(l => String(l).trim()).filter(Boolean)
}

// ─── HTTP API ─────────────────────────────────────────────────────────────────

function startHttpServer() {
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      json(res, 200, { ok: true, markets: syncedMarkets.size, proposals: proposedMarkets.length })
      return
    }

    if (req.method === 'POST' && req.url === '/propose-market') {
      try {
        const body = await readJson(req)
        const question = String(body.question || '').trim()
        const outcomeLabels = normalizeLabels(body.outcomeLabels || [])
        const endTime = Number(body.endTime)
        const category = String(body.category || 'crypto').trim()

        if (!question) return json(res, 400, { error: 'question required' })
        if (outcomeLabels.length < 2 || outcomeLabels.length > 8) {
          return json(res, 400, { error: '2–8 outcomes required' })
        }
        if (!endTime || endTime <= Math.floor(Date.now() / 1000)) {
          return json(res, 400, { error: 'endTime must be in the future' })
        }

        const hash = createHash('sha256')
          .update(question + outcomeLabels.join('|') + endTime)
          .digest('hex')
          .slice(0, 16)
        const polymarketId = `custom-${hash}`

        if (await contract.polymarketIdExists(polymarketId)) {
          return json(res, 409, { error: 'Market already proposed' })
        }

        proposedMarkets.push({ polymarketId, question, category, endTime, outcomeLabels })
        console.log(`📝 Proposal queued: ${question.slice(0, 50)}...`)
        json(res, 201, { ok: true, polymarketId })
      } catch (err) {
        json(res, 500, { error: err.message })
      }
      return
    }

    json(res, 404, { error: 'Not found' })
  })

  server.listen(CONFIG.HTTP_PORT, () => {
    console.log(`🌐 HTTP API on :${CONFIG.HTTP_PORT} (/health, /propose-market)`)
  })
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) }
      catch { reject(new Error('Invalid JSON')) }
    })
  })
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

// ─── Sync loop ────────────────────────────────────────────────────────────────

async function syncLoop() {
  while (true) {
    try {
      console.log(`\n🔄 [${new Date().toISOString()}] Syncing...`)
      await syncProposedMarkets()
      await syncNewMarkets()
      await syncResolvedMarkets()
    } catch (err) {
      console.error('❌ Sync error:', err.message)
    }
    console.log(`⏳ Next sync in ${CONFIG.POLL_INTERVAL_MS / 60000} min`)
    await sleep(CONFIG.POLL_INTERVAL_MS)
  }
}

async function syncProposedMarkets() {
  if (proposedMarkets.length === 0) return
  const queue = [...proposedMarkets]
  proposedMarkets = []
  let created = 0

  for (const p of queue) {
    const existingId = await resolveMarketIdByPolyId(p.polymarketId)
    if (existingId !== null) continue

    try {
      const tx = await contract.createMarket(
        p.polymarketId,
        p.question,
        p.category,
        p.endTime,
        p.outcomeLabels,
        { gasLimit: 500_000 },
      )
      const receipt = await tx.wait()
      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log) } catch { return null } })
        .find(e => e?.name === 'MarketCreated')

      if (event) {
        syncedMarkets.set(p.polymarketId, Number(event.args.marketId))
        created++
      }
      await sleep(2000)
    } catch (err) {
      console.error(`❌ Proposal failed ${p.polymarketId}:`, err.message)
      proposedMarkets.push(p)
    }
  }

  if (created) console.log(`✅ Created ${created} proposed markets`)
}

// ─── Polymarket sync ──────────────────────────────────────────────────────────

async function fetchCryptoMarkets() {
  const url = `${CONFIG.POLYMARKET_API}/markets?` + new URLSearchParams({
    active: 'true',
    closed: 'false',
    tag_slug: 'crypto',
    limit: String(CONFIG.MAX_MARKETS_PER_SYNC),
    order: 'volume',
    ascending: 'false',
  })

  const res = await fetch(url)
  const data = await res.json()
  const list = data.markets || data || []

  return list.filter(m => {
    const tags = (m.tags || []).map(t => (t.slug || t.name || '').toLowerCase())
    const isCrypto = tags.some(t => CONFIG.CRYPTO_TAGS.some(c => t.includes(c)))
    const hasOutcomes = m.outcomes && m.outcomes.length >= 2
    const notExpired = m.end_date_iso && new Date(m.end_date_iso) > new Date()
    return isCrypto && hasOutcomes && notExpired
  })
}

async function syncNewMarkets() {
  const markets = await fetchCryptoMarkets()
  console.log(`📡 Polymarket: ${markets.length} crypto markets`)

  let created = 0

  for (const m of markets) {
    const polyId = m.condition_id || m.id
    if (!polyId) continue

    const knownId = await resolveMarketIdByPolyId(polyId)
    if (knownId !== null) continue

    try {
      const endTime = Math.floor(new Date(m.end_date_iso).getTime() / 1000)
      const outcomeLabels = normalizeLabels(
        m.outcomes.map(o => o.title || o.name || String(o)),
      )

      console.log(`➕ ${m.question?.slice(0, 55)}...`)

      const tx = await contract.createMarket(
        polyId,
        m.question || 'Unknown',
        'crypto',
        endTime,
        outcomeLabels,
        { gasLimit: 500_000 },
      )
      const receipt = await tx.wait()

      const event = receipt.logs
        .map(log => { try { return contract.interface.parseLog(log) } catch { return null } })
        .find(e => e?.name === 'MarketCreated')

      if (event) {
        syncedMarkets.set(polyId, Number(event.args.marketId))
        created++
      }
      await sleep(2000)
    } catch (err) {
      console.error(`❌ create ${polyId}:`, err.message)
    }
  }

  console.log(`✅ New Polymarket markets: ${created}`)
}

async function syncResolvedMarkets() {
  const url = `${CONFIG.POLYMARKET_API}/markets?` + new URLSearchParams({
    closed: 'true',
    tag_slug: 'crypto',
    limit: '50',
    order: 'close_time',
    ascending: 'false',
  })

  const res = await fetch(url)
  const data = await res.json()
  const markets = data.markets || data || []

  let settled = 0

  for (const m of markets) {
    const polyId = m.condition_id || m.id
    if (!polyId) continue

    const ourMarketId = await resolveMarketIdByPolyId(polyId)
    if (ourMarketId === null) continue

    const onChain = await contract.getMarket(ourMarketId)
    if (onChain.resolved || onChain.cancelled) continue

    const winningOutcome = findWinningOutcome(m, onChain.outcomeLabels)

    try {
      if (winningOutcome === null) {
        console.log(`🚫 Cancel #${ourMarketId}`)
        const tx = await contract.cancelMarket(ourMarketId, { gasLimit: 200_000 })
        await tx.wait()
      } else {
        console.log(`🏆 Resolve #${ourMarketId} → ${winningOutcome}`)
        const tx = await contract.resolveMarket(ourMarketId, winningOutcome, { gasLimit: 200_000 })
        await tx.wait()
      }
      settled++
      await sleep(2000)
    } catch (err) {
      console.error(`❌ settle #${ourMarketId}:`, err.message)
    }
  }

  console.log(`✅ Settled ${settled} markets`)
}

function findWinningOutcome(market, onChainLabels = []) {
  const outcomes = market.outcomes || []

  if (market.winner_outcome !== undefined && market.winner_outcome !== null) {
    const idx = Number(market.winner_outcome)
    if (idx >= 0 && idx < outcomes.length) return idx
  }

  const winner = outcomes.find(o => o.is_winner === true)
  if (winner) {
    const title = (winner.title || winner.name || '').trim().toLowerCase()
    const byApi = outcomes.findIndex(
      o => (o.title || o.name || '').trim().toLowerCase() === title,
    )
    if (byApi >= 0) return byApi

    if (onChainLabels.length) {
      const byChain = onChainLabels.findIndex(
        l => l.trim().toLowerCase() === title,
      )
      if (byChain >= 0) return byChain
    }
    return outcomes.indexOf(winner)
  }

  if (market.resolution_source?.includes('invalid')) return null
  if (market.resolved_by === 'CANCEL') return null
  return null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

init().catch(err => {
  console.error('💥 Fatal:', err)
  process.exit(1)
})
