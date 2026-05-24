import { useQuery } from '@tanstack/react-query'
import { getAcbrInfo, getApiHealth, getDbStatus, getEmitentes } from '../../services/api'

export function DashboardPage() {
  const health = useQuery({ queryKey: ['dashboard-health'], queryFn: getApiHealth })
  const acbr = useQuery({ queryKey: ['dashboard-acbr'], queryFn: getAcbrInfo })
  const db = useQuery({ queryKey: ['dashboard-db'], queryFn: getDbStatus })
  const emitters = useQuery({ queryKey: ['dashboard-emitters'], queryFn: getEmitentes })
  const data = emitters.data as any
  const totalEmitters = Array.isArray(data?.emitentes) ? data.emitentes.length : 0

  return (
    <div className="erp-page">
      <header className="page-title">
        <span className="eyebrow">Operação fiscal</span>
        <h2>Dashboard</h2>
        <p>Resumo operacional baseado nos endpoints reais disponíveis.</p>
      </header>
      <div className="status-grid">
        <div className="status-card"><span>API</span><strong>{health.isError ? 'Offline' : health.isLoading ? '...' : 'Online'}</strong></div>
        <div className="status-card"><span>ACBr</span><strong>{acbr.isError ? 'Erro' : acbr.isLoading ? '...' : 'Operacional'}</strong></div>
        <div className="status-card"><span>SQLite</span><strong>{db.isError ? 'Erro' : db.isLoading ? '...' : 'Conectado'}</strong></div>
        <div className="status-card"><span>Emitentes</span><strong>{emitters.isLoading ? '...' : String(totalEmitters)}</strong></div>
      </div>
      <section className="panel"><h3>Próximos módulos</h3><p>Notas, clientes, produtos e vendas serão exibidos somente quando houver endpoints reais no backend.</p></section>
    </div>
  )
}
