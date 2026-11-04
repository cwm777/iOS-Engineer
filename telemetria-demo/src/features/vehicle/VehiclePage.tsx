import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDemoStore } from '../../app/store'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { formatDate, formatNumber, formatPercent, formatRelative } from '../../lib/format'
import { ANTENNA_LABEL, ANTENNA_STATE_LABEL, KIT_LABEL, VEHICLE_TYPE_LABEL } from '../../lib/labels'
import { chartData, WINDOW_LABEL, type TimeWindow } from './aggregate'
import { ObstructionRadial } from './ObstructionRadial'
import { TelemetryCharts } from './TelemetryCharts'
import { VehicleActions } from './VehicleActions'
import { VehicleIncidents } from './VehicleIncidents'

export function VehiclePage() {
  const { id } = useParams()
  const dataset = useDemoStore((s) => s.dataset)
  const telemetry = useDemoStore((s) => s.telemetry)
  const [window, setWindow] = useState<TimeWindow>('24h')

  const vehicle = dataset.vehicles.find((v) => v.id === id)
  const series = useMemo(() => (vehicle ? telemetry.get(vehicle.id) : null), [telemetry, vehicle])
  const data = useMemo(() => (series ? chartData(series, window, dataset.now) : []), [series, window, dataset.now])
  const incidents = useMemo(() => dataset.incidents.filter((i) => i.vehicleId === id), [dataset.incidents, id])

  if (!vehicle || !series) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-2">Veículo não encontrado.</p>
        <Link to="/" className="text-tenant hover:underline">
          Voltar à visão geral
        </Link>
      </div>
    )
  }

  const customer = dataset.customers.find((c) => c.id === vehicle.customerId)
  const base = dataset.bases.find((b) => b.id === vehicle.baseId)
  const installer = dataset.installers.find((i) => i.id === vehicle.installerId)
  const last = series.fine[series.fine.length - 1]

  const fields: Array<[string, string]> = [
    ['Cliente', customer?.name ?? ''],
    ['Base', `${base?.name ?? ''}/${vehicle.state}`],
    ['Tipo', VEHICLE_TYPE_LABEL[vehicle.type]],
    ['Antena', ANTENNA_LABEL[vehicle.antenna]],
    ['Kit', KIT_LABEL[vehicle.kit]],
    ['Instaladora', installer?.name ?? ''],
    ['Instalação', formatDate(vehicle.installedAt)],
    ['Firmware', vehicle.firmware],
    ['Sistema elétrico', `${vehicle.nominalVoltage} V`],
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-text-3">
            <Link to="/" className="hover:underline">
              Visão geral
            </Link>{' '}
            / Veículo
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-wide">{vehicle.plate}</h1>
            <StatusBadge status={vehicle.status} />
            <span className="text-xs text-text-3">Última comunicação {formatRelative(vehicle.lastSeenAt, dataset.now)}</span>
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            {fields.map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <dt className="text-text-3">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex items-center gap-1 rounded border border-border p-0.5">
          {(Object.keys(WINDOW_LABEL) as TimeWindow[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={`rounded px-3 py-1 text-xs font-medium ${window === w ? 'bg-surface-2 text-text' : 'text-text-2 hover:text-text'}`}
            >
              {WINDOW_LABEL[w]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <Card title={`Telemetria, janela de ${WINDOW_LABEL[window]}`} padded={false}>
          <TelemetryCharts data={data} window={window} nominalVoltage={vehicle.nominalVoltage} />
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Antena agora">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              <Stat label="Estado" value={ANTENNA_STATE_LABEL[last.state]} />
              <Stat label="Reinícios hoje" value={formatNumber(series.rebootsToday)} warn={series.rebootsToday > 2} />
              <Stat label="Uptime 90 d" value={formatPercent(series.uptimePct, 1)} />
              <Stat label="SNR" value={`${formatNumber(last.snrDb, 1)} dB`} />
              <Stat label="Consumo" value={`${formatNumber(last.powerW, 0)} W`} />
              <Stat label="Tensão agora" value={`${formatNumber(last.batteryV, 1)} V`} warn={last.batteryV < 10 * (vehicle.nominalVoltage / 12)} />
              <Stat label="Temp. da case" value={`${formatNumber(last.caseTempC, 0)} °C`} warn={last.caseTempC > 60} />
              <Stat label="Alertas" value={last.alerts.length ? last.alerts.join(', ') : 'nenhum'} warn={last.alerts.length > 0} />
            </dl>
          </Card>
          <Card title="Mapa de obstrução (12 setores)">
            <ObstructionRadial sectors={series.obstructionSectors} />
          </Card>
          <Card title="Ações">
            <VehicleActions vehicleId={vehicle.id} plate={vehicle.plate} />
          </Card>
        </div>
      </div>

      <Card title={`Histórico de incidentes (${incidents.length})`} padded={false}>
        <VehicleIncidents incidents={incidents} />
      </Card>
    </div>
  )
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-text-3">{label}</dt>
      <dd className={`font-medium ${warn ? 'text-offline' : ''}`}>{value}</dd>
    </div>
  )
}
