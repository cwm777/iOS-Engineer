import { BAD_INSTALLER_ID, LIVE_NETWORK_EVENT_BASE_ID, type DemoConfig } from '../config'
import type {
  Evidence,
  Incident,
  IncidentCategory,
  IncidentStatus,
  Installer,
  NetworkEvent,
  OperationalBase,
  Responsibility,
  Severity,
  Vehicle,
} from '../model'
import { Rng, childSeed } from './rng'
import { DAY, HOUR, MINUTE, TZ_OFFSET_MS, isIgnitionOn, localDayStart } from './schedule'

export interface IncidentsResult {
  incidents: Incident[]
  networkEvents: NetworkEvent[]
  heroVehicleId: string
  liveNetworkEventId: string
}

const RESPONSIBILITY: Record<IncidentCategory, Responsibility> = {
  energia: 'cliente',
  instalacao: 'cliente',
  obstrucao: 'cliente',
  rede: 'fornecedor',
  antena: 'fornecedor',
}

const SEVERITY: Record<IncidentCategory, Severity> = {
  energia: 'critica',
  antena: 'critica',
  rede: 'alta',
  instalacao: 'alta',
  obstrucao: 'media',
}

const DOWNTIME: Record<IncidentCategory, boolean> = {
  energia: true,
  antena: true,
  rede: true,
  instalacao: true,
  obstrucao: false,
}

export const PROBABLE_CAUSE: Record<IncidentCategory, string> = {
  energia: 'Fonte ou chicote de alimentação',
  instalacao: 'Cabo ou conector da instalação',
  rede: 'Evento regional da rede Starlink',
  antena: 'Hardware da antena',
  obstrucao: 'Obstrução de visada',
}

export const RECOMMENDED_ACTION: Record<IncidentCategory, string> = {
  energia: 'Substituir a fonte estabilizada na próxima parada na base. Não é necessário deslocar técnico.',
  instalacao: 'Reapertar conector e fixação do cabo na base e acionar a instaladora em garantia.',
  rede: 'Aguardar normalização da rede e registrar o evento no relatório de SLA. Não é necessário deslocar técnico.',
  antena: 'Abrir RMA da antena e programar a troca na base.',
  obstrucao: 'Reposicionar o veículo ou a antena. Não é necessário deslocar técnico.',
}

const CONFIDENCE: Record<IncidentCategory, [number, number]> = {
  energia: [88, 96],
  instalacao: [72, 85],
  rede: [90, 97],
  antena: [70, 84],
  obstrucao: [80, 92],
}

const REMOTE_RATE: Record<IncidentCategory, number> = {
  energia: 0.65,
  instalacao: 0.35,
  rede: 1,
  antena: 0.25,
  obstrucao: 0.85,
}

const DURATION_MIN: Record<IncidentCategory, [number, number]> = {
  energia: [20, 180],
  instalacao: [30, 240],
  rede: [20, 90],
  antena: [60, 480],
  obstrucao: [120, 720],
}

const fmt1 = (n: number) => n.toFixed(1).replace('.', ',')
const fmt0 = (n: number) => Math.round(n).toString()

