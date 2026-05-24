import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

const company = [
  ['/app/dashboard','Início'],['/app/nfe/nova','Nova NF-e'],['/app/nfe/historico','Notas fiscais'],['/app/clientes','Clientes'],['/app/produtos','Produtos'],['/app/vendas','Vendas'],['/app/emitentes','Emitentes'],['/app/certificado','Certificado'],['/app/configuracao-fiscal','Configuração'],['/app/status','Status fiscal']
]
const adminMenu = [['/admin/dashboard','Painel'],['/admin/empresas','Empresas'],['/admin/status','Status fiscal']]

export function AppLayout({ admin = false }: { admin?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menu = admin ? adminMenu : company
  const tenant = user?.tenants?.[0]
  async function exit() { await logout(); navigate(admin ? '/admin/login' : '/login') }
  return <div className="erp-shell"><aside className="erp-sidebar"><div className="erp-brand"><div className="erp-brand-mark">NF</div><div><strong>NfeWeb</strong><span>{admin ? 'Admin' : tenant?.nome || 'Empresa'}</span></div></div><nav className="erp-nav">{menu.map(([to,label])=><NavLink key={to} to={to} className={({isActive})=>isActive?'erp-nav-link active':'erp-nav-link'}>{label}</NavLink>)}</nav><button className="erp-logout" onClick={exit}>Sair</button></aside><main className="erp-main"><header className="erp-topbar"><div><span className="eyebrow">Ambiente fiscal</span><h1>{admin ? 'Gestão multiempresa' : tenant?.nome || 'Operação fiscal'}</h1></div><div className="erp-user">{user?.email}</div></header><Outlet /></main></div>
}
