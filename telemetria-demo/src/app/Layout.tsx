import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Toasts } from '../components/Toasts'
import { useDemoStore } from './store'

const NAV = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/incidentes', label: 'Incidentes' },
  { to: '/correlacao', label: 'Correlação' },
  { to: '/sla', label: 'SLA' },
  { to: '/linhas', label: 'Linhas' },
  { to: '/instaladoras', label: 'Instaladoras' },
  { to: '/roi', label: 'ROI' },
]

export function Layout() {
  const theme = useDemoStore((s) => s.theme)
  const toggleTheme = useDemoStore((s) => s.toggleTheme)
  const tenant = useDemoStore((s) => s.tenant)
  const config = useDemoStore((s) => s.config)
  const dataset = useDemoStore((s) => s.dataset)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.setProperty('--tenant-primary', tenant.primaryColor)
    root.style.setProperty('--tenant-secondary', tenant.secondaryColor)
    document.title = `${config.productName} | ${tenant.name}`
  }, [theme, tenant, config.productName])

  const liveEvent = dataset.networkEvents.find((e) => e.id === dataset.liveNetworkEventId && e.endedAt === null)

  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print sticky top-0 z-[900] border-b border-border bg-surface">
        <div className="flex h-12 items-center gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-on-tenant"
              style={{ background: tenant.primaryColor }}
            >
              {tenant.logoMark}
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">{tenant.name}</span>
              <span className="block text-[11px] text-text-3">{config.productName}</span>
            </span>
          </NavLink>
          <nav className="ml-4 flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded px-2.5 py-1 text-[13px] font-medium whitespace-nowrap ${isActive ? 'bg-surface-2 text-text' : 'text-text-2 hover:text-text'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {liveEvent && (
              <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium md:inline-flex" style={{ background: 'var(--status-network-soft)', color: 'var(--status-network)' }}>
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--status-network)' }} aria-hidden />
                Evento de rede em {liveEvent.regionLabel}
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded border border-border px-2 py-1 text-xs text-text-2 hover:text-text"
              aria-label="Alternar tema"
            >
              {theme === 'light' ? 'Tema escuro' : 'Tema claro'}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <footer className="no-print flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-text-3">
        <span>Dados fictícios gerados localmente. Seed {dataset.seed}.</span>
        {config.showPoweredBy && <span>tecnologia Star2Go</span>}
      </footer>
      <Toasts />
    </div>
  )
}
