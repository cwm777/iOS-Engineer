import type { ReactNode } from 'react'
import { Area, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDayTime, formatNumber, formatTime } from '../../lib/format'
import type { ChartPoint, TimeWindow } from './aggregate'

interface Props {
  data: ChartPoint[]
  window: TimeWindow
  nominalVoltage: 12 | 24
}

const SYNC = 'vehicle-telemetry'

function Panel({ title, height = 120, children }: { title: string; height?: number; children: ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-3 pt-2 text-[11px] font-medium uppercase tracking-wide text-text-3">{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

export function TelemetryCharts({ data, window, nominalVoltage }: Props) {
  if (data.length === 0) return <p className="p-4 text-sm text-text-3">Sem telemetria na janela.</p>
  const domain: [number, number] = [data[0].t, data[data.length - 1].t]
  const tick = (t: number) => (window === '24h' ? formatTime(t) : formatDayTime(t))
  const reboots = data.filter((p) => p.reboots > 0).map((p) => p.t)
  const voltageLimit = 10 * (nominalVoltage / 12)

  const common = {
    data,
    syncId: SYNC,
    margin: { top: 6, right: 16, bottom: 0, left: 0 },
  }
  const xAxis = (visible: boolean) => (
    <XAxis
      dataKey="t"
      type="number"
      domain={domain}
      tickFormatter={tick}
      tick={visible ? { fontSize: 11 } : false}
      axisLine={false}
      tickLine={false}
      height={visible ? 24 : 4}
      minTickGap={48}
    />
  )
  const tooltip = (formatter: (value: number, name: string) => [string, string]) => (
    <Tooltip
      labelFormatter={(t) => formatDayTime(Number(t))}
      formatter={(value, name) => formatter(Number(value), String(name))}
      isAnimationActive={false}
      cursor={{ stroke: 'var(--text-3)', strokeDasharray: '3 3' }}
    />
  )
  const rebootLines = reboots.map((t) => <ReferenceLine key={t} x={t} stroke="var(--status-offline)" strokeDasharray="2 2" />)

  return (
    <div>
      <Panel title="Throughput (Mbps)" height={140}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(false)}
            <YAxis width={44} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            {tooltip((v, n) => [`${formatNumber(v, 1)} Mbps`, n === 'downMbps' ? 'Download' : 'Upload'])}
            <Legend verticalAlign="top" height={20} iconType="plainline" formatter={(v) => (v === 'downMbps' ? 'Download' : 'Upload')} wrapperStyle={{ fontSize: 11 }} />
            {rebootLines}
            <Line type="monotone" dataKey="downMbps" stroke="var(--series-down)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="upMbps" stroke="var(--series-up)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Latência (ms)" height={100}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(false)}
            <YAxis width={44} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            {tooltip((v) => [`${formatNumber(v)} ms`, 'Latência'])}
            <Line type="monotone" dataKey="latencyMs" stroke="var(--series-latency)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Perda de pacotes (%)" height={90}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(false)}
            <YAxis width={44} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            {tooltip((v) => [`${formatNumber(v, 1)}%`, 'Perda'])}
            <Area type="step" dataKey="lossPct" stroke="var(--series-loss)" fill="var(--series-loss)" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title={`Tensão (V), limite ${formatNumber(voltageLimit, 0)} V`} height={140}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(false)}
            <YAxis width={44} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[Math.min(8, voltageLimit - 2), nominalVoltage === 24 ? 30 : 15]} />
            {tooltip((v, n) => [`${formatNumber(v, 1)} V`, n === 'batteryV' ? 'Bateria (mín.)' : 'Saída do conversor'])}
            <Legend verticalAlign="top" height={20} iconType="plainline" formatter={(v) => (v === 'batteryV' ? 'Bateria (mín. na janela)' : 'Saída do conversor')} wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={voltageLimit} stroke="var(--status-offline)" strokeDasharray="4 3" label={{ value: `${formatNumber(voltageLimit, 0)} V`, position: 'insideTopRight', fontSize: 10, fill: 'var(--status-offline)' }} />
            {rebootLines}
            <Line type="monotone" dataKey="batteryV" stroke="var(--series-battery)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="converterV" stroke="var(--series-converter)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Temperatura da case (°C), limite 60 °C" height={100}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(false)}
            <YAxis width={44} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[10, 80]} />
            {tooltip((v) => [`${formatNumber(v, 1)} °C`, 'Case'])}
            <ReferenceLine y={60} stroke="var(--status-offline)" strokeDasharray="4 3" />
            <Line type="monotone" dataKey="caseTempC" stroke="var(--series-temp)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Vibração de pico (g)" height={90}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(false)}
            <YAxis width={44} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 5]} />
            {tooltip((v) => [`${formatNumber(v, 1)} g`, 'Vibração'])}
            <Line type="monotone" dataKey="vibrationG" stroke="var(--series-vibration)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Ignição" height={70}>
        <ResponsiveContainer>
          <ComposedChart {...common}>
            {xAxis(true)}
            <YAxis width={44} tick={false} axisLine={false} tickLine={false} domain={[0, 1]} />
            {tooltip((v) => [v ? 'Ligada' : 'Desligada', 'Ignição'])}
            <Area type="step" dataKey="ignition" stroke="var(--series-ignition)" fill="var(--series-ignition)" fillOpacity={0.35} strokeWidth={1} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>
      {reboots.length > 0 && (
        <p className="px-3 py-2 text-[11px] text-text-3">
          Linhas verticais tracejadas marcam reinícios da antena ({reboots.length} na janela).
        </p>
      )}
    </div>
  )
}
