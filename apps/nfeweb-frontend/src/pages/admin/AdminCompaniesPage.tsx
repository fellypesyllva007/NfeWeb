import { useAuth } from '../../auth'

export function AdminCompaniesPage() {
  const { user } = useAuth()
  const tenants = user?.tenants || []
  return <div className="erp-page"><header className="page-title"><span className="eyebrow">Multiempresa</span><h2>Empresas</h2><p>Empresas vinculadas ao usuário autenticado.</p></header><section className="panel">{tenants.length === 0 ? <p>Nenhuma empresa vinculada.</p> : <ul className="clean-list">{tenants.map(t => <li key={t.id}>{t.nome} - {t.role}</li>)}</ul>}</section><section className="module-blocked"><strong>Cadastro bloqueado</strong><p>Falta endpoint real de criação de tenant no backend.</p></section></div>
}
