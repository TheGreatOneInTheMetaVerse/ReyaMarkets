import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { RELAYER_API_URL } from '../../lib/config'
import { useToast } from '../ui/Toast'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateMarketModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [settlement, setSettlement] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addOption = () => { if (options.length < 6) setOptions(o => [...o, '']) }
  const updateOption = (i: number, val: string) => setOptions(o => o.map((v, idx) => idx === i ? val : v))
  const removeOption = (i: number) => { if (options.length > 2) setOptions(o => o.filter((_, idx) => idx !== i)) }

  const handleCreate = async () => {
    if (!question.trim()) { toast(t('market.errors.question'), 'error'); return }
    if (options.some(o => !o.trim())) { toast(t('market.errors.options'), 'error'); return }
    if (!settlement) { toast(t('market.errors.settlement'), 'error'); return }

    if (!RELAYER_API_URL) {
      toast(t('market.errors.noRelayer'), 'error')
      return
    }

    setSubmitting(true)
    try {
      const endTime = Math.floor(new Date(settlement + 'T23:59:59Z').getTime() / 1000)
      const res = await fetch(`${RELAYER_API_URL}/propose-market`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          outcomeLabels: options.map(o => o.trim()),
          endTime,
          category: 'crypto',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Request failed')

      toast(t('market.submitSuccess'), 'success')
      setQuestion('')
      setOptions(['', ''])
      setSettlement('')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      toast(msg.slice(0, 80), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-reya-text">{t('market.createTitle')}</h2>
                <p className="text-xs text-reya-muted font-mono mt-0.5">{t('market.relayerHint')}</p>
              </div>
              <button type="button" onClick={onClose} className="text-reya-muted hover:text-reya-text text-lg">✕</button>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-mono text-reya-muted mb-2 block uppercase tracking-wider">{t('market.question')}</label>
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Will BTC exceed $150k before 2026?"
                  rows={3}
                  className="w-full bg-reya-surface border border-reya-border rounded-xl px-4 py-3 text-sm
                    text-reya-text placeholder-reya-muted focus:border-reya-green/40 focus:outline-none resize-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-reya-muted mb-2 block uppercase tracking-wider">{t('market.options')}</label>
                <div className="flex flex-col gap-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={opt}
                        onChange={e => updateOption(i, e.target.value)}
                        placeholder={t('market.optionPlaceholder', { n: i + 1 })}
                        className="flex-1 bg-reya-surface border border-reya-border rounded-xl px-3 py-2 text-sm
                          text-reya-text placeholder-reya-muted focus:border-reya-green/40 focus:outline-none font-mono"
                      />
                      {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)}
                          className="px-3 py-2 rounded-xl border border-reya-border text-reya-muted hover:text-reya-red text-sm">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 6 && (
                  <button type="button" onClick={addOption}
                    className="mt-2 text-xs text-reya-green font-mono">
                    {t('market.addOption')}
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-mono text-reya-muted mb-2 block uppercase tracking-wider">{t('market.settlement')}</label>
                <input
                  type="date"
                  value={settlement}
                  onChange={e => setSettlement(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-reya-surface border border-reya-border rounded-xl px-4 py-3 text-sm
                    text-reya-text focus:border-reya-green/40 focus:outline-none [color-scheme:dark] font-mono"
                />
              </div>

              {!RELAYER_API_URL && (
                <div className="p-3 rounded-xl bg-reya-yellow/5 border border-reya-yellow/30 text-xs font-mono text-reya-yellow">
                  {t('market.errors.noRelayer')}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-reya-border text-reya-muted text-sm">
                  {t('market.cancel')}
                </button>
                <button type="button" onClick={handleCreate} disabled={submitting || !RELAYER_API_URL}
                  className="btn-primary flex-1 disabled:opacity-40">
                  {submitting ? '···' : t('market.create')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
