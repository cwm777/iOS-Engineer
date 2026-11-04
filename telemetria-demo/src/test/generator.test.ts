import { describe, expect, it } from 'vitest'
import { demoConfig } from '../data/config'
import { buildDataset, TelemetryCache } from '../data/generator'
import type { IncidentCategory } from '../data/model'

const CLOCK = new Date('2026-11-04T14:50:00-03:00').getTime()

function stripVolatile(ds: ReturnType<typeof buildDataset>) {
  const { generatedAt: _g, ...rest } = ds
  return rest
}

describe('deterministic generator', () => {
  const ds = buildDataset(demoConfig, CLOCK)

  it('generates the configured fleet volumes', () => {
    expect(ds.vehicles).toHaveLength(280)
    for (const c of ds.customers) {
      expect(ds.vehicles.filter((v) => v.customerId === c.id)).toHaveLength(c.vehicleCount)
    }
    expect(ds.installers).toHaveLength(4)
    expect(new Set(ds.vehicles.map((v) => v.plate)).size).toBe(280)
  })

  it('respects the antenna mix within tolerance', () => {
    const n = ds.vehicles.length
    for (const [model, share] of Object.entries(demoConfig.antennaMix)) {
      const actual = ds.vehicles.filter((v) => v.antenna === model).length / n
      expect(Math.abs(actual - share)).toBeLessThan(0.06)
    }
  })

  it('respects the cause mix within tolerance', () => {
    const n = ds.incidents.length
    expect(n).toBeGreaterThan(200)
    for (const cat of Object.keys(demoConfig.causeMix) as IncidentCategory[]) {
      const actual = ds.incidents.filter((i) => i.category === cat).length / n
      expect(Math.abs(actual - demoConfig.causeMix[cat])).toBeLessThan(0.07)
    }
  })

  it('has between 6 and 10 open incidents, counting a network event once', () => {
    const open = ds.incidents.filter((i) => i.endedAt === null)
    const individual = open.filter((i) => i.networkEventId === null).length
    const events = new Set(open.filter((i) => i.networkEventId !== null).map((i) => i.networkEventId)).size
    expect(individual + events).toBeGreaterThanOrEqual(6)
    expect(individual + events).toBeLessThanOrEqual(10)
    const categories = new Set(open.map((i) => i.category))
    expect(categories.size).toBeGreaterThanOrEqual(4)
  })

  it('has three regional network events, one of them live', () => {
    expect(ds.networkEvents).toHaveLength(3)
    const live = ds.networkEvents.find((e) => e.id === ds.liveNetworkEventId)!
    expect(live.endedAt).toBeNull()
    expect(live.vehicleIds.length).toBeGreaterThanOrEqual(10)
    for (const e of ds.networkEvents) {
      expect(e.vehicleIds.length).toBeGreaterThanOrEqual(10)
      expect(e.vehicleIds.length).toBeLessThanOrEqual(40)
    }
  })

  it('has a hero energy incident with 6 reboots and 9,4 V', () => {
    const hero = ds.incidents.find((i) => i.vehicleId === ds.heroVehicleId && i.endedAt === null)!
    expect(hero.category).toBe('energia')
    expect(hero.evidence.find((e) => e.metric === 'batteryV')?.value).toBeCloseTo(9.4 * (ds.vehicles.find((v) => v.id === ds.heroVehicleId)!.nominalVoltage / 12), 1)
    expect(hero.evidence.find((e) => e.metric === 'reboots')?.value).toBe(6)
    expect(hero.explanation).toContain('Seis reinícios')
    const series = new TelemetryCache(demoConfig, ds).get(ds.heroVehicleId)
    expect(series.rebootsToday).toBe(6)
  })

  it('is deterministic for the same seed and differs for another seed', () => {
    const again = buildDataset(demoConfig, CLOCK)
    expect(stripVolatile(again)).toEqual(stripVolatile(ds))
    const other = buildDataset({ ...demoConfig, seed: '7' }, CLOCK)
    expect(other.vehicles.map((v) => v.plate)).not.toEqual(ds.vehicles.map((v) => v.plate))
    const t1 = new TelemetryCache(demoConfig, ds).get('v-010')
    const t2 = new TelemetryCache(demoConfig, again).get('v-010')
    expect(t1).toEqual(t2)
  })

  it('generates telemetry with the expected resolution', () => {
    const series = new TelemetryCache(demoConfig, ds).get('v-001')
    expect(series.fine).toHaveLength(288)
    expect(series.hourly).toHaveLength(90 * 24)
    expect(series.obstructionSectors).toHaveLength(12)
  })

  it('builds the dataset quickly', () => {
    const start = performance.now()
    buildDataset(demoConfig, CLOCK)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
