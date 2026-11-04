import { Link } from 'react-router-dom'
import { useDemoStore } from '../../app/store'
import { StatusBadge } from '../../components/StatusBadge'
import type { Vehicle } from '../../data/model'
import { formatRelative } from '../../lib/format'
import { ANTENNA_LABEL, VEHICLE_TYPE_LABEL } from '../../lib/labels'
import { isOpen } from './selectors'

export function VehicleSummaryCard({ vehicle }: { vehicle: Vehicle }) {
  const dataset = useDemoStore((s) => s.dataset)
  const customer = dataset.customers.find((c) => c.id === vehicle.customerId)
  const base = dataset.bases.find((b) => b.id === vehicle.baseId)
  const openIncident = dataset.incidents.find((i) => i.vehicleId === vehicle.id && isOpen(i))

  return (
    <div className="min-w-[220px] text-[13px]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-base font-semibold tracking-wide">{vehicle.plate}</span>
        <StatusBadge status={vehicle.status} />
      </div>
      <div className="mt-1 text-text-2">{customer?.name}</div>
      <div className="text-text-3">
        {base?.name}/{vehicle.state} · {VEHICLE_TYPE_LABEL[vehicle.type]} · {ANTENNA_LABEL[vehicle.antenna]}
      </div>
      <div className="mt-1 text-text-3">Última comunicação {formatRelative(vehicle.lastSeenAt, dataset.now)}</div>
      {openIncident && (
        <div className="mt-2 rounded bg-surface-2 px-2 py-1.5">
          <div className="font-medium">{openIncident.probableCause}</div>
          <div className="text-xs text-text-3">Confiança {openIncident.confidence}%</div>
        </div>
      )}
      <Link to={`/veiculos/${vehicle.id}`} className="mt-2 inline-block font-medium text-tenant hover:underline">
        Ver detalhe do veículo
      </Link>
    </div>
  )
}
