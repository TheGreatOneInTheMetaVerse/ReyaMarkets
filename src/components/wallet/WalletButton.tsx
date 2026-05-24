import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { reyaNetwork } from '../../lib/wagmi'
import { useToast } from '../ui/Toast'

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function WalletButton() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const [modalOpen, setModalOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const isWrongNetwork = isConnected && chainId !== reyaNetwork.id

  const copyAddr = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast(t('nav.copied'), 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openExplorer = () => {
    window.open('https://explorer.reya.network/address/' + address, '_blank')
    setDropOpen(false)
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setDropOpen(o => !o)}
          className={cn(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 border',
            isWrongNetwork
              ? 'border-reya-yellow/40 bg-reya-yellow/10 hover:bg-reya-yellow/15'
              : 'border-reya-green/40 bg-reya-green/10 hover:bg-reya-green/15'
          )}
        >
          <span className={cn(
            'w-2.5 h-2.5 rounded-full animate-pulse',
            isWrongNetwork ? 'bg-reya-yellow' : 'bg-reya-green'
          )} />
          <span className={cn(
            'font-mono text-sm font-medium',
            isWrongNetwork ? 'text-reya-yellow' : 'text-reya-green'
          )}>
            {shortAddr}
          </span>
          <span className={cn(
            'text-xs transition-transform duration-200',
            isWrongNetwork ? 'text-reya-yellow/60' : 'text-reya-green/60',
            dropOpen && 'rotate-180 inline-block'
          )}>▼</span>
        </button>

        <AnimatePresence>
          {dropOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-14 z-50 w-64 bg-reya-card border border-reya-border rounded-xl overflow-hidden shadow-2xl"
              >
                <div className="px-4 py-3 border-b border-reya-border bg-reya-surface/50">
                  <p className="text-xs text-reya-muted mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-reya-text">{shortAddr}</p>
                </div>

                {isWrongNetwork && (
                  <button
                    onClick={() => { switchChain({ chainId: reyaNetwork.id }); setDropOpen(false) }}
                    disabled={isSwitching}
                    className="w-full px-4 py-3 text-left text-sm bg-reya-yellow/10 hover:bg-reya-yellow/15 border-b border-reya-border flex items-center gap-3 transition-colors"
                  >
                    <span>⚠️</span>
                    <span className="text-reya-yellow font-medium">
                      {isSwitching ? 'Switching...' : t('wallet.switchNetwork')}
                    </span>
                  </button>
                )}

                <div className="py-1">
                  <button
                    onClick={copyAddr}
                    className="w-full px-4 py-3 text-left text-sm text-reya-text hover:bg-reya-border/50 flex items-center gap-3 transition-colors"
                  >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? t('nav.copied') : t('nav.copy')}</span>
                  </button>
                  <button
                    onClick={openExplorer}
                    className="w-full px-4 py-3 text-left text-sm text-reya-text hover:bg-reya-border/50 flex items-center gap-3 transition-colors"
                  >
                    <span>🔍</span>
                    <span>{t('wallet.portfolio')}</span>
                  </button>
                </div>

                <div className="border-t border-reya-border">
                  <button
                    onClick={() => { disconnect(); setDropOpen(false) }}
                    className="w-full px-4 py-3 text-left text-sm text-reya-red hover:bg-reya-red/10 flex items-center gap-3 transition-colors"
                  >
                    <span>⏏</span>
                    <span>{t('nav.disconnect')}</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-reya-green text-reya-bg hover:bg-reya-green-dim shadow-lg shadow-reya-green/25 hover:shadow-reya-green/40 transition-all duration-200 active:scale-95"
      >
        <span>💼</span>
        <span>{t('nav.connect')}</span>
      </button>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-reya-card border border-reya-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-reya-border">
                <div>
                  <h2 className="text-xl font-bold text-reya-text">{t('wallet.title')}</h2>
                  <p className="text-sm text-reya-muted mt-1">{t('wallet.subtitle')}</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-lg text-reya-muted hover:text-reya-text hover:bg-reya-border transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-2">
                {connectors.map(connector => (
                  <button
                    key={connector.uid}
                    onClick={() => {
                      connect({ connector })
                      setModalOpen(false)
                      toast('Connecting...', 'info')
                    }}
                    disabled={isPending}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-reya-border hover:border-reya-green/40 bg-reya-surface/30 hover:bg-reya-green/5 transition-all group text-left disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-reya-surface border border-reya-border group-hover:border-reya-green/30 text-2xl transition-colors">
                      {connector.name.toLowerCase().includes('metamask') ? '🦊' :
                       connector.name.toLowerCase().includes('coinbase') ? '🔵' :
                       connector.name.toLowerCase().includes('wallet') ? '🔗' : '💼'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-reya-text group-hover:text-reya-green transition-colors">
                        {connector.name}
                      </div>
                      <div className="text-xs text-reya-muted">
                        {connector.name.toLowerCase().includes('metamask') ? 'Popular browser extension' :
                         connector.name.toLowerCase().includes('walletconnect') ? 'Connect via QR code' :
                         connector.name.toLowerCase().includes('coinbase') ? 'Coinbase Wallet app' :
                         'Browser wallet'}
                      </div>
                    </div>
                    <span className="text-reya-muted group-hover:text-reya-green group-hover:translate-x-1 transition-all">→</span>
                  </button>
                ))}
              </div>

              <div className="mx-4 mb-4 p-4 rounded-xl bg-reya-surface border border-reya-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-reya-green/20 flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-reya-green animate-pulse block" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-reya-text">{t('wallet.reyaNetwork')}</p>
                    <p className="text-xs text-reya-muted">Chain ID: 1729</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
