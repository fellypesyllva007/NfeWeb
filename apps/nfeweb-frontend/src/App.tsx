import { FormEvent, ReactNode, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSignature,
  FileText,
  Home,
  KeyRound,
  Landmark,
  LockKeyhole,
  LogOut,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  Users,
  Wifi,
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, callNfeOperation, getAcbrInfo, getApiHealth, getDbStatus, getEmitentes } from './services/api'

type Company = {
  id: string
  name: string
  legalName: string
  cnpj: string
  uf: string
  city: string
  taxRegime: string
  environment: 'Homologação' | 'Produção'
  status: 'Ativa' | 'Pendente' | 'Bloqueada'
}

type LoginKind = 'admin' | 'company'

const seedCompanies: Company[] = [
  {
    id: 'tenant_lab',
    name: 'Laboratório ACBr',
    legalName: 'RAZAO SOCIAL - LAB ACBr',
    cnpj: '92.390.477/0001-49',
    uf: 'SP',
    city: 'São Paulo',
    taxRegime: 'Simples Nacional',
    environment: 'Homologação',
    status: 'Ativa',
  },
]

const menuAdmin = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/status', label: 'Status fiscal', icon: Activity },
]

const menuCompany = [
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage kind="admin" />} />
      <Route path="/login" element={<LoginPage kind="company" />} />
      <Route path="/admin" element={<AdminShell />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="empresas" element={<CompaniesPage />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
      <Route path="/app" element={<CompanyShell />}>
        <Route path="dashboard" element={<CompanyDashboard />} />
        <Route path="nfe/laboratorio" element={<NfeLabPage />} />
        <Route path="nfe/historico" element={<Placeholder title="Histórico de notas" icon={<ReceiptText />} description="Aguardando a persistência fiscal no backend para listar notas, XMLs, protocolos e rejeições." />} />
        <Route path="clientes" element={<Placeholder title="Clientes" icon={<Users />} description="Cadastro de destinatários comerciais para uso automático na emissão da NF-e." />} />
        <Route path="produtos" element={<Placeholder title="Produtos" icon={<Package />} description="Cadastro de produtos com NCM, CFOP, unidade, preço e regras fiscais padrão." />} />
        <Route path="vendas" element={<Placeholder title="Vendas" icon={<ShoppingCart />} description="Pedidos e vendas serão a origem operacional para geração automática da NF-e." />} />
        <Route path="emitentes" element={<EmitentesPage />} />
        <Route path="certificado" element={<CertificatePage />} />
        <Route path="configuracao-fiscal" element={<FiscalConfigPage />} />
        <Route path="status" element={<StatusPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}

function LoginPage({ kind }: { kind: LoginKind }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(kind === 'admin' ? 'admin@nfeweb.local' : 'empresa@nfeweb.local')
  const [password, setPassword] = useState('123456')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    localStorage.setItem('nfeweb.session', JSON.stringify({ kind, email, at: new Date().toISOString() }))
    navigate(kind === 'admin' ? '/admin/dashboard' : '/app/dashboard')
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark"><ReceiptText size={34} /></div>
        <h1>NfeWeb ERP</h1>
        <p>ERP fiscal multiempresa para emissão, automação tributária e operação NF-e em ambiente Oracle Cloud.</p>
        <div className="hero-grid">
          <MiniStat label="Ambiente" value="Ubuntu 22.04 ARM64" />
          <MiniStat label="Motor fiscal" value="ACBrLibNFe" />
          <MiniStat label="API" value="/api via Nginx" />
        </div>
      </section>
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">{kind === 'admin' ? 'Painel da plataforma' : 'Painel da empresa'}</span>
        <h2>{kind === 'admin' ? 'Entrar como administrador' : 'Entrar na empresa'}</h2>
        <p>{kind === 'admin' ? 'Cadastre e acompanhe múltiplas empresas emissoras.' : 'Acesse o ERP fiscal da sua empresa.'}</p>
        <label>
          E-mail
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Senha
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        <button className="primary-button" type="submit"><LockKeyhole size={18} /> Entrar</button>
        <div className="auth-switch">
          {kind === 'admin' ? <Link to="/login">Entrar como empresa</Link> : <Link to="/admin/login">Entrar como administrador</Link>}
        </div>
      </form>
    </div>
  )
}

function AdminShell() {
  return <Shell title="NfeWeb Admin" subtitle="Gestão multiempresa" menu={menuAdmin} exitTo="/admin/login" />
}

function CompanyShell() {
  return <Shell title="NfeWeb ERP" subtitle="Operação fiscal" menu={menuCompany} exitTo="/login" />
}

function Shell({ title, subtitle, menu, exitTo }: { title: string; subtitle: string; menu: typeof menuAdmin; exitTo: string }) {
  const navigate = useNavigate()
  function logout() {
    localStorage.removeItem('nfeweb.session')
    navigate(exitTo)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><ReceiptText size={22} /></div>
          <div><strong>{title}</strong><span>{subtitle}</span></div>
        </div>
        <nav>
          {menu.map((item) => {
            const Icon = item.icon
            return <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18} />{item.label}</NavLink>
          })}
        </nav>
        <button className="logout-button" onClick={logout}><LogOut size={18} /> Sair</button>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <div><span className="eyebrow">Oracle Cloud MVP</span><h1>ERP fiscal multiempresa</h1></div>
          <div className="topbar-user"><UserRound size={18} /> sessão local</div>
        </div>
        <Routes>
          <Route path="dashboard" element={title.includes('Admin') ? <AdminDashboard /> : <CompanyDashboard />} />
        </Routes>
      </main>
    </div>
  )
}

