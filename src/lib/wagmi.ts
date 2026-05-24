import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

export const reyaNetwork = {
  id: 1729,
  name: 'Reya Network',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.reya.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Reya Explorer', url: 'https://explorer.reya.network' },
  },
} as const

export const wagmiConfig = createConfig({
  chains: [reyaNetwork, mainnet],
  connectors: [
    injected(),
    walletConnect({ projectId: 'demo' }),
    coinbaseWallet({ appName: 'Reya Markets' }),
  ],
  transports: {
    [reyaNetwork.id]: http('https://rpc.reya.network'),
    [mainnet.id]: http(),
  },
})
