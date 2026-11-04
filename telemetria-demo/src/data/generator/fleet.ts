import { BAD_INSTALLER_ID, INSTALLERS, type DemoConfig } from '../config'
import type { AntennaModel, Customer, Installer, KitModel, OperationalBase, Vehicle, VehicleType } from '../model'
import { BASES, WAYPOINTS, lerp } from './geo'
import { Rng, childSeed } from './rng'

const DAY = 24 * 60 * 60 * 1000

const KIT_BY_ANTENNA: Record<AntennaModel, KitModel> = {
  mini: 'gobox_mini',
  standard_v4: 'kit_v4',
  flat_hp: 'kit_fhp',
}

const VEHICLE_TYPES_BY_SEGMENT: Record<Customer['segment'], Record<VehicleType, number>> = {
  energia: { caminhao_cesto: 0.45, caminhonete: 0.35, caminhao_leve: 0.1, van: 0.1 },
  mineracao: { caminhonete: 0.5, caminhao_leve: 0.3, caminhao_cesto: 0.05, van: 0.15 },
  logistica_agricola: { caminhao_leve: 0.55, caminhonete: 0.3, van: 0.1, caminhao_cesto: 0.05 },
}

const FIRMWARES = ['2025.41.0', '2025.44.1', '2025.47.0', '2026.03.2', '2026.07.0']

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function mercosulPlate(rng: Rng): string {
  const l = () => LETTERS[rng.int(0, 25)]
  const d = () => String(rng.int(0, 9))
  return `${l()}${l()}${l()}${d()}${l()}${d()}${d()}`
}

/** Expands a share map into a shuffled list of exactly `total` items matching the shares. */
function quotaList<T extends string>(shares: Record<T, number>, total: number, rng: Rng): T[] {
  const keys = Object.keys(shares) as T[]
  const counts = keys.map((k) => Math.floor(shares[k] * total))
  let remaining = total - counts.reduce((a, b) => a + b, 0)
  const remainders = keys.map((k, i) => ({ i, r: shares[k] * total - counts[i] })).sort((a, b) => b.r - a.r)
  for (const { i } of remainders) {
    if (remaining <= 0) break
    counts[i]++
    remaining--
  }
  const list: T[] = []
  keys.forEach((k, i) => {
    for (let n = 0; n < counts[i]; n++) list.push(k)
  })
  return rng.shuffle(list)
}

export interface FleetResult {
  customers: Customer[]
  bases: OperationalBase[]
  installers: Installer[]
  vehicles: Vehicle[]
}

export function generateFleet(config: DemoConfig, now: number): FleetResult {
  const rng = new Rng(childSeed(config.seed, 'fleet'))
  const customers: Customer[] = config.customers.map((c) => ({ ...c }))
  const installers: Installer[] = INSTALLERS.map((i) => ({ ...i }))
  const vehicles: Vehicle[] = []
  const usedPlates = new Set<string>()

  let seq = 1
  for (const customer of customers) {
    const customerBases = BASES.filter((b) => customer.states.includes(b.state))
    // Mining customer only operates from pit bases; energy distributor from non-pit bases.
    const eligible =
      customer.segment === 'mineracao'
        ? customerBases.filter((b) => b.id === 'pa-parauapebas' || b.id === 'pa-canaa')
        : customer.segment === 'energia'
          ? customerBases.filter((b) => b.id !== 'pa-parauapebas' && b.id !== 'pa-canaa')
          : customerBases
    const weights = eligible.map((b) => b.weight)
    const antennaQuota = quotaList(config.antennaMix, customer.vehicleCount, rng)

    for (let i = 0; i < customer.vehicleCount; i++) {
      const base = eligible[rng.weightedIndex(weights)]
      const antenna = antennaQuota[i]
      const type = rng.weighted(VEHICLE_TYPES_BY_SEGMENT[customer.segment])
      let plate = mercosulPlate(rng)
      while (usedPlates.has(plate)) plate = mercosulPlate(rng)
      usedPlates.add(plate)

      const installerWeights = installers.map((ins) => (ins.id === BAD_INSTALLER_ID ? 1.2 : 1))
      const installer = installers[rng.weightedIndex(installerWeights)]
      const installedAt = now - rng.int(5, 18 * 30) * DAY
      const nominalVoltage: 12 | 24 = rng.bool(config.share24V) ? 24 : 12

      const antennaProfile = {
        mini: { down: [70, 140], up: [8, 18], lat: [38, 60] },
        standard_v4: { down: [110, 220], up: [12, 28], lat: [32, 55] },
        flat_hp: { down: [150, 260], up: [15, 32], lat: [30, 50] },
      }[antenna]

      const waypoints = WAYPOINTS[base.state]
      const routeTarget = lerp(base.position, rng.pick(waypoints), rng.float(0.3, 1))
      const badPowerRate = installer.id === BAD_INSTALLER_ID ? 0.22 : 0.1

      vehicles.push({
        id: `v-${String(seq).padStart(3, '0')}`,
        plate,
        customerId: customer.id,
        baseId: base.id,
        state: base.state,
        type,
        antenna,
        kit: KIT_BY_ANTENNA[antenna],
        installerId: installer.id,
        installedAt,
        firmware: rng.pick(FIRMWARES),
        status: 'online',
        position: { ...base.position },
        ignitionOn: true,
        lastSeenAt: now,
        nominalVoltage,
        network: 'starlink',
        traits: {
          badPower: rng.bool(badPowerRate),
          highObstruction: customer.segment === 'mineracao' ? rng.bool(0.5) : base.hasWarehouse ? rng.bool(0.25) : rng.bool(0.05),
          highVibration: type === 'caminhao_cesto' ? rng.bool(0.7) : base.dirtRoads ? rng.bool(0.45) : rng.bool(0.1),
          heatProne: rng.bool(customer.segment === 'mineracao' ? 0.35 : 0.15),
          baseDownMbps: rng.float(antennaProfile.down[0], antennaProfile.down[1]),
          baseUpMbps: rng.float(antennaProfile.up[0], antennaProfile.up[1]),
          baseLatencyMs: rng.float(antennaProfile.lat[0], antennaProfile.lat[1]),
          routeTarget,
        },
      })
      seq++
    }
  }

  return { customers, bases: BASES.map(({ weight: _w, ...b }) => b), installers, vehicles }
}
