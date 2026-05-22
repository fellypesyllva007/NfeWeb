import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function unwrap(response: { data: unknown }) {
  return response.data
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
