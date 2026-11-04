import { useState } from 'react'
import type { Vehicle } from '../../data/model'
import { VEHICLE_STATUS_COLOR } from '../../lib/labels'
import { VehicleSummaryCard } from './VehicleSummaryCard'

/** Simplified Brazil outline, [lng, lat], clockwise from the far north. */
const BRAZIL: Array<[number, number]> = [
  [-60.0, 5.2], [-59.7, 4.0], [-58.5, 1.5], [-56.0, 2.0], [-54.0, 2.3], [-51.7, 4.2], [-51.0, 3.0], [-50.5, 2.0], [-50.0, 0.5],
  [-49.5, -0.2], [-48.5, -0.8], [-47.0, -0.7], [-45.5, -1.5], [-44.3, -2.5], [-43.0, -2.5], [-41.8, -2.9], [-40.5, -2.9],
  [-38.5, -3.7], [-37.0, -4.8], [-35.3, -5.1], [-35.0, -6.0], [-34.8, -7.1], [-35.0, -8.5], [-35.5, -9.5], [-36.5, -10.5],
  [-37.3, -11.5], [-38.0, -12.8], [-38.8, -13.5], [-39.0, -14.5], [-39.0, -16.0], [-39.3, -17.5], [-39.7, -19.0], [-40.3, -20.3],
  [-41.0, -21.5], [-41.9, -22.9], [-43.5, -23.0], [-44.7, -23.3], [-46.3, -24.0], [-47.5, -24.8], [-48.5, -25.5], [-48.6, -26.5],
  [-48.6, -27.6], [-49.3, -28.8], [-50.2, -30.2], [-51.0, -31.2], [-52.0, -32.3], [-53.4, -33.7], [-53.6, -33.2], [-55.6, -30.9],
  [-56.0, -30.2], [-57.6, -30.2], [-57.1, -29.8], [-56.0, -28.7], [-55.1, -27.9], [-54.7, -27.6], [-53.7, -27.15], [-53.8, -26.3],
  [-54.6, -25.6], [-54.4, -24.5], [-54.3, -24.0], [-55.3, -24.0], [-55.6, -23.0], [-55.5, -22.5], [-56.3, -22.2], [-57.6, -22.1],
  [-57.9, -21.5], [-57.7, -20.5], [-58.1, -19.9], [-57.8, -18.0], [-58.4, -17.4], [-58.3, -16.3], [-60.2, -16.3], [-60.5, -15.1],
  [-60.3, -13.9], [-61.0, -13.5], [-63.0, -12.5], [-64.5, -12.4], [-65.3, -11.3], [-65.4, -9.8], [-66.6, -9.9], [-68.0, -10.7],
  [-69.6, -10.9], [-70.6, -9.5], [-72.0, -9.8], [-73.0, -9.4], [-73.9, -7.3], [-73.2, -6.6], [-72.9, -5.0], [-71.5, -4.5],
  [-69.9, -4.3], [-69.4, -1.1], [-68.0, -0.2], [-67.0, 1.2], [-66.0, 1.6], [-65.5, 2.2], [-64.0, 2.5], [-64.0, 4.1], [-62.8, 4.0],
  [-61.0, 4.5], [-60.6, 5.2],
]