function AdminDashboard() {
  return (
    <Page title="Dashboard administrativo" description="Visão geral das empresas, ambiente fiscal e saúde da plataforma.">
      <MetricGrid>
        <MetricCard title="Empresas ativas" value="1" icon={<Building2 />} tone="success" />
        <MetricCard title="Ambiente padrão" value="Homologação" icon={<BadgeCheck />} tone="warning" />
        <MetricCard title="API fiscal" value="NfeWeb 0.9" icon={<Wifi />} tone="info" />
        <MetricCard title="Certificados" value="Lab" icon={<KeyRound />} tone="neutral" />
      </MetricGrid>
      <section className="panel">
        <PanelHeader title="Próximas etapas" description="Ordem recomendada para transformar o laboratório em operação real." />
        <div className="timeline">
          <Step done title="Frontend MVP" text="Login, empresas, dashboard, status e NF-e laboratório." />
          <Step title="Autenticação real" text="Sessões com cookie HttpOnly e isolamento por tenant." />
          <Step title="Persistência fiscal" text="Gravar XMLs, retornos, rejeições, eventos e logs." />
          <Step title="Certificado ICP-Brasil" text="Habilitar CNPJ real para homologação e produção." />
        </div>
      </section>
    </Page>
  )
}

function CompanyDashboard() {
  return (
    <Page title="Dashboard da empresa" description="Acompanhe emissão, status fiscal e automações do ERP.">
      <MetricGrid>
        <MetricCard title="Notas emitidas" value="0" icon={<FileText />} tone="neutral" />
        <MetricCard title="Status SEFAZ" value="Lab" icon={<Activity />} tone="warning" />
        <MetricCard title="Emitente" value="1" icon={<Landmark />} tone="success" />
        <MetricCard title="Cálculos" value="Automático" icon={<BarChart3 />} tone="info" />
      </MetricGrid>
      <div className="two-columns">
        <section className="panel">
          <PanelHeader title="Fluxo de emissão" description="Modelo moderno, guiado e com cálculo automático." />
          <div className="wizard-preview">
            {['Emitente', 'Destinatário', 'Produtos', 'Impostos', 'Revisão', 'Transmitir'].map((item, index) => <span key={item}>{index + 1}. {item}</span>)}
          </div>
        </section>
        <section className="panel">
          <PanelHeader title="Automação prevista" description="O frontend exibe prévias; o backend valida oficialmente." />
          <ul className="clean-list">
            <li>Subtotal por item e desconto</li>
            <li>Frete, seguro e despesas</li>
            <li>ICMS, IPI, PIS e COFINS</li>
            <li>Validação antes de assinar XML</li>
          </ul>
        </section>
      </div>
    </Page>
  )
}

