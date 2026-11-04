import { useMemo, useState } from 'react'
import { useDemoStore } from '../../app/store'
import { Card } from '../../components/Card'
import { KpiCard } from '../../components/KpiCard'
import { formatCurrency, formatNumber, formatPercent } from '../../lib/format'
import { AlertsList } from './AlertsList'
import { FleetMap } from './FleetMap'
import { OverviewFilters } from './OverviewFilters'
import { countByStatus, countOpenIncidents, filterVehicles, monthKpis, recentAlerts } from './selectors'

export function OverviewPage() {
  const dataset = useDemoStore((s) => s.dataset)
  const config = useDemoStore((s) => s.config)
  const filters = useDemoStore((s) => s.filters)
  const [offlineMap, setOfflineMap] = useState(false)

  const vehicles = useMemo(() => filterVehicles(dataset.vehicles, filters), [dataset.vehicles, filters])
  const ids = useMemo(() => new Set(vehicles.map((v) => v.id)), [vehicles])
  const status = useMemo(() => countByStatus(vehicles), [vehicles])
  const openCount = useMemo(() => countOpenIncidents(dataset.incidents, ids), [dataset.incidents, ids])
  const kpis = useMemo(() => monthKpis(dataset, ids), [dataset, ids])
  const alerts = useMemo(() => recentAlerts(dataset, vehicles), [dataset, vehicles])
  const liveEvent = dataset.networkEvents.find((e) => e.id === dataset.liveNetworkEventId)
  const highlight = useMemo(() => new Set(liveEvent?.endedAt === null ? liveEvent.vehicleIds : []), [liveEvent])

  const slaTargetPct = config.slaTarget * 100
  const availabilityOk = kpis.availabilityPct >= slaTargetPct

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Visão geral da frota</h1>
          <p className="text-xs text-text-3">
            {formatNumber(vehicles.length)} de {formatNumber(dataset.vehicles.length)} veículos no filtro atual
          </p>
        </div>
        <OverviewFilters />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Online" value={formatNumber(status.online)} accent="var(--status-online)" />
        <KpiCard label="Degradados" value={formatNumber(status.degraded)} accent="var(--status-degraded)" hint={`${formatNumber(status.parked)} estacionados`} />
        <KpiCard label="Offline" value={formatNumber(status.offline)} accent="var(--status-offline)" />
        <KpiCard label="Incidentes abertos" value={formatNumber(openCount)} hint="evento de rede conta uma vez" />
        <KpiCard label="Deslocamentos evitados no mês" value={formatNumber(kpis.avoidedTruckRolls)} hint={`${formatNumber(kpis.truckRolls)} realizados`} tone="good" />
        <KpiCard label="R$ economizado no mês" value={formatCurrency(kpis.avoidedCost)} hint={`${formatCurrency(config.truckRollCost)} por deslocamento`} tone="good" />
        <KpiCard
          label="Disponibilidade do mês"
          value={formatPercent(kpis.availabilityPct, 2)}
          hint={`meta ${formatPercent(slaTargetPct, 1)}`}
          tone={availabilityOk ? 'good' : 'bad'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1.4fr)]">
        <Card
          title="Mapa da frota"
          padded={false}
          actions={
            <>
              <Legend />
              <button type="button" onClick={() => setOfflineMap((v) => !v)} className="rounded border border-border px-2 py-0.5 text-[11px] text-text-2 hover:text-text">
                {offlineMap ? 'Usar tiles' : 'Mapa offline'}
              </button>
            </>
          }
        >
          <div className="h-[520px]">
            <FleetMap vehicles={vehicles} highlightIds={highlight} forceFallback={offlineMap} />
          </div>
        </Card>
        <Card title="Alertas recentes (24 h)" padded={false} className="max-h-[580px] overflow-y-auto">
          <AlertsList rows={alerts} now={dataset.now} />
        </Card>
      </div>
    </div>
  )
}

function Legend() {
  const items: Array<[string, string]> = [
    ['Online', 'var(--status-online)'],
    ['Degradado', 'var(--status-degraded)'],
    ['Offline', 'var(--status-offline)'],
    ['Estacionado', 'var(--status-parked)'],
    ['Evento de rede', 'var(--status-network)'],
  ]
  return (
    <ul className="hidden items-center gap-3 text-[11px] text-text-3 lg:flex">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  )
}
