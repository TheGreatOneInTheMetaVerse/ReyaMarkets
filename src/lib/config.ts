const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

export function isConfiguredAddress(addr: string | undefined): boolean {
  if (!addr) return false
  return addr.toLowerCase() !== ZERO_ADDR
}

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0x3320FeBfc9f55701827EfB207065870092b67659'

export const RUSD_ADDRESS =
  import.meta.env.VITE_RUSD_ADDRESS || ZERO_ADDR

export const RELAYER_API_URL =
  (import.meta.env.VITE_RELAYER_API_URL || '').replace(/\/$/, '')

export const REYA_RPC_URL =
  import.meta.env.VITE_REYA_RPC_URL || 'https://rpc.reya.network'

export const contractConfig = {
  contractAddress: CONTRACT_ADDRESS,
  rusdAddress: RUSD_ADDRESS,
  isContractDeployed: isConfiguredAddress(CONTRACT_ADDRESS),
  isRUSDConfigured: isConfiguredAddress(RUSD_ADDRESS),
  relayerApiUrl: RELAYER_API_URL,
} as const
