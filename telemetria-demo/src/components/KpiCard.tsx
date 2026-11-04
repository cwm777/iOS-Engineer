import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: string
  tone?: 'default' | 'good' | 'bad'
}

export function KpiCard({ label, value, hint, accent, tone = 'default' }: KpiCardProps) {
  const toneClass = tone === 'good' ? 'text-online' : tone === 'bad' ? 'text-offline' : 'text-text'
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface px-4 py-3">
      {accent && <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />}
      <div className="text-[11px] font-medium uppercase tracking-wide text-text-3">{label}</div>
      <div className={`mt-1 text-2xl font-semibold leading-tight ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-text-2">{hint}</div>}
    </div>
  )
}
