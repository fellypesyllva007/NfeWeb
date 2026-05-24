import { useAuth } from '../../auth'

export function AdminDashboardPage() {
  const { user } = useAuth()
  return (
    <div className="erp-page">
      <header className="page-title">
        <span className="eyebrow">Administração</span>
        <h2>Painel da plataforma</h2>
        <p>Usuário autenticado: {user?.email}</p>
      </header>
      <section className="panel">
        <h3>Escopo atual</h3>
        <p>Gestão real de empresas ainda exige endpoints específicos de tenants no backend.</p>
      </section>
    </div>
  )
}
