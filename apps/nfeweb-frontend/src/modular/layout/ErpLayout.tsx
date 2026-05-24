import { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, Building2, FilePlus2, Files, Home, Landmark, LogOut, Package, ReceiptText, Settings, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../../auth'

const adminMenu = [
  { to: '/admin/dashboard', label: 'Painel', icon: Home },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/status', label: 'Status fiscal', icon: Activity },
]

const companyMenu = [
  { to: '/app/dashboard', label: 'Painel', icon: Home },
  { to: '/app/nfe/nova', label: 'Nova NF-e', icon: FilePlus2 },
  { to: '/app/nfe/historico', label: 'Notas fiscais', icon: Files },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/produtos', label: 'Produtos', icon: Package },
  { to: '/app/emitentes', label: 'Emitentes', icon: Landmark },
  { to: '/app/certificado', label: 'Certificado', icon: ShieldCheck },
  { to: '/app/configuracao-fiscal', label: 'Configuração', icon: Settings },
  { to: '/app/status', label: 'Status fiscal', icon: Activity },
]

export function ErpLayout({ admin = false }: { admin?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menu = admin ? adminMenu : companyMenu
  async function exit() {
    await logout()
    navigate(admin ? '/admin/login' : '/login')
  }
  return <div className="m-shell"><aside className="m-sidebar"><div className="m-brand"><div className="m-logo"><ReceiptText size={24}/></div><div><strong>NfeWeb</strong><span>{admin ? 'Admin' : 'Emissor NF-e'}</span></div></div><nav>{menu.map(item => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} className={({isActive}) => isActive ? 'active' : ''}><Icon size={18}/>{item.label}</NavLink> })}</nav><button className="m-logout" onClick={exit}><LogOut size={18}/> Sair</button></aside><main className="m-main"><header className="m-topbar"><div><strong>{admin ? 'Gestão multiempresa' : 'Operação fiscal'}</strong><span>{user?.nome} · {user?.email}</span></div><div className="m-env"><span>Homologação</span><small>API online</small></div></header><Outlet /></main></div>
}

export function AuthGate({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="m-loading">Validando sessão...</div>
  if (!user) return null
  if (admin && !user.is_platform_admin) return <div className="m-loading">Acesso administrativo não autorizado.</div>
  return <>{children}</>
}
