import { FormEvent, ReactNode, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Building2, CheckCircle2, FileSignature, Home, KeyRound, Landmark, LockKeyhole, LogOut, Package, Plus, ReceiptText, RefreshCw, Settings, ShieldCheck, ShoppingCart, UserRound, Users, Wifi } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { callNfeOperation, getAcbrInfo, getApiHealth, getDbStatus, getEmitentes } from './services/api'
import { useAuth } from './auth'

type MenuItem = { to: string; label: string; icon: typeof Home }
const adminMenu: MenuItem[] = [{ to: '/admin/dashboard', label: 'Dashboard', icon: Home }, { to: '/admin/empresas', label: 'Empresas', icon: Building2 }, { to: '/admin/status', label: 'Status fiscal', icon: Activity }]
const appMenu: MenuItem[] = [{ to: '/app/dashboard', label: 'Dashboard', icon: Home }, { to: '/app/nfe/laboratorio', label: 'NF-e laboratório', icon: FileSignature }, { to: '/app/emitentes', label: 'Emitentes', icon: Landmark }, { to: '/app/certificado', label: 'Certificado digital', icon: ShieldCheck }, { to: '/app/configuracao-fiscal', label: 'Configuração fiscal', icon: Settings }, { to: '/app/clientes', label: 'Clientes', icon: Users }, { to: '/app/produtos', label: 'Produtos', icon: Package }, { to: '/app/vendas', label: 'Vendas', icon: ShoppingCart }, { to: '/app/nfe/historico', label: 'Histórico de notas', icon: ReceiptText }, { to: '/app/status', label: 'Status fiscal', icon: Activity }]

