/** Tipos mínimos para o picker de endereço (Google Maps JS API). */
declare namespace google.maps {
  interface LatLngLiteral {
    lat: number
    lng: number
  }

  interface MapMouseEvent {
    latLng: LatLng | null
  }

  interface GeocoderResult {
    formatted_address?: string
    geometry: { location: LatLng }
  }

  interface GeocoderResponse {
    results: GeocoderResult[]
  }

  class LatLng {
    lat(): number
    lng(): number
  }

  class Map {
    constructor(el: Element, opts: Record<string, unknown>)
    setCenter(center: LatLng | LatLngLiteral): void
    setZoom(zoom: number): void
    addListener(eventName: string, handler: (e: MapMouseEvent) => void): MapsEventListener
  }

  class Marker {
    constructor(opts: Record<string, unknown>)
    setPosition(position: LatLng | LatLngLiteral): void
    getPosition(): LatLng | undefined
    setVisible(visible: boolean): void
    addListener(eventName: string, handler: () => void): MapsEventListener
  }

  class Geocoder {
    geocode(request: Record<string, unknown>): Promise<GeocoderResponse>
  }

  interface MapsEventListener {
    remove(): void
  }

  namespace places {
    interface PlaceResult {
      formatted_address?: string
      name?: string
      geometry?: { location: LatLng }
    }

    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: Record<string, unknown>)
      addListener(eventName: string, handler: () => void): MapsEventListener
      getPlace(): PlaceResult
    }
  }
}

declare const google: {
  maps: typeof google.maps
}
