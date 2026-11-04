import { createHashRouter } from 'react-router-dom'
import { Placeholder } from '../components/Placeholder'
import { OverviewPage } from '../features/overview/OverviewPage'
import { VehiclePage } from '../features/vehicle/VehiclePage'
import { Layout } from './Layout'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'veiculos/:id', element: <VehiclePage /> },
      { path: 'incidentes', element: <Placeholder title="Incidentes" iteration={2} /> },
      { path: 'correlacao', element: <Placeholder title="Correlação de frota" iteration={2} /> },
      { path: 'sla', element: <Placeholder title="SLA e relatórios" iteration={3} /> },
      { path: 'linhas', element: <Placeholder title="Linhas e inventário" iteration={3} /> },
      { path: 'instaladoras', element: <Placeholder title="Instaladoras" iteration={3} /> },
      { path: 'roi', element: <Placeholder title="Calculadora de ROI" iteration={3} /> },
    ],
  },
])
