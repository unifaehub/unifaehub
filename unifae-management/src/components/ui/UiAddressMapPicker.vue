<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import { loadGoogleMaps, mapsApiKey, mapsEmbedUrl, mapsSearchUrl } from '@/utils/googleMaps'

const address = defineModel<string>({ default: '' })

const searchEl = ref<HTMLInputElement | null>(null)
const mapContainer = ref<HTMLDivElement | null>(null)
const searchQuery = ref('')
const mapReady = ref(false)
const mapNotice = ref<string | null>(null)

let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null
let autocomplete: google.maps.places.Autocomplete | null = null
let geocoder: google.maps.Geocoder | null = null
let syncingFromMap = false
let geocodeTimer: ReturnType<typeof setTimeout> | null = null
const listeners: google.maps.MapsEventListener[] = []

const hasApiKey = computed(() => mapsApiKey().length > 0)
const embedSrc = computed(() => mapsEmbedUrl(address.value))
const externalMapsUrl = computed(() => mapsSearchUrl(address.value))

function trackListener(listener: google.maps.MapsEventListener) {
  listeners.push(listener)
}

async function syncAddressFromMarker() {
  if (!geocoder || !marker) return
  const pos = marker.getPosition()
  if (!pos) return
  try {
    const res = await geocoder.geocode({ location: pos })
    const formatted = res.results[0]?.formatted_address
    if (formatted) {
      syncingFromMap = true
      address.value = formatted
      searchQuery.value = formatted
      syncingFromMap = false
    }
  } catch {
    /* geocoder indisponível */
  }
}

async function geocodeToMarker(text: string, updateAddress: boolean) {
  if (!geocoder || !map || !marker) return
  const q = text.trim()
  if (q.length < 5) return
  try {
    const res = await geocoder.geocode({ address: q, region: 'BR' })
    const first = res.results[0]
    const loc = first?.geometry?.location
    if (!loc) return
    map.setCenter(loc)
    map.setZoom(16)
    marker.setPosition(loc)
    marker.setVisible(true)
    if (updateAddress && first.formatted_address) {
      syncingFromMap = true
      address.value = first.formatted_address
      syncingFromMap = false
    }
  } catch {
    /* endereço não encontrado */
  }
}

function setupInteractiveMap() {
  if (!mapContainer.value) return

  const defaultCenter: google.maps.LatLngLiteral = { lat: -23.5505, lng: -46.6333 }
  geocoder = new google.maps.Geocoder()
  map = new google.maps.Map(mapContainer.value, {
    center: defaultCenter,
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  })
  marker = new google.maps.Marker({
    map,
    draggable: true,
    position: defaultCenter,
    visible: false,
  })

  trackListener(
    map.addListener('click', (e) => {
      if (!e.latLng || !marker) return
      marker.setPosition(e.latLng)
      marker.setVisible(true)
      void syncAddressFromMarker()
    }),
  )
  trackListener(marker.addListener('dragend', () => void syncAddressFromMarker()))

  if (searchEl.value) {
    autocomplete = new google.maps.places.Autocomplete(searchEl.value, {
      fields: ['formatted_address', 'geometry', 'name'],
      componentRestrictions: { country: 'br' },
    })
    trackListener(
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete!.getPlace()
        const loc = place.geometry?.location
        if (!loc || !map || !marker) return
        const label = place.formatted_address || place.name || ''
        syncingFromMap = true
        address.value = label
        searchQuery.value = label
        syncingFromMap = false
        map.setCenter(loc)
        map.setZoom(17)
        marker.setPosition(loc)
        marker.setVisible(true)
      }),
    )
  }

  const initial = address.value.trim()
  if (initial) {
    searchQuery.value = initial
    void geocodeToMarker(initial, false)
  }

  mapReady.value = true
}

