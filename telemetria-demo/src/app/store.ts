import { create } from 'zustand'
import { demoConfig, type DemoConfig, type TenantPreset } from '../data/config'
import { buildDataset, TelemetryCache } from '../data/generator'
import type { Dataset, Incident, Vehicle, VehicleStatus } from '../data/model'

export type Theme = 'light' | 'dark'

export interface OverviewFilters {
  customerId: string | 'all'
  state: string | 'all'
  antenna: string | 'all'
  status: VehicleStatus | 'all'
}

export interface VehicleLogEntry {
  id: string
  vehicleId: string
  at: number
  message: string
}

export interface Toast {
  id: string
  message: string
  tone: 'info' | 'success' | 'warning'
}

interface DemoState {
  config: DemoConfig
  dataset: Dataset
  telemetry: TelemetryCache
  theme: Theme
  tenant: TenantPreset
  filters: OverviewFilters
  vehicleLog: VehicleLogEntry[]
  toasts: Toast[]
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setTenant: (id: string) => void
  setFilters: (patch: Partial<OverviewFilters>) => void
  resetFilters: () => void
  logVehicleAction: (vehicleId: string, message: string) => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void
  resetDemo: () => void
}

const DEFAULT_FILTERS: OverviewFilters = { customerId: 'all', state: 'all', antenna: 'all', status: 'all' }

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem('fleet-demo-theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* storage unavailable */
  }
  return 'light'
}

function build(config: DemoConfig) {
  const dataset = buildDataset(config)
  return { dataset, telemetry: new TelemetryCache(config, dataset) }
}

let idSeq = 1
const nextId = () => `local-${idSeq++}`

export const useDemoStore = create<DemoState>((set, get) => ({
  config: demoConfig,
  ...build(demoConfig),
  theme: initialTheme(),
  tenant: demoConfig.tenants.find((t) => t.id === demoConfig.activeTenantId) ?? demoConfig.tenants[0],
  filters: DEFAULT_FILTERS,
  vehicleLog: [],
  toasts: [],
  setTheme: (theme) => {
    try {
      window.localStorage.setItem('fleet-demo-theme', theme)
    } catch {
      /* storage unavailable */
    }
    set({ theme })
  },
  toggleTheme: () => get().setTheme(get().theme === 'light' ? 'dark' : 'light'),
  setTenant: (id) => {
    const tenant = get().config.tenants.find((t) => t.id === id)
    if (tenant) set({ tenant })
  },
  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  logVehicleAction: (vehicleId, message) =>
    set({ vehicleLog: [{ id: nextId(), vehicleId, at: Date.now(), message }, ...get().vehicleLog] }),
  pushToast: (message, tone = 'info') => {
    const id = nextId()
    set({ toasts: [...get().toasts, { id, message, tone }] })
    window.setTimeout(() => get().dismissToast(id), 4000)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  updateIncident: (id, patch) => {
    const dataset = get().dataset
    set({
      dataset: {
        ...dataset,
        incidents: dataset.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      },
    })
  },
  resetDemo: () => {
    set({ ...build(get().config), vehicleLog: [], filters: DEFAULT_FILTERS })
    get().pushToast('Demo reiniciada a partir da seed', 'info')
  },
}))

export function useVehicle(id: string | undefined): Vehicle | undefined {
  return useDemoStore((s) => (id ? s.dataset.vehicles.find((v) => v.id === id) : undefined))
}
