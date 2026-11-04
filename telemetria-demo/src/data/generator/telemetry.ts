import type { DemoConfig } from '../config'
import type { AntennaAlert, AntennaState, Incident, OperationalBase, TelemetryPoint, TelemetrySeries, Vehicle } from '../model'
import { obstructionSectorsFromEvidence } from './incidents'
import { Rng, childSeed } from './rng'
import { DAY, HOUR, MINUTE, ignitionTurnedOnWithin, isIgnitionOn, localDayStart, localHour, positionAt } from './schedule'

const FINE_STEP = 5 * MINUTE
const FINE_SPAN = 24 * HOUR

interface RebootPlan {
  incidentId: string
  times: number[]
}

function ambientTemp(vehicle: Vehicle, hour: number): number {
  const regional = vehicle.state === 'RS' ? 18 : vehicle.state === 'MT' ? 26 : 28
  return regional + 6 * Math.sin(((hour - 8) / 24) * Math.PI * 2)
}

function congestionFactor(hour: number): { throughput: number; latency: number } {
  if (hour >= 18 && hour < 22) {
    const peak = 1 - Math.abs(hour - 20) / 2
    return { throughput: 1 - 0.3 - 0.1 * peak, latency: 1 + 0.6 * (0.5 + 0.5 * peak) }
  }
  return { throughput: 1, latency: 1 }
}

