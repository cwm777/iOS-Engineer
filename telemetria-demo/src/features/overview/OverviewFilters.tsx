import { useDemoStore } from '../../app/store'
import { Select } from '../../components/Select'
import type { VehicleStatus } from '../../data/model'
import { ANTENNA_LABEL, STATE_LABEL, VEHICLE_STATUS_LABEL } from '../../lib/labels'

export function OverviewFilters() {
  const filters = useDemoStore((s) => s.filters)
  const setFilters = useDemoStore((s) => s.setFilters)
  const resetFilters = useDemoStore((s) => s.resetFilters)
  const customers = useDemoStore((s) => s.dataset.customers)

  const isDefault = Object.values(filters).every((v) => v === 'all')

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        label="Cliente"
        value={filters.customerId}
        onChange={(v) => setFilters({ customerId: v })}
        options={[{ value: 'all', label: 'Todos' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <Select
        label="Região"
        value={filters.state}
        onChange={(v) => setFilters({ state: v })}
        options={[{ value: 'all', label: 'Todas' }, ...Object.entries(STATE_LABEL).map(([k, v]) => ({ value: k, label: `${v} (${k})` }))]}
      />
      <Select
        label="Antena"
        value={filters.antenna}
        onChange={(v) => setFilters({ antenna: v })}
        options={[{ value: 'all', label: 'Todas' }, ...Object.entries(ANTENNA_LABEL).map(([k, v]) => ({ value: k, label: v }))]}
      />
      <Select
        label="Status"
        value={filters.status}
        onChange={(v) => setFilters({ status: v as VehicleStatus | 'all' })}
        options={[{ value: 'all', label: 'Todos' }, ...Object.entries(VEHICLE_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))]}
      />
      {!isDefault && (
        <button type="button" onClick={resetFilters} className="text-xs text-tenant underline-offset-2 hover:underline">
          Limpar filtros
        </button>
      )}
    </div>
  )
}