function timeLabel(t: number): string {
  const local = t + TZ_OFFSET_MS
  const minutes = Math.floor((local % DAY) / MINUTE)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

function dateLabel(t: number): string {
  const d = new Date(t + TZ_OFFSET_MS)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

interface Ctx {
  config: DemoConfig
  now: number
  bases: Map<string, OperationalBase>
  installers: Map<string, Installer>
  vehicles: Vehicle[]
  installerCounts: Map<string, number>
}

function evidenceFor(category: IncidentCategory, rng: Rng, vehicle: Vehicle, forcedHero: boolean): Evidence[] {
  const scale = vehicle.nominalVoltage / 12
  switch (category) {
    case 'energia': {
      const minV = forcedHero ? 9.4 : rng.float(8.8, 9.9)
      const reboots = forcedHero ? 6 : rng.int(3, 8)
      return [
        { metric: 'batteryV', label: 'Tensão mínima na partida', value: Number((minV * scale).toFixed(1)), unit: 'V', threshold: 10 * scale, comparator: 'abaixo' },
        { metric: 'reboots', label: 'Reinícios no dia', value: reboots, unit: '', threshold: 2, comparator: 'acima' },
        { metric: 'latencyMs', label: 'Latência entre reinícios', value: Math.round(vehicle.traits.baseLatencyMs), unit: 'ms', threshold: 120, comparator: 'abaixo' },
      ]
    }
    case 'instalacao':
      return [
        { metric: 'vibrationG', label: 'Vibração de pico antes da queda', value: Number(rng.float(2.6, 4.2).toFixed(1)), unit: 'g', threshold: 2, comparator: 'acima' },
        { metric: 'slowEthernet', label: 'Alertas slow_ethernet em 24 h', value: rng.int(4, 14), unit: '', threshold: 2, comparator: 'acima' },
        { metric: 'batteryV', label: 'Tensão na partida', value: Number(rng.float(11.4, 12.2).toFixed(1) ) * scale, unit: 'V', threshold: 10 * scale, comparator: 'acima' },
      ]
    case 'rede':
      return [
        { metric: 'lossPct', label: 'Perda de pacotes', value: rng.int(40, 95), unit: '%', threshold: 5, comparator: 'acima' },
        { metric: 'batteryV', label: 'Tensão durante o evento', value: Number((rng.float(12.8, 14.1) * scale).toFixed(1)), unit: 'V', threshold: 10 * scale, comparator: 'acima' },
        { metric: 'caseTempC', label: 'Temperatura da case', value: rng.int(34, 48), unit: '°C', threshold: 60, comparator: 'abaixo' },
      ]
    case 'antena': {
      const thermal = rng.bool(0.5)
      return [
        { metric: 'reboots', label: 'Reinícios sem queda de tensão', value: rng.int(2, 5), unit: '', threshold: 1, comparator: 'acima' },
        { metric: thermal ? 'thermalShutdown' : 'motorsStuck', label: thermal ? 'Eventos thermal_shutdown' : 'Alertas motors_stuck', value: rng.int(2, 6), unit: '', threshold: 0, comparator: 'acima' },
        { metric: 'caseTempC', label: 'Temperatura da case', value: thermal ? rng.int(58, 71) : rng.int(36, 52), unit: '°C', threshold: 60, comparator: thermal ? 'acima' : 'abaixo' },
      ]
    }
    case 'obstrucao': {
      const first = rng.int(0, 11)
      return [
        { metric: 'obstructionPct', label: 'Obstrução', value: rng.int(18, 36), unit: '%', threshold: 15, comparator: 'acima' },
        { metric: 'obstructionSectorStart', label: 'Primeiro setor obstruído', value: first + 1, unit: '', threshold: 0, comparator: 'acima' },
        { metric: 'parkedHours', label: 'Tempo parado', value: rng.int(2, 14), unit: 'h', threshold: 1, comparator: 'acima' },
      ]
    }
  }
}

/** Sector indices (0..11) affected by an obstruction incident: three consecutive sectors. */
export function obstructionSectorsFromEvidence(evidence: Evidence[]): number[] {
  const raw = evidence.find((e) => e.metric === 'obstructionSectorStart')?.value
  if (raw === undefined) return []
  const first = Number(raw) - 1
  return [first, (first + 1) % 12, (first + 2) % 12]
}

function explanationFor(
  ctx: Ctx,
  category: IncidentCategory,
  vehicle: Vehicle,
  evidence: Evidence[],
  startedAt: number,
  extra: { regionLabel?: string; affected?: number },
): string {
  const ev = (metric: string) => evidence.find((e) => e.metric === metric)?.value ?? 0
  const isToday = localDayStart(startedAt) === localDayStart(ctx.now)
  const when = isToday ? 'hoje' : `em ${dateLabel(startedAt)}`
  switch (category) {
    case 'energia': {
      const n = ev('reboots')
      return `${numberWord(n)} reinícios ${when}, todos nos 3 segundos seguintes à ignição, com tensão de entrada caindo a ${fmt1(ev('batteryV'))} V. A antena e o link estão saudáveis entre os reinícios. Causa provável: fonte ou chicote de alimentação. Ação: substituir a fonte estabilizada na próxima parada na base. Não é necessário deslocar técnico.`
    }
    case 'instalacao': {
      const installer = ctx.installers.get(vehicle.installerId)?.name ?? 'instaladora'
      const others = Math.max(0, (ctx.installerCounts.get(vehicle.installerId) ?? 1) - 1)
      return `Alerta slow_ethernet repetido ${fmt0(ev('slowEthernet'))} vezes em 24 h e vibração de pico de ${fmt1(ev('vibrationG'))} g nos minutos anteriores à queda. Tensão e temperatura normais. Mesmo padrão em outros ${others} veículos instalados por ${installer}. Causa provável: cabo ou conector solto na instalação. Ação: reapertar conector e fixação do cabo na base e acionar a instaladora em garantia.`
    }
    case 'rede':
      return `${extra.affected ?? 0} veículos da região de ${extra.regionLabel ?? vehicle.state} degradaram juntos às ${timeLabel(startedAt)}, com tensão e temperatura normais em todos. Perda de pacotes de ${fmt0(ev('lossPct'))}% com tensão em ${fmt1(ev('batteryV'))} V. Causa provável: evento regional da rede Starlink. Ação: aguardar normalização e registrar para o relatório de SLA. Não é necessário deslocar técnico.`
    case 'antena': {
      const thermal = evidence.some((e) => e.metric === 'thermalShutdown')
      const alert = thermal ? `${fmt0(ev('thermalShutdown'))} desligamentos térmicos` : `${fmt0(ev('motorsStuck'))} alertas motors_stuck`
      return `${numberWord(ev('reboots'))} reinícios ${when} sem queda de tensão e ${alert}. Temperatura da case em ${fmt0(ev('caseTempC'))} °C. Causa provável: falha de hardware da antena. Ação: abrir RMA e programar a troca da antena na base.`
    }
    case 'obstrucao': {
      const sectors = obstructionSectorsFromEvidence(evidence)
        .map((s) => s + 1)
        .join(', ')
      return `Obstrução de ${fmt0(ev('obstructionPct'))}% concentrada nos setores ${sectors} com o veículo parado há ${fmt0(ev('parkedHours'))} h. Tensão, temperatura e rede normais. Causa provável: obstrução por estrutura próxima, galpão ou vegetação. Ação: reposicionar o veículo ou a antena. Não é necessário deslocar técnico.`
    }
  }
}

function numberWord(n: number): string {
  const words = ['Zero', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove', 'Dez']
  return words[n] ?? String(n)
}

export function generateIncidents(
  config: DemoConfig,
  vehicles: Vehicle[],
  bases: OperationalBase[],
  installers: Installer[],
  now: number,
): IncidentsResult {
  const rng = new Rng(childSeed(config.seed, 'incidents'))
  const horizonStart = now - config.horizonDays * DAY
  const baseMap = new Map(bases.map((b) => [b.id, b]))
  const installerCounts = new Map<string, number>()
  for (const ins of installers) installerCounts.set(ins.id, 0)
  const ctx: Ctx = { config, now, bases: baseMap, installers: new Map(installers.map((i) => [i.id, i])), vehicles, installerCounts }

  const incidents: Incident[] = []
  const networkEvents: NetworkEvent[] = []
  const busy = new Map<string, Array<[number, number]>>()
  let seq = 1
  const year = new Date(now + TZ_OFFSET_MS).getUTCFullYear()

  const overlaps = (vehicleId: string, start: number, end: number) =>
    (busy.get(vehicleId) ?? []).some(([s, e]) => start < e && end > s)
  const reserve = (vehicleId: string, start: number, end: number) => {
    const list = busy.get(vehicleId) ?? []
    list.push([start, end])
    busy.set(vehicleId, list)
  }

  const nextId = () => {
    const id = `inc-${String(seq).padStart(4, '0')}`
    const ticket = `CH-${year}-${String(seq).padStart(4, '0')}`
    seq++
    return { id, ticket }
  }

  const vehiclesByBase = new Map<string, Vehicle[]>()
  for (const v of vehicles) {
    const list = vehiclesByBase.get(v.baseId) ?? []
    list.push(v)
    vehiclesByBase.set(v.baseId, list)
  }

  // Hero vehicle: energy failure in the live-event region, currently with ignition on.
  const liveBaseVehicles = vehiclesByBase.get(LIVE_NETWORK_EVENT_BASE_ID) ?? []
  const heroCandidates = liveBaseVehicles.filter((v) => isIgnitionOn(v, now))
  const hero = heroCandidates.find((v) => v.traits.badPower) ?? heroCandidates[0] ?? liveBaseVehicles[0] ?? vehicles[0]
  hero.traits.badPower = true
  // The script quotes 9,4 V, so the hero runs a 12 V electrical system.
  hero.nominalVoltage = 12

  function pushIncident(
    vehicle: Vehicle,
    category: IncidentCategory,
    startedAt: number,
    endedAt: number | null,
    status: IncidentStatus,
    options: { forcedHero?: boolean; networkEventId?: string; regionLabel?: string; affected?: number; avoidedCost?: number } = {},
  ): Incident {
    const { id, ticket } = nextId()
    const evidence = evidenceFor(category, rng, vehicle, options.forcedHero ?? false)
    const [cMin, cMax] = CONFIDENCE[category]
    const durationMin = Math.round(((endedAt ?? now) - startedAt) / MINUTE)
    const avoidedCost = options.avoidedCost ?? (status === 'resolvido_remoto' ? config.truckRollCost : 0)
    const incident: Incident = {
      id,
      vehicleId: vehicle.id,
      customerId: vehicle.customerId,
      startedAt,
      endedAt,
      durationMin,
      category,
      probableCause: PROBABLE_CAUSE[category],
      confidence: options.forcedHero ? 94 : rng.int(cMin, cMax),
      explanation: explanationFor(ctx, category, vehicle, evidence, startedAt, options),
      evidence,
      recommendedAction: RECOMMENDED_ACTION[category],
      status,
      ticketNumber: ticket,
      avoidedCost,
      responsibility: RESPONSIBILITY[category],
      severity: SEVERITY[category],
      networkEventId: options.networkEventId ?? null,
      causesDowntime: DOWNTIME[category],
    }
    incidents.push(incident)
    reserve(vehicle.id, startedAt, endedAt ?? now + DAY)
    return incident
  }

  // 1. Regional network events: one live, two in the past.
  const liveStart = now - 38 * MINUTE
  const liveVehicles = rng
    .shuffle(liveBaseVehicles.filter((v) => v.id !== hero.id))
    .slice(0, 23)
  const liveBase = baseMap.get(LIVE_NETWORK_EVENT_BASE_ID)!
  const liveEvent: NetworkEvent = {
    id: 'net-001',
    baseId: liveBase.id,
    regionLabel: `${liveBase.name}/${liveBase.state}`,
    state: liveBase.state,
    startedAt: liveStart,
    endedAt: null,
    vehicleIds: liveVehicles.map((v) => v.id),
  }
  networkEvents.push(liveEvent)
  liveVehicles.forEach((v, i) =>
    pushIncident(v, 'rede', liveStart, null, 'em_diagnostico', {
      networkEventId: liveEvent.id,
      regionLabel: liveEvent.regionLabel,
      affected: liveVehicles.length,
      avoidedCost: i === 0 ? config.truckRollCost : 0,
    }),
  )

  // Past events sized so that the network share of all incidents follows the cause mix.
  const totalTarget = Math.round((vehicles.length * config.incidentsPer100VehiclesPerMonth * config.horizonDays) / (100 * 30))
  const networkTarget = Math.round(totalTarget * config.causeMix.rede)
  const remainingNetwork = Math.max(20, networkTarget - liveVehicles.length)
  const pastEventBases = rng
    .shuffle(
      bases
        .filter((b) => b.id !== LIVE_NETWORK_EVENT_BASE_ID)
        .sort((a, b) => (vehiclesByBase.get(b.id)?.length ?? 0) - (vehiclesByBase.get(a.id)?.length ?? 0))
        .slice(0, 4),
    )
    .slice(0, 2)
  const firstShare = rng.float(0.4, 0.6)
  const plannedSizes = [Math.round(remainingNetwork * firstShare), remainingNetwork - Math.round(remainingNetwork * firstShare)]
  pastEventBases.forEach((base, idx) => {
    const pool = vehiclesByBase.get(base.id) ?? []
    const count = Math.max(10, Math.min(40, plannedSizes[idx], pool.length))
    const affected = rng.shuffle(pool).slice(0, count)
    const dayOffset = rng.int(6, config.horizonDays - 10)
    const start = localDayStart(now - dayOffset * DAY) + rng.int(7, 20) * HOUR + rng.int(0, 59) * MINUTE
    const end = start + rng.int(20, 90) * MINUTE
    const event: NetworkEvent = {
      id: `net-${String(idx + 2).padStart(3, '0')}`,
      baseId: base.id,
      regionLabel: `${base.name}/${base.state}`,
      state: base.state,
      startedAt: start,
      endedAt: end,
      vehicleIds: affected.map((v) => v.id),
    }
    networkEvents.push(event)
    affected.forEach((v, i) =>
      pushIncident(v, 'rede', start, end, 'resolvido_remoto', {
        networkEventId: event.id,
        regionLabel: event.regionLabel,
        affected: affected.length,
        avoidedCost: i === 0 ? config.truckRollCost : 0,
      }),
    )
  })

  // 2. Individual incidents, split by cause mix (network share already covered by the events).
  const networkCount = incidents.length
  const otherTarget = Math.max(totalTarget - networkCount, 40)
  const otherCategories: IncidentCategory[] = ['energia', 'instalacao', 'antena', 'obstrucao']
  const otherMixTotal = otherCategories.reduce((a, c) => a + config.causeMix[c], 0)
  const counts: Record<IncidentCategory, number> = { energia: 0, instalacao: 0, antena: 0, obstrucao: 0, rede: 0 }
  for (const c of otherCategories) counts[c] = Math.round((otherTarget * config.causeMix[c]) / otherMixTotal)

  function pickVehicle(category: IncidentCategory): Vehicle {
    const weights = vehicles.map((v) => {
      switch (category) {
        case 'energia':
          return v.traits.badPower ? 6 : 1
        case 'instalacao':
          return (v.installerId === BAD_INSTALLER_ID ? 5 : 1) * (v.traits.highVibration ? 2 : 1)
        case 'antena':
          return v.traits.heatProne ? 3 : 1
        case 'obstrucao':
          return v.traits.highObstruction ? 8 : 1
        default:
          return 1
      }
    })
    return vehicles[rng.weightedIndex(weights)]
  }

  // 2a. Open incidents (started in the last 24 h, still open).
  const openIndividualTarget = Math.max(1, config.openIncidentsTarget - 1)
  const openPlanAll: IncidentCategory[] = ['energia', 'instalacao', 'antena', 'obstrucao', 'energia', 'instalacao', 'antena', 'obstrucao', 'energia']
  const openPlan = openPlanAll.slice(0, openIndividualTarget - 1)

  const heroStart = Math.max(localDayStart(now) + 15 * MINUTE, now - 6 * HOUR)
  pushIncident(hero, 'energia', heroStart, null, 'aberto', { forcedHero: true })
  counts.energia--

  for (const category of openPlan) {
    let vehicle = pickVehicle(category)
    let tries = 0
    while ((vehicle.id === hero.id || overlaps(vehicle.id, now - DAY, now + DAY)) && tries < 20) {
      vehicle = pickVehicle(category)
      tries++
    }
    const start = now - rng.int(30, 20 * 60) * MINUTE
    pushIncident(vehicle, category, start, null, rng.bool(0.5) ? 'aberto' : 'em_diagnostico')
    counts[category]--
  }

  // 2b. Historical incidents.
  for (const category of otherCategories) {
    for (let i = 0; i < counts[category]; i++) {
      let vehicle = pickVehicle(category)
      const [dMin, dMax] = DURATION_MIN[category]
      let start = horizonStart + rng.float(0, config.horizonDays * DAY - 26 * HOUR)
      let end = start + rng.int(dMin, dMax) * MINUTE
      let tries = 0
      while (overlaps(vehicle.id, start - 6 * HOUR, end + 6 * HOUR) && tries < 20) {
        vehicle = pickVehicle(category)
        start = horizonStart + rng.float(0, config.horizonDays * DAY - 26 * HOUR)
        end = start + rng.int(dMin, dMax) * MINUTE
        tries++
      }
      start = Math.round(start / MINUTE) * MINUTE
      end = Math.round(end / MINUTE) * MINUTE
      const remote = rng.bool(REMOTE_RATE[category])
      const status: IncidentStatus = remote ? 'resolvido_remoto' : 'resolvido_campo'
      pushIncident(vehicle, category, start, end, status)
    }
  }

  for (const inc of incidents) {
    if (inc.category === 'instalacao') {
      const v = vehicles.find((x) => x.id === inc.vehicleId)!
      installerCounts.set(v.installerId, (installerCounts.get(v.installerId) ?? 0) + 1)
    }
  }
  // Refresh installation explanations with the final installer counts.
  for (const inc of incidents) {
    if (inc.category === 'instalacao') {
      const v = vehicles.find((x) => x.id === inc.vehicleId)!
      inc.explanation = explanationFor(ctx, 'instalacao', v, inc.evidence, inc.startedAt, {})
    }
  }

  incidents.sort((a, b) => b.startedAt - a.startedAt)
  return { incidents, networkEvents, heroVehicleId: hero.id, liveNetworkEventId: liveEvent.id }
}
