// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the Leaflet SDK (the outside
 * world) is mocked; the real `@molecule/app-maps-leaflet` bond runs.
 *
 * @module
 */
import 'leaflet/dist/leaflet.css'
import { describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  const handlers = new Map<string, () => void>()
  const mapInstance = {
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
  }
  const marker = {
    addTo: vi.fn(() => marker),
    bindPopup: vi.fn(() => marker),
    remove: vi.fn(),
    on: vi.fn((event: string, fn: () => void) => {
      handlers.set(event, fn)
      return marker
    }),
    off: vi.fn(() => marker),
  }
  const tiles = { addTo: vi.fn(() => tiles) }
  const L = {
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => tiles),
    marker: vi.fn(() => marker),
    divIcon: vi.fn((o: unknown) => o),
    icon: vi.fn((o: unknown) => o),
  }
  return { L, mapInstance, marker, handlers }
})

vi.mock('leaflet', () => ({ default: hoisted.L }))

const { createMap, setProvider } = await import('../index.js')
const { provider } = await import('@molecule/app-maps-leaflet')

describe('README @example', () => {
  it('creates a real Leaflet map with a marker, wires a marker click, and destroys it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(provider) // real OpenStreetMap map; no API key

    const container = document.createElement('div')
    container.style.height = '400px'
    document.body.appendChild(container)

    const map = await createMap({ container, center: { lat: 37.7749, lng: -122.4194 }, zoom: 12 })
    map.addMarker({
      id: 'hq',
      position: { lat: 37.7749, lng: -122.4194 },
      title: 'HQ',
      popup: 'Headquarters',
    })
    const stopListening = map.onMarkerClick('hq', (marker) => console.log('clicked', marker.title))

    expect(hoisted.L.map).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ center: [37.7749, -122.4194], zoom: 12 }),
    )
    expect(hoisted.L.tileLayer).toHaveBeenCalledTimes(1)
    expect(hoisted.L.marker).toHaveBeenCalledWith(
      [37.7749, -122.4194],
      expect.objectContaining({ title: 'HQ' }),
    )
    expect(hoisted.marker.bindPopup).toHaveBeenCalledWith('Headquarters')
    expect(map.getMarkers().map((m) => m.id)).toEqual(['hq'])

    hoisted.handlers.get('click')?.()
    expect(log).toHaveBeenCalledWith('clicked', 'HQ')

    stopListening()
    map.destroy()
    expect(hoisted.marker.off).toHaveBeenCalledWith('click', expect.any(Function))
    expect(hoisted.mapInstance.remove).toHaveBeenCalledTimes(1)
    log.mockRestore()
  })
})
