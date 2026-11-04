import { Link } from 'react-router-dom'
import { CategoryBadge, IncidentStatusBadge } from '../../components/StatusBadge'
import { formatRelative } from '../../lib/format'
import { SEVERITY_LABEL } from '../../lib/labels'
import type { AlertRow } from './selectors'

export function AlertsList({ rows, now }: { rows: AlertRow[]; now: number }) {
  if (rows.length === 0) return <p className="p-4 text-sm text-text-3">Nenhum alerta nas últimas 24 horas.</p>
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const inc = row.incident
        const sevColor = inc.severity === 'critica' ? 'var(--status-offline)' : inc.severity === 'alta' ? 'var(--status-degraded)' : 'var(--status-parked)'
        return (
          <li key={row.key} className="flex gap-3 px-4 py-2.5">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sevColor }} title={SEVERITY_LABEL[inc.severity]} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {row.kind === 'network' ? (
                  <span className="font-semibold">
                    {row.affectedCount} veículos em {row.event?.regionLabel}
                  </span>
                ) : (
                  <Link to={`/veiculos/${inc.vehicleId}`} className="font-mono font-semibold tracking-wide hover:underline">
                    {row.vehicle?.plate}
                  </Link>
                )}
                <CategoryBadge category={inc.category} />
                <IncidentStatusBadge status={inc.status} />
              </div>
              <div className="mt-0.5 truncate text-[13px] text-text-2">{inc.probableCause}</div>
              <div className="mt-0.5 text-xs text-text-3">
                Confiança {inc.confidence}% · {formatRelative(inc.startedAt, now)}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
