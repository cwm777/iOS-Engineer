import { useMemo } from 'react'
import { useDemoStore } from '../../app/store'
import { formatDateTime } from '../../lib/format'

export function VehicleActions({ vehicleId, plate }: { vehicleId: string; plate: string }) {
  const pushToast = useDemoStore((s) => s.pushToast)
  const logVehicleAction = useDemoStore((s) => s.logVehicleAction)
  const allLog = useDemoStore((s) => s.vehicleLog)
  const log = useMemo(() => allLog.filter((e) => e.vehicleId === vehicleId), [allLog, vehicleId])

  const act = (message: string, toast: string, tone: 'info' | 'success' | 'warning' = 'success') => {
    logVehicleAction(vehicleId, message)
    pushToast(toast, tone)
  }

  const btn = 'rounded border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text hover:bg-surface-2'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => act('Comando de reinício enviado à antena', `Reinício da antena de ${plate} enviado`)}>
          Reiniciar antena
        </button>
        <button type="button" className={btn} onClick={() => act('Comando de recolhimento (stow) enviado à antena', `Antena de ${plate} recolhendo (stow)`, 'warning')}>
          Recolher antena (stow)
        </button>
        <button
          type="button"
          className="rounded px-3 py-1.5 text-[13px] font-medium text-on-tenant"
          style={{ background: 'var(--tenant-primary)' }}
          onClick={() => act('Chamado aberto no sistema da revenda', `Chamado aberto para ${plate}`, 'info')}
        >
          Abrir chamado
        </button>
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-text-3">Log do veículo</div>
        {log.length === 0 ? (
          <p className="mt-1 text-xs text-text-3">Nenhuma ação registrada nesta sessão.</p>
        ) : (
          <ul className="mt-1 divide-y divide-border text-xs">
            {log.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 py-1">
                <span>{e.message}</span>
                <span className="whitespace-nowrap text-text-3">{formatDateTime(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