const STATES: Record<string, Array<[number, number]>> = {
  MA: [
    [-46.1, -1.05], [-45.0, -1.6], [-44.3, -2.4], [-43.5, -2.4], [-42.9, -2.6], [-41.8, -2.9], [-42.4, -3.8], [-42.8, -4.3],
    [-43.0, -5.3], [-43.4, -6.3], [-44.0, -7.1], [-44.6, -7.5], [-45.2, -8.6], [-45.9, -9.5], [-46.0, -10.2], [-46.5, -9.7],
    [-47.0, -9.3], [-47.3, -8.3], [-47.4, -7.3], [-47.4, -6.5], [-47.6, -5.6], [-48.0, -4.9], [-47.3, -3.8], [-46.8, -2.8],
    [-46.5, -2.0],
  ],
  PA: [
    [-46.1, -1.05], [-47.0, -0.7], [-48.0, -0.8], [-48.5, -1.3], [-48.6, -0.5], [-49.5, -0.2], [-50.6, 0.1], [-51.5, -0.5],
    [-52.0, -0.5], [-52.8, 0.5], [-53.5, 1.5], [-54.5, 2.2], [-56.0, 2.0], [-57.5, 1.9], [-58.2, 1.5], [-58.0, -0.5],
    [-57.0, -1.8], [-58.0, -2.5], [-58.2, -4.5], [-57.9, -7.2], [-58.3, -9.9], [-56.0, -9.8], [-54.0, -9.3], [-52.0, -9.8],
    [-50.5, -9.8], [-50.2, -8.0], [-49.0, -6.5], [-48.5, -5.5], [-48.0, -4.9], [-47.3, -3.8], [-46.8, -2.8], [-46.5, -2.0],
  ],
  MT: [
    [-58.3, -9.9], [-56.0, -9.8], [-54.0, -9.3], [-52.0, -9.8], [-50.5, -9.8], [-50.6, -11.5], [-51.0, -13.0], [-51.5, -14.5],
    [-52.0, -15.5], [-52.3, -16.3], [-53.0, -17.0], [-53.8, -17.3], [-54.5, -17.5], [-55.5, -17.3], [-56.5, -17.2], [-58.1, -17.3],
    [-58.3, -16.3], [-60.2, -16.3], [-60.5, -15.1], [-60.3, -13.9], [-61.0, -13.5], [-61.6, -13.0], [-60.8, -11.5], [-60.3, -10.2],
    [-61.0, -9.3], [-60.5, -8.0], [-58.5, -7.5],
  ],
  RS: [
    [-49.7, -29.3], [-50.2, -30.2], [-51.0, -31.2], [-52.0, -32.3], [-53.4, -33.7], [-53.6, -33.2], [-55.6, -30.9], [-56.0, -30.2],
    [-57.6, -30.2], [-57.1, -29.8], [-56.0, -28.7], [-55.1, -27.9], [-54.7, -27.6], [-53.7, -27.15], [-53.0, -27.2], [-52.0, -27.3],
    [-51.0, -27.6], [-50.0, -28.2],
  ],
}

const SCALE = 10
const toX = (lng: number) => (lng + 74) * SCALE
const toY = (lat: number) => (5.5 - lat) * SCALE
const path = (pts: Array<[number, number]>) => pts.map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'}${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`).join(' ') + ' Z'

interface Props {
  vehicles: Vehicle[]
  highlightIds?: Set<string>
}

export function SvgFallbackMap({ vehicles, highlightIds }: Props) {
  const [selected, setSelected] = useState<Vehicle | null>(null)
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 410 400" className="h-full w-full" role="img" aria-label="Mapa do Brasil com veículos">
        <path d={path(BRAZIL)} fill="var(--surface-2)" stroke="var(--text-3)" strokeWidth={0.8} />
        {Object.entries(STATES).map(([code, pts]) => (
          <g key={code}>
            <path d={path(pts)} fill="color-mix(in oklab, var(--tenant-primary) 8%, var(--surface))" stroke="var(--text-3)" strokeWidth={0.6} />
            <text x={toX(pts.reduce((a, p) => a + p[0], 0) / pts.length)} y={toY(pts.reduce((a, p) => a + p[1], 0) / pts.length)} fontSize={9} fill="var(--text-3)" textAnchor="middle">
              {code}
            </text>
          </g>
        ))}
        {vehicles.map((v) => {
          const highlighted = highlightIds?.has(v.id)
          return (
            <circle
              key={v.id}
              cx={toX(v.position.lng)}
              cy={toY(v.position.lat)}
              r={highlighted ? 4.2 : 3}
              fill={VEHICLE_STATUS_COLOR[v.status]}
              stroke="var(--surface)"
              strokeWidth={0.8}
              className="cursor-pointer"
              onClick={() => setSelected(v)}
            >
              <title>{v.plate}</title>
            </circle>
          )
        })}
      </svg>
      <div className="absolute left-2 top-2 rounded bg-surface/90 px-2 py-1 text-[11px] text-text-3">Mapa offline (sem tiles)</div>
      {selected && (
        <div className="absolute right-2 top-2 rounded-md border border-border bg-surface p-3 shadow-lg">
          <button type="button" onClick={() => setSelected(null)} className="absolute right-2 top-1 text-text-3" aria-label="Fechar">
            x
          </button>
          <VehicleSummaryCard vehicle={selected} />
        </div>
      )}
    </div>
  )
}
