interface Stat {
  label: string
  value: string
  delta?: string
  deltaUp?: boolean
}

interface Props {
  stats: Stat[]
}

export function StatStrip({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-reya-border rounded-lg overflow-hidden border border-reya-border">
      {stats.map(s => (
        <div key={s.label} className="bg-reya-card px-4 py-3">
          <p className="section-label mb-1">{s.label}</p>
          <p className="data-cell text-base font-semibold">{s.value}</p>
          {s.delta && (
            <p className={`text-2xs font-mono mt-0.5 ${s.deltaUp ? 'text-reya-accent' : 'text-reya-red'}`}>
              {s.delta}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
