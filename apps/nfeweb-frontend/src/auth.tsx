import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { AuthKind, AuthUser, getMe, login as loginApi, logout as logoutApi } from './services/api'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  error: string
  login: (email: string, password: string, kind: AuthKind) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const result = await getMe()
      setUser(result.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email: string, password: string, kind: AuthKind) {
    setLoading(true)
    setError('')
    try {
      const result = await loginApi(email, password, kind)
      setUser(result.user)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível entrar. Verifique e-mail e senha.'
      setUser(null)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    setLoading(true)
    setError('')
    try {
      await logoutApi()
    } finally {
      setUser(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const value = useMemo(() => ({ user, loading, error, login, logout, refresh }), [user, loading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return value
}
