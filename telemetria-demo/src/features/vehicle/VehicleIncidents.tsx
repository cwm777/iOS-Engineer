import { CategoryBadge, IncidentStatusBadge } from '../../components/StatusBadge'
import type { Incident } from '../../data/model'
import { formatDateTime, formatDuration } from '../../lib/format'

export function VehicleIncidents({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) return <p className="p-4 text-sm text-text-3">Nenhum incidente nos últimos 90 dias.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-text-3">
            <th className="px-4 py-2 font-medium">Início</th>
            <th className="px-2 py-2 font-medium">Duração</th>
            <th className="px-2 py-2 font-medium">Causa</th>
            <th className="px-2 py-2 font-medium">Causa provável</th>
            <th className="px-2 py-2 font-medium">Confiança</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Chamado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {incidents.map((i) => (
            <tr key={i.id}>
              <td className="whitespace-nowrap px-4 py-2">{formatDateTime(i.startedAt)}</td>
              <td className="whitespace-nowrap px-2 py-2">{i.endedAt === null ? 'em andamento' : formatDuration(i.durationMin)}</td>
              <td className="px-2 py-2">
                <CategoryBadge category={i.category} />
              </td>
              <td className="px-2 py-2 text-text-2">{i.probableCause}</td>
              <td className="px-2 py-2">{i.confidence}%</td>
              <td className="px-2 py-2">
                <IncidentStatusBadge status={i.status} />
              </td>
              <td className="px-4 py-2 font-mono text-xs text-text-3">{i.ticketNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