export function generateTelemetry(
  config: DemoConfig,
  vehicle: Vehicle,
  base: OperationalBase,
  incidents: Incident[],
  now: number,
): TelemetrySeries {
  const rng = new Rng(childSeed(config.seed, 'telemetry', vehicle.id))
  const own = incidents.filter((i) => i.vehicleId === vehicle.id).sort((a, b) => a.startedAt - b.startedAt)
  const scale = vehicle.nominalVoltage / 12

  // Deterministic reboot timestamps for energy and antenna incidents.
  const rebootPlans: RebootPlan[] = own
    .filter((i) => i.category === 'energia' || i.category === 'antena')
    .map((i) => {
      const n = i.evidence.find((e) => e.metric === 'reboots')?.value ?? 2
      const end = i.endedAt ?? now
      const planRng = new Rng(childSeed(config.seed, 'reboots', i.id))
      const times: number[] = []
      if (i.category === 'energia') {
        // Energy reboots happen right after ignition turns on.
        const slots: number[] = []
        const first = Math.ceil(i.startedAt / FINE_STEP) * FINE_STEP
        for (let t = first; t < end; t += FINE_STEP) {
          if (ignitionTurnedOnWithin(vehicle, t, FINE_STEP)) slots.push(t + 3 * 1000)
        }
        for (const t of planRng.shuffle(slots).slice(0, n)) times.push(t)
      }
      while (times.length < n) times.push(i.startedAt + planRng.float(0, Math.max(end - i.startedAt - MINUTE, MINUTE)))
      times.sort((a, b) => a - b)
      return { incidentId: i.id, times }
    })

  const activeIncident = (t: number): Incident | undefined =>
    own.find((i) => t >= i.startedAt && t < (i.endedAt ?? now + DAY))

  const rebootsIn = (t: number, windowMs: number): number =>
    rebootPlans.reduce((acc, p) => acc + p.times.filter((x) => x >= t && x < t + windowMs).length, 0)

  function makePoint(t: number, windowMs: number): TelemetryPoint {
    const hour = localHour(t + windowMs / 2)
    const ignition = isIgnitionOn(vehicle, t + windowMs / 2)
    const justStarted = ignitionTurnedOnWithin(vehicle, t + windowMs / 2, Math.max(windowMs, 10 * MINUTE))
    const cong = congestionFactor(hour)
    const incident = activeIncident(t + windowMs / 2)
    const pos = positionAt(vehicle, base.position, t + windowMs / 2)

    let state: AntennaState = 'connected'
    let downMbps = vehicle.traits.baseDownMbps * cong.throughput * rng.float(0.85, 1.1)
    let upMbps = vehicle.traits.baseUpMbps * cong.throughput * rng.float(0.8, 1.15)
    let latencyMs = vehicle.traits.baseLatencyMs * cong.latency * rng.float(0.9, 1.2)
    let lossPct = rng.float(0.05, 0.9)
    let snrDb = rng.float(8, 12.5)
    let obstructionPct = vehicle.traits.highObstruction ? rng.float(4, 9) : rng.float(0.3, 3)
    const nominalPower = vehicle.antenna === 'mini' ? 28 : vehicle.antenna === 'standard_v4' ? 48 : 75
    let powerW = nominalPower * rng.float(0.85, 1.15)
    const alerts: AntennaAlert[] = []
    let reboots = rebootsIn(t, windowMs)

    const baseVoltage = ignition ? rng.float(13.4, 14.3) : rng.float(12.2, 12.7)
    let batteryV = baseVoltage
    if (justStarted) batteryV = vehicle.traits.badPower ? rng.float(9.2, 10.4) : rng.float(10.9, 11.8)
    let converterV = rng.float(12.1, 12.5)
    let caseTempC = ambientTemp(vehicle, hour) + (ignition ? 6 : hour > 10 && hour < 17 ? 16 : 4) + (vehicle.traits.heatProne ? 7 : 0) + rng.float(-2, 2)
    let vibrationG = ignition ? (vehicle.traits.highVibration ? rng.float(1.1, 2.3) : rng.float(0.3, 0.9)) : rng.float(0.02, 0.08)
    let speedKmh = ignition ? rng.float(25, 85) : 0

    if (incident) {
      const ev = (metric: string) => incident.evidence.find((e) => e.metric === metric)?.value
      switch (incident.category) {
        case 'energia': {
          if (justStarted) batteryV = (ev('batteryV') ?? 9.4) / scale + rng.float(-0.1, 0.4)
          if (reboots > 0) {
            batteryV = (ev('batteryV') ?? 9.4) / scale + rng.float(-0.2, 0.2)
            converterV = Math.min(converterV, batteryV * 0.95)
            state = 'booting'
            downMbps = 0
            upMbps = 0
            latencyMs = 0
            lossPct = 100
          }
          break
        }
        case 'instalacao': {
          alerts.push('slow_ethernet')
          vibrationG = Math.max(vibrationG, (ev('vibrationG') ?? 3) * rng.float(0.6, 1))
          if (rng.bool(0.55)) {
            state = 'searching'
            downMbps *= rng.float(0.02, 0.2)
            upMbps *= rng.float(0.02, 0.2)
            lossPct = rng.float(8, 30)
            latencyMs *= rng.float(1.5, 3)
          }
          break
        }
        case 'rede': {
          state = 'searching'
          downMbps = rng.float(0, 3)
          upMbps = rng.float(0, 0.5)
          latencyMs = rng.float(400, 900)
          lossPct = (ev('lossPct') ?? 60) * rng.float(0.8, 1.1)
          snrDb = rng.float(1, 4)
          break
        }
        case 'antena': {
          const thermal = incident.evidence.some((e) => e.metric === 'thermalShutdown')
          if (thermal) {
            caseTempC = Math.max(caseTempC, (ev('caseTempC') ?? 62) + rng.float(-2, 3))
            alerts.push('thermal_throttle')
            state = rng.bool(0.5) ? 'thermal_shutdown' : 'connected'
          } else {
            alerts.push('motors_stuck')
            state = rng.bool(0.6) ? 'stowed' : 'booting'
          }
          if (state !== 'connected') {
            downMbps = 0
            upMbps = 0
            latencyMs = 0
            lossPct = 100
          }
          break
        }
        case 'obstrucao': {
          alerts.push('obstruction')
          obstructionPct = (ev('obstructionPct') ?? 22) + rng.float(-2, 2)
          downMbps *= rng.float(0.35, 0.6)
          lossPct = rng.float(4, 14)
          speedKmh = 0
          vibrationG = rng.float(0.02, 0.08)
          break
        }
      }
    }

    if (caseTempC > 60 && !alerts.includes('thermal_throttle')) alerts.push('thermal_throttle')
    if (obstructionPct > 15 && !alerts.includes('obstruction')) alerts.push('obstruction')
    if (state === 'thermal_shutdown' || state === 'stowed') powerW = rng.float(2, 6)
    const currentA = powerW / Math.max(converterV, 1)

    return {
      t,
      state,
      downMbps: round1(downMbps),
      upMbps: round1(upMbps),
      latencyMs: Math.round(latencyMs),
      lossPct: round1(Math.min(100, lossPct)),
      snrDb: round1(snrDb),
      obstructionPct: round1(obstructionPct),
      powerW: round1(powerW),
      alerts,
      reboots,
      batteryV: round1(batteryV * scale),
      converterV: round1(converterV),
      currentA: round1(currentA),
      caseTempC: round1(caseTempC),
      vibrationG: round1(vibrationG),
      ignition,
      lat: pos.lat,
      lng: pos.lng,
      speedKmh: Math.round(speedKmh),
    }
  }

  const horizonStart = Math.ceil((now - config.horizonDays * DAY) / HOUR) * HOUR
  const hourly: TelemetryPoint[] = []
  for (let t = horizonStart; t < now; t += HOUR) hourly.push(makePoint(t, HOUR))

  const fineStart = Math.floor((now - FINE_SPAN) / FINE_STEP) * FINE_STEP
  const fine: TelemetryPoint[] = []
  for (let t = fineStart; t < now; t += FINE_STEP) fine.push(makePoint(t, FINE_STEP))

  // Obstruction map: 12 sectors.
  const obstructionSectors = Array.from({ length: 12 }, () =>
    vehicle.traits.highObstruction ? rng.float(2, 9) : rng.float(0.2, 3),
  )
  const openObstruction = own.find((i) => i.category === 'obstrucao' && i.endedAt === null)
  if (openObstruction) {
    const pct = openObstruction.evidence.find((e) => e.metric === 'obstructionPct')?.value ?? 22
    for (const s of obstructionSectorsFromEvidence(openObstruction.evidence)) obstructionSectors[s] = pct * rng.float(0.9, 1.3)
  }

  const downWindows = hourly.filter((p) => p.state !== 'connected').length
  const uptimePct = hourly.length ? (1 - downWindows / hourly.length) * 100 : 100
  const todayStart = localDayStart(now)
  const rebootsToday = fine.filter((p) => p.t >= todayStart).reduce((a, p) => a + p.reboots, 0)

  return {
    vehicleId: vehicle.id,
    hourly,
    fine,
    obstructionSectors: obstructionSectors.map(round1),
    uptimePct: round1(uptimePct),
    rebootsToday,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
