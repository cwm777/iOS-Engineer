import type { AntennaModel, IncidentCategory, Segment, StateCode } from './model'

export interface TenantPreset {
  id: string
  name: string
  primaryColor: string
  secondaryColor: string
  /** Short text used as a generated logo mark. */
  logoMark: string
}

export interface CustomerConfig {
  id: string
  name: string
  segment: Segment
  vehicleCount: number
  states: StateCode[]
}

export type SimulationSpeed = 0 | 1 | 10 | 60

export interface DemoConfig {
  /** Seed for all deterministic generators. */
  seed: string
  /**
   * Demo clock. 'now' uses the time the page opened (rounded to 5 min).
   * 'today@HH:MM' uses today's date at that local time (keeps the story aligned with the script).
   * An ISO string pins the clock completely.
   */
  referenceTime: 'now' | `today@${string}` | string
  locale: 'pt-BR'
  timeZone: string
  activeTenantId: string
  productName: string
  showPoweredBy: boolean
  tenants: TenantPreset[]
  customers: CustomerConfig[]
  antennaMix: Record<AntennaModel, number>
  causeMix: Record<IncidentCategory, number>
  /** Share of the fleet running 24 V electrical systems. */
  share24V: number
  horizonDays: number
  /** Incidents detected by telemetry per 100 vehicles per month (not all become tickets). */
  incidentsPer100VehiclesPerMonth: number
  /** Open incidents when the demo starts (network events count once). */
  openIncidentsTarget: number
  /** Share of idle Starlink lines (no vehicle attached). */
  idleLinesShare: number
  /** Economics used by KPIs and the ROI calculator. */
  truckRollCost: number
  ticketsPer100VehiclesPerMonth: number
  remoteResolutionRate: number
  subscriptionPerVehicleMonth: number
  modulePrice: number
  slaTarget: number
  simulationSpeed: SimulationSpeed
}

export const demoConfig: DemoConfig = {
  seed: '42',
  referenceTime: 'today@14:50',
  locale: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
  activeTenantId: 'conecta',
  productName: 'Fleet Telemetry',
  showPoweredBy: true,
  tenants: [
    { id: 'conecta', name: 'Conecta Telecom', primaryColor: '#0b5fff', secondaryColor: '#0a2a66', logoMark: 'CT' },
    { id: 'satlink', name: 'SatLink Integradora', primaryColor: '#0f766e', secondaryColor: '#042f2e', logoMark: 'SL' },
    { id: 'orbita', name: 'Órbita Soluções', primaryColor: '#c2410c', secondaryColor: '#431407', logoMark: 'ÓS' },
  ],
  customers: [
    { id: 'energia-norte', name: 'Distribuidora Energia Norte', segment: 'energia', vehicleCount: 180, states: ['MA', 'PA'] },
    { id: 'rio-verde', name: 'Mineração Rio Verde', segment: 'mineracao', vehicleCount: 40, states: ['PA'] },
    { id: 'agrolog-sul', name: 'AgroLog Sul', segment: 'logistica_agricola', vehicleCount: 60, states: ['MT', 'RS'] },
  ],
  antennaMix: { mini: 0.6, standard_v4: 0.35, flat_hp: 0.05 },
  causeMix: { energia: 0.45, instalacao: 0.15, rede: 0.25, antena: 0.1, obstrucao: 0.05 },
  share24V: 0.2,
  horizonDays: 90,
  incidentsPer100VehiclesPerMonth: 36,
  openIncidentsTarget: 7,
  idleLinesShare: 0.08,
  truckRollCost: 1400,
  ticketsPer100VehiclesPerMonth: 12,
  remoteResolutionRate: 0.55,
  subscriptionPerVehicleMonth: 29,
  modulePrice: 590,
  slaTarget: 0.99,
  simulationSpeed: 1,
}

export const INSTALLERS = [
  { id: 'instala-norte', name: 'Instala Norte' },
  { id: 'teccampo', name: 'TecCampo' },
  { id: 'rotafix', name: 'RotaFix' },
  { id: 'satmontagem', name: 'SatMontagem' },
] as const

/** Installer with a clearly worse post-installation failure rate. */
export const BAD_INSTALLER_ID = 'rotafix'

/** Base used for the ongoing regional network event. */
export const LIVE_NETWORK_EVENT_BASE_ID = 'ma-imperatriz'
