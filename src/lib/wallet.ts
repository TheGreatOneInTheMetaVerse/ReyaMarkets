import { ethers } from 'ethers'
import type { WalletClient } from 'viem'

/** Build an ethers signer from wagmi walletClient (MetaMask, WalletConnect, etc.) */
export async function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain } = walletClient
  const provider = new ethers.BrowserProvider(
    walletClient.transport as ethers.Eip1193Provider,
    chain.id,
  )
  return provider.getSigner(account.address)
}
