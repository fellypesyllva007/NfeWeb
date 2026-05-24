import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthKind } from '../../services/api'
import { useAuth } from '../../auth'

export function LoginPage({ kind }: { kind: AuthKind }) {
  const { user, login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (user) {
    return <Navigate to={kind === 'admin' && user.is_platform_admin ? '/admin/dashboard' : '/app/dashboard'} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    await login(email, password, kind)
    navigate(kind === 'admin' ? '/admin/dashboard' : '/app/dashboard')
  }

  return (
    <main className="login-screen">
      <section className="login-hero">
        <div className="brand-badge">NF</div>
        <span className="eyebrow">NfeWeb ERP</span>
        <h1>{kind === 'admin' ? 'Painel da plataforma' : 'Painel da empresa'}</h1>
        <p>Emissor NF-e web, multiempresa, com autenticação real e operação fiscal centralizada no backend.</p>
      </section>
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">Acesso seguro</span>
        <h2>{kind === 'admin' ? 'Entrar como administrador' : 'Entrar na empresa'}</h2>
        <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required /></label>
        <label>Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required /></label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-button" disabled={loading}>{loading ? 'Validando...' : 'Entrar'}</button>
        <div className="auth-switch">{kind === 'admin' ? <Link to="/login">Entrar como empresa</Link> : <Link to="/admin/login">Entrar como administrador</Link>}</div>
      </form>
    </main>
  )
}
