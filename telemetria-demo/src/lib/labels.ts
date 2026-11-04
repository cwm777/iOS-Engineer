import type {
  AntennaModel,
  AntennaState,
  IncidentCategory,
  IncidentStatus,
  KitModel,
  Responsibility,
  Segment,
  Severity,
  VehicleStatus,
  VehicleType,
} from '../data/model'

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  online: 'Online',
  degraded: 'Degradado',
  offline: 'Offline',
  parked: 'Estacionado',
}

export const VEHICLE_STATUS_COLOR: Record<VehicleStatus, string> = {
  online: 'var(--status-online)',
  degraded: 'var(--status-degraded)',
  offline: 'var(--status-offline)',
  parked: 'var(--status-parked)',
}

export const VEHICLE_STATUS_SOFT: Record<VehicleStatus, string> = {
  online: 'var(--status-online-soft)',
  degraded: 'var(--status-degraded-soft)',
  offline: 'var(--status-offline-soft)',
  parked: 'var(--status-parked-soft)',
}

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  caminhao_leve: 'Caminhão leve',
  caminhonete: 'Caminhonete',
  caminhao_cesto: 'Caminhão cesto',
  van: 'Van',
}

export const ANTENNA_LABEL: Record<AntennaModel, string> = {
  mini: 'Starlink Mini',
  standard_v4: 'Standard V4',
  flat_hp: 'Flat High Performance',
}

export const KIT_LABEL: Record<KitModel, string> = {
  gobox_mini: 'GoBox Mini',
  kit_v4: 'Kit V4',
  kit_fhp: 'Kit FHP',
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  energia: 'Distribuição de energia',
  mineracao: 'Mineração',
  logistica_agricola: 'Logística agrícola',
}

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  energia: 'Energia',
  instalacao: 'Instalação',
  rede: 'Rede Starlink',
  antena: 'Antena',
  obstrucao: 'Obstrução',
}

export const CATEGORY_COLOR: Record<IncidentCategory, string> = {
  energia: 'var(--status-offline)',
  instalacao: 'var(--status-degraded)',
  rede: 'var(--status-network)',
  antena: 'var(--series-temp)',
  obstrucao: 'var(--series-vibration)',
}

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  aberto: 'Aberto',
  em_diagnostico: 'Em diagnóstico',
  resolvido_remoto: 'Resolvido remoto',
  tecnico_acionado: 'Técnico acionado',
  resolvido_campo: 'Resolvido em campo',
}

export const RESPONSIBILITY_LABEL: Record<Responsibility, string> = {
  fornecedor: 'Fornecedor',
  cliente: 'Cliente',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
}

export const SEVERITY_RANK: Record<Severity, number> = { critica: 0, alta: 1, media: 2 }

export const ANTENNA_STATE_LABEL: Record<AntennaState, string> = {
  connected: 'Conectada',
  searching: 'Buscando',
  booting: 'Iniciando',
  stowed: 'Recolhida',
  thermal_shutdown: 'Desligamento térmico',
}

export const STATE_LABEL: Record<string, string> = {
  MA: 'Maranhão',
  PA: 'Pará',
  MT: 'Mato Grosso',
  RS: 'Rio Grande do Sul',
}
