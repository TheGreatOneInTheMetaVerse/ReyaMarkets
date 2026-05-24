import { useTranslation } from 'react-i18next'

interface Props {
  connected: boolean
  label?: string
  demo?: boolean
}

export function SyncStatus({ connected, label, demo }: Props) {
  const { t } = useTranslation()
  const text = label ?? (connected ? t('sync.live') : t('sync.connecting'))

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-reya-surface border border-reya-border">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          demo ? 'bg-reya-yellow' : connected ? 'bg-reya-accent' : 'bg-reya-yellow animate-pulse'
        }`}
      />
      <span className="text-2xs font-mono font-medium uppercase tracking-wider text-reya-text-secondary">
        {demo ? t('sync.demo') : connected ? t('sync.sync') : text}
      </span>
    </div>
  )
}