function CompaniesPage() {
  const [companies, setCompanies] = useState(seedCompanies)
  const [form, setForm] = useState({ name: '', legalName: '', cnpj: '', uf: 'SP', city: '', taxRegime: 'Simples Nacional' })

  function addCompany(event: FormEvent) {
    event.preventDefault()
    if (!form.name || !form.cnpj) return
    setCompanies((current) => [...current, { id: crypto.randomUUID(), ...form, environment: 'Homologação', status: 'Pendente' }])
    setForm({ name: '', legalName: '', cnpj: '', uf: 'SP', city: '', taxRegime: 'Simples Nacional' })
  }

  return (
    <Page title="Empresas" description="Cadastro inicial de múltiplas empresas/tenants da plataforma.">
      <section className="panel">
        <PanelHeader title="Nova empresa" description="Cadastro local do MVP; depois será persistido no backend." />
        <form className="grid-form" onSubmit={addCompany}>
          <input placeholder="Nome fantasia" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="Razão social" value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} />
          <input placeholder="CNPJ" value={form.cnpj} onChange={(event) => setForm({ ...form, cnpj: event.target.value })} />
          <input placeholder="UF" value={form.uf} onChange={(event) => setForm({ ...form, uf: event.target.value.toUpperCase() })} />
          <input placeholder="Cidade" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <select value={form.taxRegime} onChange={(event) => setForm({ ...form, taxRegime: event.target.value })}>
            <option>Simples Nacional</option>
            <option>Lucro Presumido</option>
            <option>Lucro Real</option>
          </select>
          <button className="primary-button" type="submit"><Plus size={18} /> Cadastrar empresa</button>
        </form>
      </section>
      <section className="panel">
        <PanelHeader title="Empresas cadastradas" description="Lista de tenants para preparar o ERP multiempresa." />
        <DataTable columns={['Empresa', 'CNPJ', 'UF', 'Regime', 'Ambiente', 'Status']} rows={companies.map((company) => [company.name, company.cnpj, company.uf, company.taxRegime, company.environment, company.status])} />
      </section>
    </Page>
  )
}

function StatusPage() {
  const health = useQuery({ queryKey: ['api-health'], queryFn: getApiHealth })
  const acbr = useQuery({ queryKey: ['acbr-info'], queryFn: getAcbrInfo })
  const db = useQuery({ queryKey: ['db-status'], queryFn: getDbStatus })

  return (
    <Page title="Status fiscal" description="Diagnóstico integrado do frontend com a NfeWeb API.">
      <MetricGrid>
        <StatusMetric title="API" query={health} />
        <StatusMetric title="ACBr" query={acbr} />
        <StatusMetric title="SQLite" query={db} />
        <MetricCard title="Base URL" value={api.defaults.baseURL || '/api'} icon={<Wifi />} tone="info" />
      </MetricGrid>
      <section className="panel">
        <PanelHeader title="Retornos técnicos" description="JSON bruto para validação durante implantação." />
        <pre className="json-box">{JSON.stringify({ health: health.data, acbr: acbr.data, db: db.data }, null, 2)}</pre>
      </section>
    </Page>
  )
}

function EmitentesPage() {
  const emitentes = useQuery({ queryKey: ['emitentes'], queryFn: getEmitentes })
  const rows = Array.isArray(emitentes.data) ? emitentes.data : Array.isArray(emitentes.data?.emitentes) ? emitentes.data.emitentes : []

  return (
    <Page title="Emitentes fiscais" description="Emitentes vinculados à empresa selecionada.">
      <section className="panel">
        <PanelHeader title="Fonte fiscal" description="Consome /api/emitentes quando disponível; usa laboratório como referência operacional." />
        {emitentes.isError ? <Alert tone="warning">Não foi possível ler a API agora. Verifique se o backend está ativo em /api.</Alert> : null}
        <DataTable columns={['ID', 'Razão social', 'CNPJ', 'UF', 'Ambiente']} rows={(rows.length ? rows : [{ emitter_id: 'emit_lab_acbr_sample', razao_social: 'RAZAO SOCIAL - LAB ACBr', cnpj: '92390477000149', uf: 'SP', ambiente: 1 }]).map((item: any) => [item.emitter_id || item.id || '-', item.razao_social || item.nome || '-', item.cnpj || '-', item.uf || '-', String(item.ambiente ?? 'Homologação')])} />
      </section>
    </Page>
  )
}

function CertificatePage() {
  return (
    <Page title="Certificado digital" description="Configuração segura do certificado A1 usado pelo motor fiscal.">
      <MetricGrid>
        <MetricCard title="Certificado" value="Lab" icon={<ShieldCheck />} tone="warning" />
        <MetricCard title="Senha" value="Oculta" icon={<KeyRound />} tone="success" />
        <MetricCard title="Manipulação PFX" value="Backend" icon={<LockKeyhole />} tone="info" />
      </MetricGrid>
      <Alert tone="info">O frontend não deve exibir senha do certificado nem manipular PFX diretamente no fluxo comum. O upload e a validação oficial serão implementados no backend.</Alert>
    </Page>
  )
}