export default function AuthenticatedApp() {
  return <Routes>
    <Route path="/" element={<Navigate to="/admin/login" replace />} />
    <Route path="/admin/login" element={<LoginPage kind="admin" />} />
    <Route path="/login" element={<LoginPage kind="company" />} />
    <Route path="/admin" element={<RequireAuth admin><Layout title="NfeWeb Admin" subtitle="Gestão multiempresa" menu={adminMenu} /></RequireAuth>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard admin />} />
      <Route path="empresas" element={<CompaniesPage />} />
      <Route path="status" element={<StatusPage />} />
    </Route>
    <Route path="/app" element={<RequireAuth><Layout title="NfeWeb ERP" subtitle="Operação fiscal" menu={appMenu} /></RequireAuth>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="nfe/laboratorio" element={<NfeLabPage />} />
      <Route path="emitentes" element={<EmitentesPage />} />
      <Route path="certificado" element={<CertificatePage />} />
      <Route path="configuracao-fiscal" element={<FiscalConfigPage />} />
      <Route path="clientes" element={<Placeholder title="Clientes" text="Cadastro de destinatários para emissão automática da NF-e." icon={<Users />} />} />
      <Route path="produtos" element={<Placeholder title="Produtos" text="Cadastro de itens com NCM, CFOP, unidade e preço." icon={<Package />} />} />
      <Route path="vendas" element={<Placeholder title="Vendas" text="Pedidos e vendas serão a origem da emissão fiscal." icon={<ShoppingCart />} />} />
      <Route path="nfe/historico" element={<Placeholder title="Histórico de notas" text="Aguardando persistência fiscal para listar XMLs, protocolos e rejeições." icon={<ReceiptText />} />} />
      <Route path="status" element={<StatusPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/admin/login" replace />} />
  </Routes>
}

function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenMessage title="Validando sessão" text="Consultando /api/auth/me..." />
  if (!user) return <Navigate to={admin ? '/admin/login' : '/login'} state={{ from: location.pathname }} replace />
  if (admin && !user.is_platform_admin) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function LoginPage({ kind }: { kind: 'admin' | 'company' }) {
  const { login, user, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(kind === 'admin' ? 'admin@nfeweb.local' : 'empresa@nfeweb.local')
  const [password, setPassword] = useState('')
  if (user) return <Navigate to={kind === 'admin' && user.is_platform_admin ? '/admin/dashboard' : '/app/dashboard'} replace />
  async function submit(event: FormEvent) { event.preventDefault(); await login(email, password, kind); navigate(kind === 'admin' ? '/admin/dashboard' : '/app/dashboard') }
  return <div className="auth-page"><section className="auth-hero"><div className="brand-mark"><ReceiptText /></div><h1>NfeWeb ERP</h1><p>ERP fiscal multiempresa com autenticação real, sessão por cookie HttpOnly e operação NF-e no backend.</p><div className="hero-grid"><MiniStat label="Auth" value="Cookie HttpOnly" /><MiniStat label="API" value="/api/auth" /><MiniStat label="Deploy" value="Nginx + HTTPS" /></div></section><form className="auth-card" onSubmit={submit}><span className="eyebrow">{kind === 'admin' ? 'Painel da plataforma' : 'Painel da empresa'}</span><h2>{kind === 'admin' ? 'Login administrador' : 'Login da empresa'}</h2><p>Entre com o usuário cadastrado no backend.</p><label>E-mail<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username" /></label><label>Senha<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Digite sua senha" autoComplete="current-password" /></label>{error ? <div className="alert info">{error}</div> : null}<button disabled={loading} className="primary-button"><LockKeyhole size={18} /> {loading ? 'Entrando...' : 'Entrar'}</button><div className="auth-switch">{kind === 'admin' ? <Link to="/login">Entrar como empresa</Link> : <Link to="/admin/login">Entrar como administrador</Link>}</div></form></div>
}

function Layout({ title, subtitle, menu }: { title: string; subtitle: string; menu: MenuItem[] }) {
  const { user, logout } = useAuth(); const navigate = useNavigate()
  async function exit() { await logout(); navigate(title.includes('Admin') ? '/admin/login' : '/login') }
  return <div className="app-shell"><aside className="sidebar"><div className="sidebar-brand"><div className="brand-icon"><ReceiptText /></div><div><strong>{title}</strong><span>{subtitle}</span></div></div><nav>{menu.map(i => { const Icon = i.icon; return <NavLink key={i.to} to={i.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18}/>{i.label}</NavLink> })}</nav><button className="logout-button" onClick={exit}><LogOut size={18}/> Sair</button></aside><main className="main-content"><header className="topbar"><div><span className="eyebrow">Sessão autenticada</span><h1>{user?.nome || 'NfeWeb'}</h1></div><div className="topbar-user"><UserRound size={18}/>{user?.email}</div></header><Outlet /></main></div>
}

function Dashboard({ admin = false }: { admin?: boolean }) { return <Page title={admin ? 'Dashboard administrativo' : 'Dashboard da empresa'} text={admin ? 'Gestão de empresas e saúde da plataforma.' : 'Operação fiscal com fluxo guiado.'}><Metrics><Metric title="API fiscal" value="0.9" icon={<Wifi/>} tone="info"/><Metric title="Emitentes" value="1" icon={<Landmark/>} tone="success"/><Metric title="Certificado" value="Lab" icon={<KeyRound/>} tone="warning"/></Metrics><Panel title="Próximas etapas"><ul className="clean-list"><li>Persistir cadastro de empresas pelo backend.</li><li>Registrar XMLs, rejeições, eventos e logs fiscais.</li><li>Trocar senha inicial e configurar certificado ICP-Brasil.</li></ul></Panel></Page> }
function CompaniesPage() { const [rows,setRows]=useState([['Laboratório ACBr','92.390.477/0001-49','SP','Simples Nacional','Homologação','Ativa']]); const [name,setName]=useState(''); const [cnpj,setCnpj]=useState(''); function add(e:FormEvent){e.preventDefault(); if(!name||!cnpj)return; setRows([...rows,[name,cnpj,'SP','Simples Nacional','Homologação','Pendente']]); setName(''); setCnpj('')} return <Page title="Empresas" text="Cadastro inicial multiempresa."><Panel title="Nova empresa"><form className="grid-form" onSubmit={add}><input placeholder="Nome fantasia" value={name} onChange={e=>setName(e.target.value)}/><input placeholder="CNPJ" value={cnpj} onChange={e=>setCnpj(e.target.value)}/><button className="primary-button"><Plus size={18}/> Cadastrar empresa</button></form></Panel><Panel title="Empresas cadastradas"><Table columns={['Empresa','CNPJ','UF','Regime','Ambiente','Status']} rows={rows}/></Panel></Page> }
function StatusPage(){ const health=useQuery({queryKey:['health'],queryFn:getApiHealth}); const acbr=useQuery({queryKey:['acbr'],queryFn:getAcbrInfo}); const db=useQuery({queryKey:['db'],queryFn:getDbStatus}); return <Page title="Status fiscal" text="Diagnóstico integrado com a NfeWeb API."><Metrics><StatusMetric title="API" query={health}/><StatusMetric title="ACBr" query={acbr}/><StatusMetric title="SQLite" query={db}/></Metrics><Panel title="Retorno técnico"><pre className="json-box">{JSON.stringify({health:health.data,acbr:acbr.data,db:db.data},null,2)}</pre></Panel></Page> }
function EmitentesPage(){ const q=useQuery({queryKey:['emitentes'],queryFn:getEmitentes}); const d:any=q.data; const rows=(Array.isArray(d?.emitentes)?d.emitentes:[]).map((x:any)=>[x.id||x.emitter_id||'-',x.razao_social||'-',x.cnpj||'-',x.uf||'-',String(x.ambiente||'-')]); return <Page title="Emitentes fiscais" text="Emitentes vindos do SQLite fiscal."><Panel title="Lista"><Table columns={['ID','Razão social','CNPJ','UF','Ambiente']} rows={rows.length?rows:[['emit_lab_acbr_sample','RAZAO SOCIAL - LAB ACBr','92390477000149','SP','Homologação']]}/></Panel></Page> }
function NfeLabPage(){ const [emitterId,setEmitterId]=useState('emit_lab_acbr_sample'); const [result,setResult]=useState<any>({status:'idle'}); const m=useMutation({mutationFn:(op:string)=>callNfeOperation(op,{emitter_id:emitterId,include_xml:false}),onSuccess:setResult,onError:e=>setResult({status:'error',message:e instanceof Error?e.message:'Erro'})}); const ops=[['gerar-chave','Gerar chave'],['carregar-ini','Carregar INI'],['assinar','Assinar XML'],['validar-regras','Validar regras'],['status-servico','Status SEFAZ']]; return <Page title="NF-e laboratório" text="Fluxo guiado para validar o motor fiscal."><Panel title="Contexto"><div className="lab-controls"><label>Emitente<input value={emitterId} onChange={e=>setEmitterId(e.target.value)}/></label></div><div className="operation-grid">{ops.map(([op,label],i)=><button key={op} className="operation-button" disabled={m.isPending} onClick={()=>m.mutate(op)}><span>{i+1}</span>{m.isPending?'Executando...':label}</button>)}</div></Panel><Panel title="Resultado"><pre className="json-box">{JSON.stringify(result,null,2)}</pre></Panel></Page> }
function CertificatePage(){ return <Placeholder title="Certificado digital" text="A senha/PFX ficam protegidos no backend." icon={<ShieldCheck/>}/> }
function FiscalConfigPage(){ return <Page title="Configuração fiscal" text="Parâmetros fiscais do emitente."><Panel title="Configuração atual"><Table columns={['Campo','Valor']} rows={[[ 'Modelo','55 - NF-e'],['Série','1'],['Ambiente','Homologação'],['UF','SP']]}/></Panel></Page> }
function Placeholder({title,text,icon}:{title:string;text:string;icon:ReactNode}){return <Page title={title} text={text}><section className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p></section></Page>}
function FullScreenMessage({title,text}:{title:string;text:string}){return <div className="auth-page"><section className="auth-hero"><div className="brand-mark"><ReceiptText/></div><h1>{title}</h1><p>{text}</p></section></div>}
function Page({title,text,children}:{title:string;text:string;children:ReactNode}){return <div className="page"><div className="page-header"><div><h2>{title}</h2><p>{text}</p></div></div>{children}</div>}
function Panel({title,children}:{title:string;children:ReactNode}){return <section className="panel"><div className="panel-header"><h3>{title}</h3></div>{children}</section>}
function Metrics({children}:{children:ReactNode}){return <div className="metric-grid">{children}</div>}
function Metric({title,value,icon,tone}:{title:string;value:string;icon:ReactNode;tone:string}){return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><span>{title}</span><strong>{value}</strong></div>}
function StatusMetric({title,query}:{title:string;query:any}){return <Metric title={title} value={query.isLoading?'...':query.isError?'Offline':'Online'} icon={query.isError?<RefreshCw/>:<CheckCircle2/>} tone={query.isError?'warning':'success'}/>}
function MiniStat({label,value}:{label:string;value:string}){return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div>}
function Table({columns,rows}:{columns:string[];rows:string[][]}){return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}
