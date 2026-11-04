import { demoConfig, type DemoConfig } from '../config'
import type { Dataset, Incident, OperationalBase, TelemetrySeries, Vehicle, VehicleStatus } from '../model'
import { generateFleet } from './fleet'
import { generateIncidents } from './incidents'
import { HOUR, MINUTE, isIgnitionOn, localDayStart, positionAt } from './schedule'
import { generateTelemetry } from './telemetry'

export { PROBABLE_CAUSE, RECOMMENDED_ACTION } from './incidents'

export function resolveNow(config: DemoConfig, clock: number = Date.now()): number {
  const ref = config.referenceTime
  if (ref === 'now') return Math.floor(clock / (5 * MINUTE)) * (5 * MINUTE)
  if (ref.startsWith('today@')) {
    const [h, m] = ref.slice('today@'.length).split(':').map(Number)
    return localDayStart(clock) + (h || 0) * HOUR + (m || 0) * MINUTE
  }
  return new Date(ref).getTime()
}

function deriveStatus(vehicle: Vehicle, openIncidents: Incident[]): VehicleStatus {
  const ignition = vehicle.ignitionOn
  for (const inc of openIncidents) {
    if (inc.category === 'energia' || inc.category === 'antena') return 'offline'
  }
  if (openIncidents.length > 0) return 'degraded'
  return ignition ? 'online' : 'parked'
}

/** Builds the whole demo dataset deterministically from the config seed. */
export function buildDataset(config: DemoConfig = demoConfig, clock: number = Date.now()): Dataset {
  const now = resolveNow(config, clock)
  const fleet = generateFleet(config, now)
  const baseMap = new Map(fleet.bases.map((b) => [b.id, b]))

  for (const v of fleet.vehicles) {
    v.ignitionOn = isIgnitionOn(v, now)
    v.position = positionAt(v, baseMap.get(v.baseId)!.position, now)
  }

  const inc = generateIncidents(config, fleet.vehicles, fleet.bases, fleet.installers, now)
  const openByVehicle = new Map<string, Incident[]>()
  for (const i of inc.incidents) {
    if (i.endedAt === null) {
      const list = openByVehicle.get(i.vehicleId) ?? []
      list.push(i)
      openByVehicle.set(i.vehicleId, list)
    }
  }

  for (const v of fleet.vehicles) {
    const open = openByVehicle.get(v.id) ?? []
    v.status = deriveStatus(v, open)
    if (v.status === 'offline') {
      const last = open.reduce((a, b) => Math.max(a, b.startedAt), 0)
      v.lastSeenAt = Math.max(last, now - 45 * MINUTE)
    } else if (v.status === 'parked') {
      v.lastSeenAt = now - Math.floor(((v.id.charCodeAt(3) * 7) % 25) + 1) * MINUTE
    } else {
      v.lastSeenAt = now - (v.id.charCodeAt(4) % 4) * MINUTE
    }
  }

  return {
    seed: config.seed,
    generatedAt: clock,
    now,
    customers: fleet.customers,
    bases: fleet.bases,
    installers: fleet.installers,
    vehicles: fleet.vehicles,
    incidents: inc.incidents,
    networkEvents: inc.networkEvents,
    heroVehicleId: inc.heroVehicleId,
    liveNetworkEventId: inc.liveNetworkEventId,
  }
}

/** Lazy per-vehicle telemetry cache. Series are generated on first access. */
export class TelemetryCache {
  private readonly cache = new Map<string, TelemetrySeries>()
  private readonly bases: Map<string, OperationalBase>
  private readonly config: DemoConfig
  private readonly dataset: Dataset

  constructor(config: DemoConfig, dataset: Dataset) {
    this.config = config
    this.dataset = dataset
    this.bases = new Map(dataset.bases.map((b) => [b.id, b]))
  }

  get(vehicleId: string): TelemetrySeries {
    const cached = this.cache.get(vehicleId)
    if (cached) return cached
    const vehicle = this.dataset.vehicles.find((v) => v.id === vehicleId)
    if (!vehicle) throw new Error(`Vehicle not found: ${vehicleId}`)
    const series = generateTelemetry(this.config, vehicle, this.bases.get(vehicle.baseId)!, this.dataset.incidents, this.dataset.now)
    this.cache.set(vehicleId, series)
    return series
  }

  clear(): void {
    this.cache.clear()
  }
}
