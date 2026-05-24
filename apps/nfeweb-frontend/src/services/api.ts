import axios from 'axios'

export type AuthKind = 'admin' | 'company'

export type AuthUser = {
  id: string
  email: string
  nome: string
  status: string
  is_platform_admin: boolean
  roles: string[]
  tenants: Array<{ id: string; nome: string; slug: string; status: string; role: string }>
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

function unwrap<T = unknown>(response: { data: T }) {
  return response.data
}

export async function login(email: string, password: string, kind: AuthKind) {
  return api.post<{ status: string; user: AuthUser; expires_at: string }>('/auth/login', { email, password, kind }).then(unwrap)
}

export async function getMe() {
  return api.get<{ status: string; user: AuthUser }>('/auth/me').then(unwrap)
}

export async function logout() {
  return api.post<{ status: string; message: string }>('/auth/logout', {}).then(unwrap)
}

export async function getApiHealth() {
  return api.get('/health').then(unwrap)
}

export async function getAcbrInfo() {
  return api.get('/acbr/info').then(unwrap)
}

export async function getDbStatus() {
  return api.get('/db/status').then(unwrap)
}

export async function getEmitentes() {
  return api.get('/emitentes').then(unwrap)
}

export async function callNfeOperation(operation: string, payload: Record<string, unknown>) {
  return api.post(`/nfe/${operation}`, payload).then(unwrap)
}
