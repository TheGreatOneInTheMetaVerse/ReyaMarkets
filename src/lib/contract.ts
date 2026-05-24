export { CONTRACT_ADDRESS, RUSD_ADDRESS, contractConfig } from './config'

// ─── ReyaMarkets ABI ─────────────────────────────────────────────────────────

export const CONTRACT_ABI = [
  'function getMarket(uint256 marketId) view returns (tuple(string polymarketId, string question, string category, uint256 endTime, bool resolved, bool cancelled, uint8 winningOutcome, uint256 totalPool, uint256[] outcomePools, string[] outcomeLabels, uint256 createdAt))',
  'function getMarketCount() view returns (uint256)',
  'function getMarketBets(uint256 marketId) view returns (tuple(address user, uint256 marketId, uint8 outcome, uint256 amount, bool claimed)[])',
  'function getUserBetIndices(uint256 marketId, address user) view returns (uint256[])',
  'function getOutcomePools(uint256 marketId) view returns (uint256[])',
  'function estimatePayout(uint256 marketId, uint8 outcome, uint256 amount) view returns (uint256 gross, uint256 net)',
  'function getUserBetHistory(address user) view returns (uint256[])',
  'function collectedFees() view returns (uint256)',
  'function feeBps() view returns (uint256)',
  'function owner() view returns (address)',
  'function relayer() view returns (address)',
  'function polymarketIdExists(string) view returns (bool)',
  'function placeBet(uint256 marketId, uint8 outcome, uint256 amount)',
  'function claimWinnings(uint256 marketId)',
  'event BetPlaced(uint256 indexed marketId, address indexed user, uint8 outcome, uint256 amount)',
  'event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)',
  'event MarketCreated(uint256 indexed marketId, string polymarketId, string question, uint256 endTime)',
  'event MarketResolved(uint256 indexed marketId, uint8 winningOutcome)',
  'event MarketCancelled(uint256 indexed marketId)',
]

// ─── rUSD ABI ─────────────────────────────────────────────────────────────────

export const RUSD_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]
