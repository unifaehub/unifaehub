let loadPromise: Promise<void> | null = null

declare global {
  interface Window {
    google?: typeof google
  }
}

export function mapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof key === 'string' ? key.trim() : ''
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.google?.maps) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=pt-BR`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Falha ao carregar Google Maps'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

export function mapsEmbedUrl(address: string): string | null {
  const q = address.trim()
  if (!q) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=pt-BR&z=16&output=embed`
}

export function mapsSearchUrl(address: string): string | null {
  const q = address.trim()
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
