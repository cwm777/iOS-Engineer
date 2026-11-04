import { useDemoStore } from '../app/store'

export function Toasts() {
  const toasts = useDemoStore((s) => s.toasts)
  const dismiss = useDemoStore((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 no-print">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="pointer-events-auto rounded-md border border-border bg-surface px-4 py-2.5 text-left text-sm shadow-lg"
          style={{ borderLeft: `4px solid ${t.tone === 'success' ? 'var(--status-online)' : t.tone === 'warning' ? 'var(--status-degraded)' : 'var(--tenant-primary)'}` }}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
