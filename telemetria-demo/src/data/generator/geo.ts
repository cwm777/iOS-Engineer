import type { GeoPoint, OperationalBase, StateCode } from '../model'

/** Real cities used as operational bases. Weight controls how many vehicles sit there. */
export interface BaseSeed extends OperationalBase {
  weight: number
}

export const BASES: BaseSeed[] = [
  { id: 'ma-sao-luis', name: 'São Luís', state: 'MA', position: { lat: -2.53, lng: -44.3 }, hasWarehouse: true, dirtRoads: false, weight: 4 },
  { id: 'ma-imperatriz', name: 'Imperatriz', state: 'MA', position: { lat: -5.52, lng: -47.48 }, hasWarehouse: false, dirtRoads: true, weight: 5 },
  { id: 'ma-caxias', name: 'Caxias', state: 'MA', position: { lat: -4.86, lng: -43.36 }, hasWarehouse: false, dirtRoads: true, weight: 2 },
  { id: 'ma-bacabal', name: 'Bacabal', state: 'MA', position: { lat: -4.22, lng: -44.78 }, hasWarehouse: false, dirtRoads: true, weight: 2 },
  { id: 'ma-balsas', name: 'Balsas', state: 'MA', position: { lat: -7.53, lng: -46.04 }, hasWarehouse: false, dirtRoads: true, weight: 1.5 },
  { id: 'pa-belem', name: 'Belém', state: 'PA', position: { lat: -1.46, lng: -48.5 }, hasWarehouse: true, dirtRoads: false, weight: 4 },
  { id: 'pa-maraba', name: 'Marabá', state: 'PA', position: { lat: -5.37, lng: -49.12 }, hasWarehouse: false, dirtRoads: true, weight: 3 },
  { id: 'pa-castanhal', name: 'Castanhal', state: 'PA', position: { lat: -1.3, lng: -47.93 }, hasWarehouse: false, dirtRoads: false, weight: 2 },
  { id: 'pa-santarem', name: 'Santarém', state: 'PA', position: { lat: -2.44, lng: -54.7 }, hasWarehouse: false, dirtRoads: true, weight: 2 },
  { id: 'pa-tucurui', name: 'Tucuruí', state: 'PA', position: { lat: -3.77, lng: -49.67 }, hasWarehouse: false, dirtRoads: true, weight: 1.5 },
  { id: 'pa-parauapebas', name: 'Parauapebas', state: 'PA', position: { lat: -6.07, lng: -49.9 }, hasWarehouse: true, dirtRoads: true, weight: 3 },
  { id: 'pa-canaa', name: 'Canaã dos Carajás', state: 'PA', position: { lat: -6.5, lng: -49.88 }, hasWarehouse: true, dirtRoads: true, weight: 2 },
  { id: 'mt-cuiaba', name: 'Cuiabá', state: 'MT', position: { lat: -15.6, lng: -56.1 }, hasWarehouse: true, dirtRoads: false, weight: 2 },
  { id: 'mt-rondonopolis', name: 'Rondonópolis', state: 'MT', position: { lat: -16.47, lng: -54.64 }, hasWarehouse: true, dirtRoads: false, weight: 2 },
  { id: 'mt-sinop', name: 'Sinop', state: 'MT', position: { lat: -11.86, lng: -55.5 }, hasWarehouse: false, dirtRoads: true, weight: 2 },
  { id: 'mt-sorriso', name: 'Sorriso', state: 'MT', position: { lat: -12.55, lng: -55.71 }, hasWarehouse: false, dirtRoads: true, weight: 1.5 },
  { id: 'rs-porto-alegre', name: 'Porto Alegre', state: 'RS', position: { lat: -30.03, lng: -51.23 }, hasWarehouse: true, dirtRoads: false, weight: 2 },
  { id: 'rs-passo-fundo', name: 'Passo Fundo', state: 'RS', position: { lat: -28.26, lng: -52.41 }, hasWarehouse: false, dirtRoads: true, weight: 1.5 },
  { id: 'rs-santa-maria', name: 'Santa Maria', state: 'RS', position: { lat: -29.68, lng: -53.81 }, hasWarehouse: false, dirtRoads: true, weight: 1.5 },
  { id: 'rs-cruz-alta', name: 'Cruz Alta', state: 'RS', position: { lat: -28.64, lng: -53.61 }, hasWarehouse: false, dirtRoads: true, weight: 1 },
]

/** Extra waypoints (cities and highway junctions) used as route targets. */
export const WAYPOINTS: Record<StateCode, GeoPoint[]> = {
  MA: [
    { lat: -4.95, lng: -47.5 },
    { lat: -3.67, lng: -45.38 },
    { lat: -5.09, lng: -42.84 },
    { lat: -6.03, lng: -47.4 },
    { lat: -3.2, lng: -44.6 },
  ],
  PA: [
    { lat: -3.2, lng: -52.21 },
    { lat: -8.03, lng: -50.03 },
    { lat: -2.0, lng: -48.0 },
    { lat: -5.8, lng: -49.5 },
    { lat: -4.3, lng: -49.0 },
  ],
  MT: [
    { lat: -13.06, lng: -55.91 },
    { lat: -15.56, lng: -54.3 },
    { lat: -14.62, lng: -57.49 },
    { lat: -15.89, lng: -52.26 },
  ],
  RS: [
    { lat: -29.17, lng: -51.18 },
    { lat: -31.77, lng: -52.34 },
    { lat: -28.39, lng: -53.91 },
    { lat: -29.75, lng: -57.09 },
  ],
}

export const STATE_NAMES: Record<StateCode, string> = {
  MA: 'Maranhão',
  PA: 'Pará',
  MT: 'Mato Grosso',
  RS: 'Rio Grande do Sul',
}

export function lerp(a: GeoPoint, b: GeoPoint, t: number): GeoPoint {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}