async function initMap() {
  const key = mapsApiKey()
  if (!key) {
    mapNotice.value =
      'Para buscar e marcar no mapa, configure a chave VITE_GOOGLE_MAPS_API_KEY. Você pode digitar o endereço manualmente abaixo.'
    return
  }

  try {
    await loadGoogleMaps(key)
    await nextTick()
    setupInteractiveMap()
  } catch {
    mapNotice.value = 'Não foi possível carregar o mapa. Use o campo de endereço manual.'
  }
}

watch(
  () => address.value,
  (val) => {
    if (syncingFromMap || !mapReady.value) return
    const t = val.trim()
    if (geocodeTimer) clearTimeout(geocodeTimer)
    if (t.length < 8) return
    geocodeTimer = setTimeout(() => void geocodeToMarker(t, false), 900)
  },
)

onMounted(() => void initMap())

onBeforeUnmount(() => {
  if (geocodeTimer) clearTimeout(geocodeTimer)
  listeners.forEach((l) => l.remove())
  autocomplete = null
  marker = null
  map = null
  geocoder = null
})
</script>

<template>
  <div class="addr-picker">
    <div v-if="hasApiKey" class="addr-picker__map-block">
      <label class="addr-picker__lbl" for="addr-map-search">Buscar no mapa</label>
      <input
        id="addr-map-search"
        ref="searchEl"
        v-model="searchQuery"
        type="text"
        class="addr-picker__search"
        placeholder="Digite rua, bairro ou estabelecimento…"
        autocomplete="off"
      />
      <p class="addr-picker__hint">Clique no mapa ou arraste o marcador para ajustar o ponto.</p>
      <div ref="mapContainer" class="addr-picker__map" role="application" aria-label="Mapa do endereço" />
    </div>

    <p v-if="mapNotice" class="addr-picker__notice">{{ mapNotice }}</p>

    <div v-if="!hasApiKey && embedSrc" class="addr-picker__embed-wrap">
      <iframe
        :src="embedSrc"
        class="addr-picker__embed"
        title="Pré-visualização do endereço no Google Maps"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      />
    </div>

    <label class="addr-picker__lbl" for="addr-full">Endereço completo</label>
    <textarea
      id="addr-full"
      v-model="address"
      class="addr-picker__textarea"
      rows="3"
      placeholder="Rua, número, bairro, cidade — ou use a busca no mapa acima"
      required
    />

    <p v-if="externalMapsUrl" class="addr-picker__link-row">
      <a :href="externalMapsUrl" target="_blank" rel="noopener noreferrer" class="addr-picker__ext-link">
        <MaterialIcon name="map" size="1rem" />
        Abrir no Google Maps
      </a>
    </p>
  </div>
</template>

<style scoped>
.addr-picker {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.addr-picker__lbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.addr-picker__search,
.addr-picker__textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(191, 202, 186, 0.55);
  border-radius: var(--uf-radius-md);
  padding: 0.45rem 0.6rem;
  font-family: var(--uf-font);
  font-size: 0.9rem;
}
.addr-picker__textarea {
  resize: vertical;
  min-height: 4.5rem;
}
.addr-picker__hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.addr-picker__map {
  width: 100%;
  height: min(280px, 42vh);
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.45);
  background: #e8ede6;
}
.addr-picker__embed-wrap {
  border-radius: var(--uf-radius-md);
  overflow: hidden;
  border: 1px solid rgba(191, 202, 186, 0.45);
}
.addr-picker__embed {
  display: block;
  width: 100%;
  height: min(220px, 36vh);
  border: 0;
}
.addr-picker__notice {
  margin: 0;
  padding: 0.55rem 0.65rem;
  font-size: 0.8rem;
  line-height: 1.4;
  border-radius: var(--uf-radius-md);
  background: rgba(13, 99, 27, 0.08);
  color: var(--uf-on-surface-variant);
}
.addr-picker__link-row {
  margin: 0;
}
.addr-picker__ext-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--uf-primary);
  font-weight: 600;
  font-size: 0.82rem;
  text-decoration: none;
}
.addr-picker__ext-link:hover {
  text-decoration: underline;
}
</style>

<style>
/* Sugestões do Places acima do modal */
.pac-container {
  z-index: 200 !important;
}
</style>
