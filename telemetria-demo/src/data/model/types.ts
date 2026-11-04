/** Network technology. Only Starlink in this version; kept as a field for future extension. */
export type Network = 'starlink'

export type StateCode = 'MA' | 'PA' | 'MT' | 'RS'

export type Segment = 'energia' | 'mineracao' | 'logistica_agricola'

export interface Customer {
  id: string
  name: string
  segment: Segment
  vehicleCount: number
  states: StateCode[]
}

export type VehicleType = 'caminhao_leve' | 'caminhonete' | 'caminhao_cesto' | 'van'
export type AntennaModel = 'mini' | 'standard_v4' | 'flat_hp'
export type KitModel = 'gobox_mini' | 'kit_v4' | 'kit_fhp'
export type VehicleStatus = 'online' | 'degraded' | 'offline' | 'parked'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface OperationalBase {
  id: string
  name: string
  state: StateCode
  position: GeoPoint
  /** Bases with warehouses or pits have higher obstruction baseline. */
  hasWarehouse: boolean
  /** Dirt roads around the base raise vibration. */
  dirtRoads: boolean
}

export interface Installer {
  id: string
  name: string
}

/** Hidden characteristics that drive the telemetry generator. */
export interface VehicleTraits {
  badPower: boolean
  highObstruction: boolean
  highVibration: boolean
  heatProne: boolean
  baseDownMbps: number
  baseUpMbps: number
  baseLatencyMs: number
  /** Deterministic route: the vehicle travels between its base and this point. */
  routeTarget: GeoPoint
}

export interface Vehicle {
  id: string
  plate: string
  customerId: string
  baseId: string
  state: StateCode
  type: VehicleType
  antenna: AntennaModel
  kit: KitModel
  installerId: string
  installedAt: number
  firmware: string
  status: VehicleStatus
  position: GeoPoint
  ignitionOn: boolean
  lastSeenAt: number
  nominalVoltage: 12 | 24
  network: Network
  traits: VehicleTraits
}

export type AntennaState = 'connected' | 'searching' | 'booting' | 'stowed' | 'thermal_shutdown'

export type AntennaAlert =
  | 'thermal_throttle'
  | 'motors_stuck'
  | 'slow_ethernet'
  | 'obstruction'
  | 'unexpected_location'

export interface TelemetryPoint {
  /** Epoch ms, start of the window. */
  t: number
  state: AntennaState
  downMbps: number
  upMbps: number
  latencyMs: number
  lossPct: number
  snrDb: number
  obstructionPct: number
  powerW: number
  alerts: AntennaAlert[]
  reboots: number
  /** Minimum battery voltage observed in the window (captures ignition dips). */
  batteryV: number
  converterV: number
  currentA: number
  caseTempC: number
  /** Peak vibration in the window, in g. */
  vibrationG: number
  ignition: boolean
  lat: number
  lng: number
  speedKmh: number
}

export interface TelemetrySeries {
  vehicleId: string
  /** 1 hour resolution over the whole horizon (90 days). */
  hourly: TelemetryPoint[]
  /** 5 minute resolution over the last 24 hours. */
  fine: TelemetryPoint[]
  /** Obstruction per 12 sectors, in percent. Sector 0 points north, clockwise. */
  obstructionSectors: number[]
  uptimePct: number
  rebootsToday: number
}

export type IncidentCategory = 'energia' | 'instalacao' | 'rede' | 'antena' | 'obstrucao'

export type IncidentStatus =
  | 'aberto'
  | 'em_diagnostico'
  | 'resolvido_remoto'
  | 'tecnico_acionado'
  | 'resolvido_campo'

export type Responsibility = 'fornecedor' | 'cliente'

export type Severity = 'critica' | 'alta' | 'media'

export interface Evidence {
  metric: string
  label: string
  value: number
  unit: string
  threshold: number
  comparator: 'acima' | 'abaixo'
}

export interface Incident {
  id: string
  vehicleId: string
  customerId: string
  startedAt: number
  endedAt: number | null
  durationMin: number
  category: IncidentCategory
  probableCause: string
  confidence: number
  explanation: string
  evidence: Evidence[]
  recommendedAction: string
  status: IncidentStatus
  ticketNumber: string
  avoidedCost: number
  responsibility: Responsibility
  severity: Severity
  networkEventId: string | null
  /** True when the incident causes loss of connectivity (counts against availability). */
  causesDowntime: boolean
}

export interface NetworkEvent {
  id: string
  baseId: string
  regionLabel: string
  state: StateCode
  startedAt: number
  endedAt: number | null
  vehicleIds: string[]
}

export interface Dataset {
  seed: string
  generatedAt: number
  now: number
  customers: Customer[]
  bases: OperationalBase[]
  installers: Installer[]
  vehicles: Vehicle[]
  incidents: Incident[]
  networkEvents: NetworkEvent[]
  /** Id of the vehicle used in the energy scene (6 reboots, 9,4 V). */
  heroVehicleId: string
  /** Id of the ongoing regional network event. */
  liveNetworkEventId: string
}
