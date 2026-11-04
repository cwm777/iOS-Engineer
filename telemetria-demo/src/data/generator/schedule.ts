import type { GeoPoint, Vehicle } from '../model'
import { lerp } from './geo'

/** Brazil (America/Sao_Paulo) has no DST at the moment: fixed UTC-3 offset for schedule math. */
export const TZ_OFFSET_MS = -3 * 60 * 60 * 1000
export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Cheap deterministic hash in [0, 1) from a string. */
export function hash01(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

export function localHour(t: number): number {
  const local = t + TZ_OFFSET_MS
  return ((local % DAY) + DAY) % DAY / HOUR
}

export function localDayIndex(t: number): number {
  return Math.floor((t + TZ_OFFSET_MS) / DAY)
}

export function localDayStart(t: number): number {
  return localDayIndex(t) * DAY - TZ_OFFSET_MS
}

/** 0 = Sunday. */
export function localWeekday(t: number): number {
  return ((localDayIndex(t) + 4) % 7 + 7) % 7
}

export interface WorkSchedule {
  startHour: number
  endHour: number
  worksSaturday: boolean
  worksSunday: boolean
}

export function workSchedule(vehicle: Vehicle): WorkSchedule {
  const a = hash01(vehicle.id + ':start')
  const b = hash01(vehicle.id + ':end')
  return {
    startHour: 5 + a * 3.5,
    endHour: 16 + b * 4,
    worksSaturday: hash01(vehicle.id + ':sat') < 0.35,
    worksSunday: hash01(vehicle.id + ':sun') < 0.08,
  }
}

/** Deterministic ignition state for a vehicle at time t. */
export function isIgnitionOn(vehicle: Vehicle, t: number): boolean {
  const s = workSchedule(vehicle)
  const wd = localWeekday(t)
  if (wd === 6 && !s.worksSaturday) return false
  if (wd === 0 && !s.worksSunday) return false
  const h = localHour(t)
  if (h < s.startHour || h >= s.endHour) return false
  // Short breaks: 15 minute slots with ignition off (lunch and stops).
  const slot = Math.floor((t + TZ_OFFSET_MS) / (15 * MINUTE))
  const r = hash01(`${vehicle.id}:slot:${slot}`)
  if (h >= 11.5 && h < 13 && r < 0.6) return false
  return r >= 0.12
}

/** Time of the most recent ignition-on transition at or before t, searching back up to 24 h. */
export function ignitionTurnedOnWithin(vehicle: Vehicle, t: number, windowMs: number): boolean {
  if (!isIgnitionOn(vehicle, t)) return false
  const step = 5 * MINUTE
  for (let back = step; back <= windowMs; back += step) {
    if (!isIgnitionOn(vehicle, t - back)) return true
  }
  return false
}

/** Vehicle position at time t: moves along a route during the workday, parks otherwise. */
export function positionAt(vehicle: Vehicle, base: GeoPoint, t: number): GeoPoint {
  const s = workSchedule(vehicle)
  const jitterLat = (hash01(vehicle.id + ':jlat') - 0.5) * 0.04
  const jitterLng = (hash01(vehicle.id + ':jlng') - 0.5) * 0.04
  const parked = { lat: base.lat + jitterLat, lng: base.lng + jitterLng }
  const wd = localWeekday(t)
  if ((wd === 6 && !s.worksSaturday) || (wd === 0 && !s.worksSunday)) return parked
  const h = localHour(t)
  if (h < s.startHour || h >= s.endHour) return parked
  const span = s.endHour - s.startHour
  const phase = (h - s.startHour) / span
  const progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2
  const p = lerp(parked, vehicle.traits.routeTarget, progress)
  const wobble = Math.sin(t / (37 * MINUTE) + hash01(vehicle.id) * 6.28) * 0.01
  return { lat: p.lat + wobble, lng: p.lng + wobble * 0.7 }
}
