import { formatPercent } from '../../lib/format'

interface Props {
  sectors: number[]
  size?: number
}

function wedge(cx: number, cy: number, rInner: number, rOuter: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180
  const p = (r: number, d: number) => [cx + r * Math.cos(toRad(d)), cy + r * Math.sin(toRad(d))]
  const [x1, y1] = p(rOuter, startDeg)
  const [x2, y2] = p(rOuter, endDeg)
  const [x3, y3] = p(rInner, endDeg)
  const [x4, y4] = p(rInner, startDeg)
  return `M${x1},${y1} A${rOuter},${rOuter} 0 0 1 ${x2},${y2} L${x3},${y3} A${rInner},${rInner} 0 0 0 ${x4},${y4} Z`
}

/** 12 sector obstruction map. Sector 1 points north, clockwise. Single hue, light to dark by magnitude. */
export function ObstructionRadial({ sectors, size = 220 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 14
  const rInner = size / 5
  const max = Math.max(15, ...sectors)
  const avg = sectors.reduce((a, b) => a + b, 0) / sectors.length

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} role="img" aria-label="Mapa de obstrução em 12 setores">
        {sectors.map((pct, i) => {
          const start = i * 30 + 1
          const end = (i + 1) * 30 - 1
          const intensity = Math.min(1, pct / max)
          const fill = `color-mix(in oklab, var(--series-temp) ${Math.round(15 + intensity * 85)}%, var(--surface-2))`
          const mid = i * 30 + 15
          const lx = cx + (rOuter + 8) * Math.cos(((mid - 90) * Math.PI) / 180)
          const ly = cy + (rOuter + 8) * Math.sin(((mid - 90) * Math.PI) / 180)
          return (
            <g key={i}>
              <path d={wedge(cx, cy, rInner, rOuter, start, end)} fill={fill} stroke={pct > 15 ? 'var(--status-offline)' : 'none'} strokeWidth={pct > 15 ? 2 : 0}>
                <title>{`Setor ${i + 1}: ${formatPercent(pct, 1)}`}</title>
              </path>
              <text x={lx} y={ly} fontSize={9} fill="var(--text-3)" textAnchor="middle" dominantBaseline="middle">
                {i + 1}
              </text>
            </g>
          )
        })}
        <text x={cx} y={cy - 4} fontSize={16} fontWeight={600} fill="var(--text)" textAnchor="middle">
          {formatPercent(avg, 1)}
        </text>
        <text x={cx} y={cy + 12} fontSize={10} fill="var(--text-3)" textAnchor="middle">
          média
        </text>
      </svg>
      <p className="text-[11px] text-text-3">Setor 1 ao norte, sentido horário. Contorno vermelho acima de 15%.</p>
    </div>
  )
}
