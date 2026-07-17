import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MapConfig } from '@molecule/app-maps'

// Mock Leaflet: `L.map()` yields a spy map, and layer factories (marker/tileLayer/
// polyline/…) yield chainable spies, so we can assert the MapConfig → Leaflet
// mapping + MapInstance delegation without a real DOM.
const hoisted = vi.hoisted(() => {
  const mapInstance = {
    setView: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 1, lng: 2 })),
    getZoom: vi.fn(() => 10),
    getBounds: vi.fn(() => ({
      getNorthEast: () => ({ lat: 3, lng: 4 }),
      getSouthWest: () => ({ lat: 1, lng: 2 }),
    })),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getContainer: vi.fn(() => ({ querySelector: () => null })),
    latLngToContainerPoint: vi.fn(() => ({ x: 5, y: 6 })),
    containerPointToLatLng: vi.fn(() => ({ lat: 7, lng: 8 })),
    closePopup: vi.fn(),
  }
  const layer = () => {
    const o: Record<string, unknown> = {}
    Object.assign(o, {
      addTo: vi.fn(() => o),
      bindPopup: vi.fn(() => o),
      remove: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setLatLng: vi.fn(() => o),
      setContent: vi.fn(() => o),
      openOn: vi.fn(() => o),
    })
    return o
  }
  const L = {
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => layer()),
    marker: vi.fn(() => layer()),
    polyline: vi.fn(() => layer()),
    polygon: vi.fn(() => layer()),
    circle: vi.fn(() => layer()),
    popup: vi.fn(() => layer()),
    divIcon: vi.fn((o: unknown) => o),
    icon: vi.fn((o: unknown) => o),
    point: vi.fn((x: number, y: number) => ({ x, y })),
  }
  return { L, mapInstance }
})

vi.mock('leaflet', () => ({ default: hoisted.L }))

const { provider, createProvider } = await import('../provider.js')

const container = {} as HTMLElement
const cfg = (): MapConfig => ({ container, center: { lat: 51.5, lng: -0.12 }, zoom: 12 })

describe('@molecule/app-maps-leaflet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports name, loaded state, and OSM style', () => {
    expect(provider.getName()).toBe('leaflet')
    expect(provider.isLoaded()).toBe(true)
    expect(provider.getStyles()[0]).toMatchObject({ id: 'osm', name: 'OpenStreetMap' })
  })

  it('creates a Leaflet map with the config center/zoom and an OSM tile layer', () => {
    provider.createMap(cfg())
    expect(hoisted.L.map).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ center: [51.5, -0.12], zoom: 12 }),
    )
    expect(hoisted.L.tileLayer).toHaveBeenCalledWith(
      expect.stringContaining('openstreetmap.org'),
      expect.objectContaining({ attribution: expect.stringContaining('OpenStreetMap') }),
    )
  })

  it('adds markers as Leaflet markers (with popup) and tracks them', () => {
    const map = provider.createMap(cfg())
    map.addMarker({ id: 'a', position: { lat: 1, lng: 2 }, popup: 'Hello' })
    expect(hoisted.L.marker).toHaveBeenCalledWith(
      [1, 2],
      expect.objectContaining({ draggable: false }),
    )
    // The molecule-facing tracking reflects the marker.
    expect(map.getMarkers()).toEqual([{ id: 'a', position: { lat: 1, lng: 2 }, popup: 'Hello' }])
    map.clearMarkers()
    expect(map.getMarkers()).toEqual([])
  })

  it('reads the viewport from the live map', () => {
    const map = provider.createMap(cfg())
    expect(map.getViewport()).toEqual({ center: { lat: 1, lng: 2 }, zoom: 10 })
  })

  it('fitBounds forwards molecule Bounds to Leaflet', () => {
    const map = provider.createMap(cfg())
    map.fitBounds({ ne: { lat: 3, lng: 4 }, sw: { lat: 1, lng: 2 } })
    expect(hoisted.mapInstance.fitBounds).toHaveBeenCalledWith(
      [
        [1, 2],
        [3, 4],
      ],
      expect.anything(),
    )
  })

  it('destroy() removes the Leaflet map', () => {
    const map = provider.createMap(cfg())
    map.destroy()
    expect(hoisted.mapInstance.remove).toHaveBeenCalled()
  })

  it('getSnapshot rejects (Leaflet has no built-in export)', async () => {
    const map = provider.createMap(cfg())
    await expect(map.getSnapshot()).rejects.toThrow(/not supported/i)
  })

  it('createProvider() yields an independent provider with the same contract', () => {
    const p = createProvider()
    expect(p.getName()).toBe('leaflet')
    expect(typeof p.createMap).toBe('function')
  })
})
