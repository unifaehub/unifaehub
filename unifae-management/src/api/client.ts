import axios from 'axios'
import { getDeviceName, getOrCreateDeviceId } from '@/utils/device'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('unifae_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // FormData exige boundary no Content-Type; o default application/json quebra o upload multipart.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type')
    } else {
      delete (h as Record<string, unknown>)['Content-Type']
    }
  }
  // Auditoria / rastreio de dispositivo
  config.headers['X-Device-Id'] = getOrCreateDeviceId()
  config.headers['X-Device-Name'] = getDeviceName()
  return config
})

export default client
