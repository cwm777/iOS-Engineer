import type { TelemetryPoint, TelemetrySeries } from '../../data/model'

export type TimeWindow = '24h' | '7d' | '30d'

export const WINDOW_LABEL: Record<TimeWindow, string> = { '24h': '24 h', '7d': '7 d', '30d': '30 d' }

const HOUR = 60 * 60 * 1000

export interface ChartPoint {
  t: number
  downMbps: number
  upMbps: number
  latencyMs: number
  lossPct: number
  batteryV: number
  converterV: number
  caseTempC: number
  vibrationG: number
  ignition: number
  reboots: number
  obstructionPct: number
}

function toChartPoint(p: TelemetryPoint): ChartPoint {
  return {
    t: p.t,
    downMbps: p.downMbps,
    upMbps: p.upMbps,
    latencyMs: p.latencyMs,
    lossPct: p.lossPct,
    batteryV: p.batteryV,
    converterV: p.converterV,
    caseTempC: p.caseTempC,
    vibrationG: p.vibrationG,
    ignition: p.ignition ? 1 : 0,
    reboots: p.reboots,
    obstructionPct: p.obstructionPct,
  }
}

function aggregate(points: TelemetryPoint[], bucketMs: number): ChartPoint[] {
  const buckets = new Map<number, TelemetryPoint[]>()
  for (const p of points) {
    const key = Math.floor(p.t / bucketMs) * bucketMs
    const list = buckets.get(key) ?? []
    list.push(p)
    buckets.set(key, list)
  }
  const avg = (list: TelemetryPoint[], f: (p: TelemetryPoint) => number) => list.reduce((a, p) => a + f(p), 0) / list.length
  return [...buckets.entries()].map(([t, list]) => ({
    t,
    downMbps: round1(avg(list, (p) => p.downMbps)),
    upMbps: round1(avg(list, (p) => p.upMbps)),
    latencyMs: Math.round(avg(list, (p) => p.latencyMs)),
    lossPct: round1(avg(list, (p) => p.lossPct)),
    batteryV: round1(Math.min(...list.map((p) => p.batteryV))),
    converterV: round1(Math.min(...list.map((p) => p.converterV))),
    caseTempC: round1(Math.max(...list.map((p) => p.caseTempC))),
    vibrationG: round1(Math.max(...list.map((p) => p.vibrationG))),
    ignition: list.some((p) => p.ignition) ? 1 : 0,
    reboots: list.reduce((a, p) => a + p.reboots, 0),
    obstructionPct: round1(Math.max(...list.map((p) => p.obstructionPct))),
  }))
}

export function chartData(series: TelemetrySeries, window: TimeWindow, now: number): ChartPoint[] {
  switch (window) {
    case '24h':
      return series.fine.map(toChartPoint)
    case '7d':
      return series.hourly.filter((p) => p.t >= now - 7 * 24 * HOUR).map(toChartPoint)
    case '30d':
      return aggregate(
        series.hourly.filter((p) => p.t >= now - 30 * 24 * HOUR),
        4 * HOUR,
      )
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
