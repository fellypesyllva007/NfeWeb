import { FormEvent, ReactNode, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { Activity, BarChart3, Building2, CheckCircle2, FileSignature, FileText, Home, KeyRound, Landmark, LockKeyhole, LogOut, Package, Plus, ReceiptText, RefreshCw, Settings, ShieldCheck, ShoppingCart, UserRound, Users, Wifi } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, callNfeOperation, getAcbrInfo, getApiHealth, getDbStatus, getEmitentes } from './services/api'

type MenuItem = { to: string; label: string; icon: typeof Home }
type Company = { id: string; name: string; legalName: string; cnpj: string; uf: string; city: string; taxRegime: string; environment: string; status: string }

const adminMenu: MenuItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/status', label: 'Status fiscal', icon: Activity },
]

const appMenu: MenuItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/nfe/laboratorio', label: 'NF-e laboratório', icon: FileSignature },
  { to: '/app/nfe/historico', label: 'Histórico de notas', icon: ReceiptText },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/produtos', label: 'Produtos', icon: Package },
  { to: '/app/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/app/emitentes', label: 'Emitentes', icon: Landmark },
  { to: '/app/certificado', label: 'Certificado digital', icon: ShieldCheck },
  { to: '/app/configuracao-fiscal', label: 'Configuração fiscal', icon: Settings },
  { to: '/app/status', label: 'Status fiscal', icon: Activity },
]

const initialCompanies: Company[] = [{ id: 'tenant_lab', name: 'Laboratório ACBr', legalName: 'RAZAO SOCIAL - LAB ACBr', cnpj: '92.390.477/0001-49', uf: 'SP', city: 'São Paulo', taxRegime: 'Simples Nacional', environment: 'Homologação', status: 'Ativa' }]

export default function AppShell() {
  return <Routes>
    <Route path="/" element={<Navigate to="/admin/login" replace />} />
    <Route path="/admin/login" element={<LoginPage admin />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin" element={<Layout title="NfeWeb Admin" subtitle="Gestão multiempresa" menu={adminMenu} exitTo="/admin/login" />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="empresas" element={<CompaniesPage />} />
      <Route path="status" element={<StatusPage />} />
    </Route>
    <Route path="/app" element={<Layout title="NfeWeb ERP" subtitle="Operação fiscal" menu={appMenu} exitTo="/login" />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<CompanyDashboard />} />
      <Route path="nfe/laboratorio" element={<NfeLabPage />} />
      <Route path="nfe/historico" element={<Placeholder title="Histórico de notas" text="Aguardando persistência fiscal para listar XMLs, protocolos e rejeições." icon={<ReceiptText />} />} />
      <Route path="clientes" element={<Placeholder title="Clientes" text="Cadastro de destinatários para emissão automática da NF-e." icon={<Users />} />} />
      <Route path="produtos" element={<Placeholder title="Produtos" text="Cadastro de itens com NCM, CFOP, unidade e preço." icon={<Package />} />} />
      <Route path="vendas" element={<Placeholder title="Vendas" text="Pedidos e vendas serão a origem da emissão fiscal." icon={<ShoppingCart />} />} />
      <Route path="emitentes" element={<EmitentesPage />} />
      <Route path="certificado" element={<CertificatePage />} />
      <Route path="configuracao-fiscal" element={<FiscalConfigPage />} />
      <Route path="status" element={<StatusPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/admin/login" replace />} />
  </Routes>
}

function LoginPage({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(admin ? 'admin@nfeweb.local' : 'empresa@nfeweb.local')
  function submit(event: FormEvent) { event.preventDefault(); localStorage.setItem('nfeweb.session', email); navigate(admin ? '/admin/dashboard' : '/app/dashboard') }
  return <div className="auth-page"><section className="auth-hero"><div className="brand-mark"><ReceiptText /></div><h1>NfeWeb ERP</h1><p>ERP fiscal multiempresa moderno para NF-e, automação tributária e operação em Oracle Cloud Ubuntu ARM64.</p><div className="hero-grid"><MiniStat label="Frontend" value="React + Vite" /><MiniStat label="Backend" value="NfeWeb API" /><MiniStat label="Deploy" value="Nginx" /></div></section><form className="auth-card" onSubmit={submit}><span className="eyebrow">{admin ? 'Painel da plataforma' : 'Painel da empresa'}</span><h2>{admin ? 'Login administrador' : 'Login da empresa'}</h2><label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></label><label>Senha<input defaultValue="123456" type="password" /></label><button className="primary-button"><LockKeyhole size={18} /> Entrar</button><div className="auth-switch">{admin ? <Link to="/login">Entrar como empresa</Link> : <Link to="/admin/login">Entrar como administrador</Link>}</div></form></div>
}

function Layout({ title, subtitle, menu, exitTo }: { title: string; subtitle: string; menu: MenuItem[]; exitTo: string }) {
  const navigate = useNavigate()
  return <div className="app-shell"><aside className="sidebar"><div className="sidebar-brand"><div className="brand-icon"><ReceiptText /></div><div><strong>{title}</strong><span>{subtitle}</span></div></div><nav>{menu.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18} />{item.label}</NavLink> })}</nav><button className="logout-button" onClick={() => { localStorage.removeItem('nfeweb.session'); navigate(exitTo) }}><LogOut size={18} /> Sair</button></aside><main className="main-content"><header className="topbar"><div><span className="eyebrow">Oracle Cloud MVP</span><h1>ERP fiscal multiempresa</h1></div><div className="topbar-user"><UserRound size={18} /> sessão local</div></header><Outlet /></main></div>
}

