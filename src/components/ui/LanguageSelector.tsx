import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'fa', label: 'FA', name: 'فارسی', flag: '🇮🇷' },
  { code: 'tr', label: 'TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ha', label: 'HA', name: 'Hausa', flag: '🇳🇬' },
  { code: 'hi', label: 'HI', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: 'ZH', name: '中文', flag: '🇨🇳' },
]

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  const select = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('reya-lang', code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-reya-border bg-reya-card hover:border-reya-green/40 transition-all text-sm font-mono text-reya-text"
      >
        <span>{current.flag}</span>
        <span className="text-reya-muted">{current.label}</span>
        <span className="text-reya-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-10 z-50 w-44 bg-reya-card border border-reya-border rounded-xl overflow-hidden shadow-2xl"
            >
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => select(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-reya-border/50 transition-colors text-left ${
                    lang.code === i18n.language ? 'text-reya-green bg-reya-green/5' : 'text-reya-text'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
