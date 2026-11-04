import type { IncidentCategory, IncidentStatus, VehicleStatus } from '../data/model'
import { CATEGORY_COLOR, CATEGORY_LABEL, INCIDENT_STATUS_LABEL, VEHICLE_STATUS_COLOR, VEHICLE_STATUS_LABEL, VEHICLE_STATUS_SOFT } from '../lib/labels'

export function StatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: VEHICLE_STATUS_SOFT[status], color: VEHICLE_STATUS_COLOR[status] }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: VEHICLE_STATUS_COLOR[status] }} aria-hidden />
      {VEHICLE_STATUS_LABEL[status]}
    </span>
  )
}

export function CategoryBadge({ category }: { category: IncidentCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-text-2 ring-1 ring-border">
      <span className="h-2 w-2 rounded-sm" style={{ background: CATEGORY_COLOR[category] }} aria-hidden />
      {CATEGORY_LABEL[category]}
    </span>
  )
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const open = status === 'aberto' || status === 'em_diagnostico' || status === 'tecnico_acionado'
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${open ? 'bg-surface-2 text-text' : 'text-text-3'}`}>
      {INCIDENT_STATUS_LABEL[status]}
    </span>
  )
}