function AdminDashboard() { return <Page title="Dashboard administrativo" text="Gestão das empresas, saúde fiscal e evolução do MVP."><Metrics><Metric title="Empresas ativas" value="1" icon={<Building2 />} tone="success" /><Metric title="API fiscal" value="0.9" icon={<Wifi />} tone="info" /><Metric title="Ambiente" value="Homologação" icon={<Activity />} tone="warning" /><Metric title="Certificado" value="Lab" icon={<KeyRound />} tone="neutral" /></Metrics><Panel title="Próximas etapas"><ul className="clean-list"><li>Conectar autenticação real com cookies HttpOnly.</li><li>Persistir empresas/tenants no backend.</li><li>Registrar XMLs, rejeições, eventos e logs fiscais.</li><li>Validar certificado ICP-Brasil com CNPJ habilitado.</li></ul></Panel></Page> }
function CompanyDashboard() { return <Page title="Dashboard da empresa" text="Operação fiscal com fluxo limpo, guiado e cálculo automático."><Metrics><Metric title="Notas emitidas" value="0" icon={<FileText />} tone="neutral" /><Metric title="Status SEFAZ" value="Lab" icon={<Activity />} tone="warning" /><Metric title="Emitentes" value="1" icon={<Landmark />} tone="success" /><Metric title="Cálculos" value="Auto" icon={<BarChart3 />} tone="info" /></Metrics><Panel title="Fluxo de emissão moderna"><div className="wizard-preview">{['Emitente','Destinatário','Produtos','Impostos','Revisão','Transmitir'].map((x,i)=><span key={x}>{i+1}. {x}</span>)}</div></Panel></Page> }

function CompaniesPage() {
  const [companies, setCompanies] = useState(initialCompanies)
  const [form, setForm] = useState({ name: '', legalName: '', cnpj: '', uf: 'SP', city: '', taxRegime: 'Simples Nacional' })
  function add(event: FormEvent) { event.preventDefault(); if (!form.name || !form.cnpj) return; setCompanies([...companies, { id: String(Date.now()), ...form, environment: 'Homologação', status: 'Pendente' }]); setForm({ name: '', legalName: '', cnpj: '', uf: 'SP', city: '', taxRegime: 'Simples Nacional' }) }
  return <Page title="Empresas" text="Cadastro inicial de múltiplas empresas para o ERP."><Panel title="Nova empresa"><form className="grid-form" onSubmit={add}><input placeholder="Nome fantasia" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/><input placeholder="Razão social" value={form.legalName} onChange={(e)=>setForm({...form,legalName:e.target.value})}/><input placeholder="CNPJ" value={form.cnpj} onChange={(e)=>setForm({...form,cnpj:e.target.value})}/><input placeholder="UF" value={form.uf} onChange={(e)=>setForm({...form,uf:e.target.value.toUpperCase()})}/><input placeholder="Cidade" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/><select value={form.taxRegime} onChange={(e)=>setForm({...form,taxRegime:e.target.value})}><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option></select><button className="primary-button"><Plus size={18}/> Cadastrar empresa</button></form></Panel><Panel title="Empresas cadastradas"><Table columns={['Empresa','CNPJ','UF','Regime','Ambiente','Status']} rows={companies.map(c=>[c.name,c.cnpj,c.uf,c.taxRegime,c.environment,c.status])}/></Panel></Page>
}

function StatusPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: getApiHealth })
  const acbr = useQuery({ queryKey: ['acbr'], queryFn: getAcbrInfo })
  const db = useQuery({ queryKey: ['db'], queryFn: getDbStatus })
  return <Page title="Status fiscal" text="Diagnóstico integrado com a NfeWeb API."><Metrics><StatusMetric title="API" query={health}/><StatusMetric title="ACBr" query={acbr}/><StatusMetric title="SQLite" query={db}/><Metric title="Base URL" value={String(api.defaults.baseURL || '/api')} icon={<Wifi/>} tone="info"/></Metrics><Panel title="Retorno técnico"><pre className="json-box">{JSON.stringify({health:health.data, acbr:acbr.data, db:db.data}, null, 2)}</pre></Panel></Page>
}

