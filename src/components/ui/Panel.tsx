import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function Panel({ title, subtitle, badge, actions, children, className = '', noPadding }: Props) {
  return (
    <section className={`panel overflow-hidden ${className}`}>
      <div className="panel-header">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h2 className="panel-title">{title}</h2>
            {subtitle && <p className="text-2xs text-reya-muted mt-0.5">{subtitle}</p>}
          </div>
          {badge}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </section>
  )
}