function FiscalConfigPage() {
  return (
    <Page title="Configuração fiscal" description="Parâmetros fiscais do emitente, modelo, série e ambiente.">
      <section className="panel">
        <PanelHeader title="Configuração atual" description="Baseada no laboratório fiscal inicial." />
        <DataTable columns={['Campo', 'Valor']} rows={[
          ['Modelo', '55 - NF-e'],
          ['Série', '1'],
          ['Ambiente', 'Homologação'],
          ['UF', 'SP'],
          ['Próximo número', '1'],
          ['Cálculo fiscal', 'Backend oficial / frontend prévia'],
        ]} />
      </section>
    </Page>
  )
}

function NfeLabPage() {
  const [emitterId, setEmitterId] = useState('emit_lab_acbr_sample')
  const [includeXml, setIncludeXml] = useState(false)
  const [result, setResult] = useState<any>(null)
  const operation = useMutation({
    mutationFn: (op: string) => callNfeOperation(op, { emitter_id: emitterId, include_xml: includeXml }),
    onSuccess: setResult,
    onError: (error) => setResult({ status: 'error', message: error instanceof Error ? error.message : 'Erro inesperado' }),
  })

  const operations = [
    ['gerar-chave', 'Gerar chave'],
    ['carregar-ini', 'Carregar INI'],
    ['assinar', 'Assinar XML'],
    ['validar-regras', 'Validar regras'],
    ['status-servico', 'Status SEFAZ'],
  ]

  return (
    <Page title="Emissão NF-e laboratório" description="Fluxo guiado para validar o motor fiscal antes da emissão oficial completa.">
      <section className="panel">
        <PanelHeader title="Contexto da emissão" description="O emitter_id é obrigatório nos endpoints fiscais." />
        <div className="lab-controls">
          <label>Emitente<input value={emitterId} onChange={(event) => setEmitterId(event.target.value)} /></label>
          <label className="checkbox-row"><input type="checkbox" checked={includeXml} onChange={(event) => setIncludeXml(event.target.checked)} /> incluir XML quando o backend suportar</label>
        </div>
        <div className="operation-grid">
          {operations.map(([op, label], index) => <button key={op} className="operation-button" disabled={operation.isPending} onClick={() => operation.mutate(op)}><span>{index + 1}</span>{operation.isPending ? 'Executando...' : label}</button>)}
        </div>
      </section>
      <section className="panel">
        <PanelHeader title="Resultado" description="Resposta bruta da API fiscal para diagnóstico." />
        <pre className="json-box">{JSON.stringify(result || { status: 'idle', message: 'Escolha uma etapa para executar.' }, null, 2)}</pre>
      </section>
    </Page>
  )
}

function Placeholder({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <Page title={title} description={description}>
      <section className="empty-state">
        <div className="empty-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{description}</p>
        <span>Preparado para a próxima etapa do ERP multiempresa.</span>
      </section>
    </Page>
  )
}

function Page({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="page"><div className="page-header"><div><h2>{title}</h2><p>{description}</p></div></div>{children}</div>
}

function MetricGrid({ children }: { children: ReactNode }) { return <div className="metric-grid">{children}</div> }

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: ReactNode; tone: string }) {
  return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><span>{title}</span><strong>{value}</strong></div>
}

function StatusMetric({ title, query }: { title: string; query: any }) {
  return <MetricCard title={title} value={query.isLoading ? '...' : query.isError ? 'Offline' : 'Online'} icon={query.isError ? <RefreshCw /> : <CheckCircle2 />} tone={query.isError ? 'warning' : 'success'} />
}

function PanelHeader({ title, description }: { title: string; description: string }) { return <div className="panel-header"><h3>{title}</h3><p>{description}</p></div> }

function MiniStat({ label, value }: { label: string; value: string }) { return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div> }

function Step({ title, text, done }: { title: string; text: string; done?: boolean }) { return <div className="step"><div className={done ? 'step-dot done' : 'step-dot'}>{done ? <CheckCircle2 size={16} /> : <ClipboardList size={16} />}</div><div><strong>{title}</strong><p>{text}</p></div></div> }

function Alert({ children, tone }: { children: ReactNode; tone: string }) { return <div className={`alert ${tone}`}>{children}</div> }

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
}
