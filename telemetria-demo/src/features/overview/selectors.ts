import type { OverviewFilters } from '../../app/store'
import type { Dataset, Incident, NetworkEvent, Vehicle, VehicleStatus } from '../../data/model'
import { SEVERITY_RANK } from '../../lib/labels'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

export function filterVehicles(vehicles: Vehicle[], filters: OverviewFilters): Vehicle[] {
  return vehicles.filter(
    (v) =>
      (filters.customerId === 'all' || v.customerId === filters.customerId) &&
      (filters.state === 'all' || v.state === filters.state) &&
      (filters.antenna === 'all' || v.antenna === filters.antenna) &&
      (filters.status === 'all' || v.status === filters.status),
  )
}

export function countByStatus(vehicles: Vehicle[]): Record<VehicleStatus, number> {
  const out: Record<VehicleStatus, number> = { online: 0, degraded: 0, offline: 0, parked: 0 }
  for (const v of vehicles) out[v.status]++
  return out
}

export function isOpen(incident: Incident): boolean {
  return incident.endedAt === null || incident.status === 'aberto' || incident.status === 'em_diagnostico' || incident.status === 'tecnico_acionado'
}

/** Open incidents where each network event counts once. */
export function countOpenIncidents(incidents: Incident[], vehicleIds?: Set<string>): number {
  const open = incidents.filter((i) => isOpen(i) && (!vehicleIds || vehicleIds.has(i.vehicleId)))
  const individual = open.filter((i) => i.networkEventId === null).length
  const events = new Set(open.filter((i) => i.networkEventId !== null).map((i) => i.networkEventId)).size
  return individual + events
}

export function monthStart(now: number, timeZoneOffsetMs = -3 * 60 * MINUTE): number {
  const local = new Date(now + timeZoneOffsetMs)
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - timeZoneOffsetMs
}

export interface MonthKpis {
  avoidedTruckRolls: number
  avoidedCost: number
  availabilityPct: number
  truckRolls: number
}

export function monthKpis(dataset: Dataset, vehicleIds?: Set<string>): MonthKpis {
  const start = monthStart(dataset.now)
  const now = dataset.now
  const vehicles = vehicleIds ? dataset.vehicles.filter((v) => vehicleIds.has(v.id)) : dataset.vehicles
  const ids = new Set(vehicles.map((v) => v.id))
  const incidents = dataset.incidents.filter((i) => ids.has(i.vehicleId))

  let avoidedTruckRolls = 0
  let avoidedCost = 0
  let truckRolls = 0
  let downtimeMs = 0
  for (const i of incidents) {
    const ref = i.endedAt ?? i.startedAt
    if (ref >= start && i.status === 'resolvido_remoto' && i.avoidedCost > 0) {
      avoidedTruckRolls++
      avoidedCost += i.avoidedCost
    }
    if (ref >= start && (i.status === 'resolvido_campo' || i.status === 'tecnico_acionado')) truckRolls++
    if (i.causesDowntime) {
      const s = Math.max(i.startedAt, start)
      const e = Math.min(i.endedAt ?? now, now)
      if (e > s) downtimeMs += e - s
    }
  }
  const elapsed = Math.max(now - start, MINUTE) * Math.max(vehicles.length, 1)
  const availabilityPct = (1 - downtimeMs / elapsed) * 100
  return { avoidedTruckRolls, avoidedCost, availabilityPct, truckRolls }
}

export interface AlertRow {
  key: string
  kind: 'vehicle' | 'network'
  incident: Incident
  vehicle?: Vehicle
  event?: NetworkEvent
  affectedCount: number
}

/** Alerts of the last 24 h, network events grouped, ordered by severity then recency. */
export function recentAlerts(dataset: Dataset, vehicles: Vehicle[]): AlertRow[] {
  const ids = new Set(vehicles.map((v) => v.id))
  const byId = new Map(vehicles.map((v) => [v.id, v]))
  const since = dataset.now - DAY
  const rows: AlertRow[] = []
  const seenEvents = new Set<string>()
  for (const inc of dataset.incidents) {
    if (inc.startedAt < since || !ids.has(inc.vehicleId)) continue
    if (inc.networkEventId) {
      if (seenEvents.has(inc.networkEventId)) continue
      seenEvents.add(inc.networkEventId)
      const event = dataset.networkEvents.find((e) => e.id === inc.networkEventId)
      const affected = event ? event.vehicleIds.filter((id) => ids.has(id)).length : 1
      rows.push({ key: inc.networkEventId, kind: 'network', incident: inc, event, affectedCount: affected })
    } else {
      rows.push({ key: inc.id, kind: 'vehicle', incident: inc, vehicle: byId.get(inc.vehicleId), affectedCount: 1 })
    }
  }
  rows.sort((a, b) => {
    const openDiff = Number(isOpen(b.incident)) - Number(isOpen(a.incident))
    if (openDiff !== 0) return openDiff
    const sev = SEVERITY_RANK[a.incident.severity] - SEVERITY_RANK[b.incident.severity]
    if (sev !== 0) return sev
    return b.incident.startedAt - a.incident.startedAt
  })
  return rows
}
