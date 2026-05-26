const DEVICE_ID_KEY = 'unifae_device_id'

function randomId() {
  // bom o suficiente para identificar dispositivo no browser (não é segurança)
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const id = randomId()
  localStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export function getDeviceName() {
  // Browser não expõe “nome do computador”; usamos uma descrição estável do ambiente.
  const ua = navigator.userAgent ?? ''
  const platform = (navigator as unknown as { platform?: string }).platform ?? ''
  const lang = navigator.language ?? ''
  const parts = [
    platform && `platform:${platform}`,
    lang && `lang:${lang}`,
    ua && `ua:${ua}`,
  ].filter(Boolean)
  // limita tamanho para header
  const raw = parts.join(' | ')
  return raw.length > 200 ? raw.slice(0, 200) : raw
}

