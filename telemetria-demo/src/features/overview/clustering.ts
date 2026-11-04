import type { Vehicle, VehicleStatus } from '../../data/model'

export interface Cluster {
  key: string
  lat: number
  lng: number
  vehicles: Vehicle[]
  worstStatus: VehicleStatus
}

const STATUS_PRIORITY: VehicleStatus[] = ['offline', 'degraded', 'online', 'parked']

export function worstStatus(vehicles: Vehicle[]): VehicleStatus {
  for (const s of STATUS_PRIORITY) if (vehicles.some((v) => v.status === s)) return s
  return 'parked'
}

/** Grid clustering: cell size shrinks with zoom; no clustering from zoom 11 on. */
export function clusterVehicles(vehicles: Vehicle[], zoom: number): Cluster[] {
  if (zoom >= 11) {
    return vehicles.map((v) => ({ key: v.id, lat: v.position.lat, lng: v.position.lng, vehicles: [v], worstStatus: v.status }))
  }
  const cell = 160 / Math.pow(2, zoom)
  const cells = new Map<string, Vehicle[]>()
  for (const v of vehicles) {
    const key = `${Math.floor(v.position.lat / cell)}:${Math.floor(v.position.lng / cell)}`
    const list = cells.get(key) ?? []
    list.push(v)
    cells.set(key, list)
  }
  return [...cells.entries()].map(([key, list]) => ({
    key,
    lat: list.reduce((a, v) => a + v.position.lat, 0) / list.length,
    lng: list.reduce((a, v) => a + v.position.lng, 0) / list.length,
    vehicles: list,
    worstStatus: worstStatus(list),
  }))
}