function EmitentesPage() {
  const query = useQuery({ queryKey: ['emitentes'], queryFn: getEmitentes })
  const data: any = query.data
  const rows = Array.isArray(data) ? data : Array.isArray(data?.emitentes) ? data.emitentes : [{ emitter_id:'emit_lab_acbr_sample', razao_social:'RAZAO SOCIAL - LAB ACBr', cnpj:'92390477000149', uf:'SP', ambiente:'Homologação' }]
  return <Page title="Emitentes fiscais" text="Emitentes vinculados ao tenant selecionado."><Panel title="Lista de emitentes"><Table columns={['ID','Razão social','CNPJ','UF','Ambiente']} rows={rows.map((x:any)=>[x.emitter_id || x.id || '-', x.razao_social || x.nome || '-', x.cnpj || '-', x.uf || '-', String(x.ambiente ?? '-')])}/></Panel></Page>
}

function CertificatePage() { return <Page title="Certificado digital" text="Certificado A1 deve ser protegido pelo backend."><Metrics><Metric title="Certificado" value="Lab" icon={<ShieldCheck/>} tone="warning"/><Metric title="Senha" value="Oculta" icon={<KeyRound/>} tone="success"/><Metric title="PFX" value="Backend" icon={<LockKeyhole/>} tone="info"/></Metrics><Alert>O frontend não deve exibir senha do certificado nem operar o PFX diretamente no fluxo comum.</Alert></Page> }
function FiscalConfigPage() { return <Page title="Configuração fiscal" text="Parâmetros fiscais do emitente."><Panel title="Configuração atual"><Table columns={['Campo','Valor']} rows={[[ 'Modelo','55 - NF-e'],['Série','1'],['Ambiente','Homologação'],['UF','SP'],['Próximo número','1'],['Cálculo','Backend oficial + prévia no frontend']]}/></Panel></Page> }

function NfeLabPage() {
  const [emitterId, setEmitterId] = useState('emit_lab_acbr_sample')
  const [result, setResult] = useState<any>({ status: 'idle', message: 'Escolha uma etapa para executar.' })
  const mutation = useMutation({ mutationFn: (op: string) => callNfeOperation(op, { emitter_id: emitterId, include_xml: false }), onSuccess: setResult, onError: (e) => setResult({ status:'error', message: e instanceof Error ? e.message : 'Erro inesperado' }) })
  const ops = [['gerar-chave','Gerar chave'],['carregar-ini','Carregar INI'],['assinar','Assinar XML'],['validar-regras','Validar regras'],['status-servico','Status SEFAZ']]
  return <Page title="Emissão NF-e laboratório" text="Fluxo guiado para validar ACBrLib antes da emissão real."><Panel title="Contexto"><div className="lab-controls"><label>Emitente<input value={emitterId} onChange={(e)=>setEmitterId(e.target.value)}/></label></div><div className="operation-grid">{ops.map(([op,label],i)=><button className="operation-button" disabled={mutation.isPending} onClick={()=>mutation.mutate(op)} key={op}><span>{i+1}</span>{mutation.isPending ? 'Executando...' : label}</button>)}</div></Panel><Panel title="Resultado"><pre className="json-box">{JSON.stringify(result, null, 2)}</pre></Panel></Page>
}

function Placeholder({ title, text, icon }: { title:string; text:string; icon:ReactNode }) { return <Page title={title} text={text}><section className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p><span>Preparado para a próxima etapa.</span></section></Page> }
function Page({ title, text, children }: { title:string; text:string; children:ReactNode }) { return <div className="page"><div className="page-header"><div><h2>{title}</h2><p>{text}</p></div></div>{children}</div> }
function Panel({ title, children }: { title:string; children:ReactNode }) { return <section className="panel"><div className="panel-header"><h3>{title}</h3></div>{children}</section> }
function Metrics({ children }: { children:ReactNode }) { return <div className="metric-grid">{children}</div> }
function Metric({ title, value, icon, tone }: { title:string; value:string; icon:ReactNode; tone:string }) { return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><span>{title}</span><strong>{value}</strong></div> }
function StatusMetric({ title, query }: { title:string; query:any }) { return <Metric title={title} value={query.isLoading ? '...' : query.isError ? 'Offline' : 'Online'} icon={query.isError ? <RefreshCw/> : <CheckCircle2/>} tone={query.isError ? 'warning' : 'success'} /> }
function MiniStat({ label, value }: { label:string; value:string }) { return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div> }
function Alert({ children }: { children:ReactNode }) { return <div className="alert info">{children}</div> }
function Table({ columns, rows }: { columns:string[]; rows:string[][] }) { return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div> }
