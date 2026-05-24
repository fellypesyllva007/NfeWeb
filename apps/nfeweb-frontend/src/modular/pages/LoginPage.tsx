import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole, ReceiptText } from 'lucide-react'
import { useAuth } from '../../auth'

export function LoginPage({ kind }: { kind: 'admin' | 'company' }) {
  const { login, user, error, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(kind === 'admin' ? 'admin@nfeweb.local' : 'empresa@nfeweb.local')
  const [password, setPassword] = useState('')

  if (user) return <Navigate to={kind === 'admin' && user.is_platform_admin ? '/admin/dashboard' : '/app/dashboard'} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    await login(email, password, kind)
    navigate(kind === 'admin' ? '/admin/dashboard' : '/app/dashboard')
  }

  return <div className="m-login"><section><div className="m-login-logo"><ReceiptText /></div><h1>NfeWeb ERP</h1><p>Emissor fiscal multiempresa com sessão real, cookie HttpOnly e motor NF-e no backend.</p><div className="m-login-stats"><span>NF-e 55</span><span>ACBrLib</span><span>Oracle Cloud</span></div></section><form onSubmit={submit} className="m-login-card"><small>{kind === 'admin' ? 'Painel da plataforma' : 'Painel da empresa'}</small><h2>{kind === 'admin' ? 'Login administrador' : 'Login da empresa'}</h2><label>E-mail<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username" /></label><label>Senha<input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Digite sua senha" autoComplete="current-password" /></label>{error ? <div className="m-alert">{error}</div> : null}<button disabled={loading}><LockKeyhole size={18}/>{loading ? 'Entrando...' : 'Entrar'}</button><Link to={kind === 'admin' ? '/login' : '/admin/login'}>{kind === 'admin' ? 'Entrar como empresa' : 'Entrar como administrador'}</Link></form></div>
}
