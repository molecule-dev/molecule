// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateBounds,
  calculateCenter,
  calculateDistance,
  createMap,
  // Map
  createSimpleMapProvider,
  // Utilities
  defaultStyles,
  getProvider,
  isWithinBounds,
  // Provider
  setProvider,
} from '../index.js'
import type {
  Bounds,
  Coordinates,
  MapInstance,
  MapProvider,
  MarkerConfig,
  Viewport,
} from '../types.js'

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('maps/utilities', () => {
  describe('defaultStyles', () => {
    it('should export mapbox style URLs', () => {
      expect(defaultStyles.streets).toBe('mapbox://styles/mapbox/streets-v12')
      expect(defaultStyles.outdoors).toBe('mapbox://styles/mapbox/outdoors-v12')
      expect(defaultStyles.light).toBe('mapbox://styles/mapbox/light-v11')
      expect(defaultStyles.dark).toBe('mapbox://styles/mapbox/dark-v11')
      expect(defaultStyles.satellite).toBe('mapbox://styles/mapbox/satellite-v9')
      expect(defaultStyles.satelliteStreets).toBe('mapbox://styles/mapbox/satellite-streets-v12')
      expect(defaultStyles.navigationDay).toBe('mapbox://styles/mapbox/navigation-day-v1')
      expect(defaultStyles.navigationNight).toBe('mapbox://styles/mapbox/navigation-night-v1')
    })
  })

  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const point: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const distance = calculateDistance(point, point)
      expect(distance).toBe(0)
    })

    it('should calculate distance between San Francisco and Los Angeles', () => {
      const sf: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const la: Coordinates = { lat: 34.0522, lng: -118.2437 }
      const distance = calculateDistance(sf, la)

      // Distance should be approximately 559 km (559000 meters)
      expect(distance).toBeGreaterThan(550000)
      expect(distance).toBeLessThan(570000)
    })

    it('should calculate distance between New York and London', () => {
      const ny: Coordinates = { lat: 40.7128, lng: -74.006 }
      const london: Coordinates = { lat: 51.5074, lng: -0.1278 }
      const distance = calculateDistance(ny, london)

      // Distance should be approximately 5570 km (5570000 meters)
      expect(distance).toBeGreaterThan(5500000)
      expect(distance).toBeLessThan(5600000)
    })

    it('should calculate short distances accurately', () => {
      // Two points approximately 100 meters apart
      const point1: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const point2: Coordinates = { lat: 37.7758, lng: -122.4194 } // ~100m north
      const distance = calculateDistance(point1, point2)

      expect(distance).toBeGreaterThan(90)
      expect(distance).toBeLessThan(110)
    })

    it('should be symmetric', () => {
      const point1: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const point2: Coordinates = { lat: 34.0522, lng: -118.2437 }

      const distance1 = calculateDistance(point1, point2)
      const distance2 = calculateDistance(point2, point1)

      expect(distance1).toBeCloseTo(distance2)
    })

    it('should handle coordinates at the equator', () => {
      const point1: Coordinates = { lat: 0, lng: 0 }
      const point2: Coordinates = { lat: 0, lng: 1 }
      const distance = calculateDistance(point1, point2)

      // 1 degree at equator is approximately 111 km
      expect(distance).toBeGreaterThan(110000)
      expect(distance).toBeLessThan(112000)
    })

    it('should handle coordinates at the poles', () => {
      const northPole: Coordinates = { lat: 90, lng: 0 }
      const southPole: Coordinates = { lat: -90, lng: 0 }
      const distance = calculateDistance(northPole, southPole)

      // Half the Earth's circumference is approximately 20000 km
      expect(distance).toBeGreaterThan(19500000)
      expect(distance).toBeLessThan(20500000)
    })
  })

  describe('calculateCenter', () => {
    it('should return the same point for a single coordinate', () => {
      const point: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const center = calculateCenter([point])

      expect(center.lat).toBe(point.lat)
      expect(center.lng).toBe(point.lng)
    })

    it('should calculate center of two points', () => {
      const point1: Coordinates = { lat: 0, lng: 0 }
      const point2: Coordinates = { lat: 10, lng: 10 }
      const center = calculateCenter([point1, point2])

      expect(center.lat).toBe(5)
      expect(center.lng).toBe(5)
    })

    it('should calculate center of multiple points', () => {
      const points: Coordinates[] = [
        { lat: 0, lng: 0 },
        { lat: 10, lng: 0 },
        { lat: 10, lng: 10 },
        { lat: 0, lng: 10 },
      ]
      const center = calculateCenter(points)

      expect(center.lat).toBe(5)
      expect(center.lng).toBe(5)
    })

    it('should handle negative coordinates', () => {
      const point1: Coordinates = { lat: -10, lng: -10 }
      const point2: Coordinates = { lat: 10, lng: 10 }
      const center = calculateCenter([point1, point2])

      expect(center.lat).toBe(0)
      expect(center.lng).toBe(0)
    })

    it('should throw error for empty array', () => {
      expect(() => calculateCenter([])).toThrow(
        'Cannot calculate center of empty coordinates array',
      )
    })
  })

  describe('calculateBounds', () => {
    it('should return bounds for a single point', () => {
      const point: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const bounds = calculateBounds([point])

      expect(bounds.sw.lat).toBe(point.lat)
      expect(bounds.sw.lng).toBe(point.lng)
      expect(bounds.ne.lat).toBe(point.lat)
      expect(bounds.ne.lng).toBe(point.lng)
    })

    it('should calculate bounds for two points', () => {
      const point1: Coordinates = { lat: 0, lng: 0 }
      const point2: Coordinates = { lat: 10, lng: 10 }
      const bounds = calculateBounds([point1, point2])

      expect(bounds.sw.lat).toBe(0)
      expect(bounds.sw.lng).toBe(0)
      expect(bounds.ne.lat).toBe(10)
      expect(bounds.ne.lng).toBe(10)
    })

    it('should calculate bounds for multiple points', () => {
      const points: Coordinates[] = [
        { lat: 5, lng: 5 },
        { lat: -10, lng: 15 },
        { lat: 20, lng: -5 },
        { lat: 0, lng: 0 },
      ]
      const bounds = calculateBounds(points)

      expect(bounds.sw.lat).toBe(-10)
      expect(bounds.sw.lng).toBe(-5)
      expect(bounds.ne.lat).toBe(20)
      expect(bounds.ne.lng).toBe(15)
    })

    it('should handle negative coordinates', () => {
      const points: Coordinates[] = [
        { lat: -30, lng: -60 },
        { lat: -20, lng: -40 },
      ]
      const bounds = calculateBounds(points)

      expect(bounds.sw.lat).toBe(-30)
      expect(bounds.sw.lng).toBe(-60)
      expect(bounds.ne.lat).toBe(-20)
      expect(bounds.ne.lng).toBe(-40)
    })

    it('should throw error for empty array', () => {
      expect(() => calculateBounds([])).toThrow(
        'Cannot calculate bounds of empty coordinates array',
      )
    })
  })

  describe('isWithinBounds', () => {
    const bounds: Bounds = {
      sw: { lat: 0, lng: 0 },
      ne: { lat: 10, lng: 10 },
    }

    it('should return true for point inside bounds', () => {
      const point: Coordinates = { lat: 5, lng: 5 }
      expect(isWithinBounds(point, bounds)).toBe(true)
    })

    it('should return true for point on boundary', () => {
      const swCorner: Coordinates = { lat: 0, lng: 0 }
      const neCorner: Coordinates = { lat: 10, lng: 10 }
      const onEdge: Coordinates = { lat: 5, lng: 0 }

      expect(isWithinBounds(swCorner, bounds)).toBe(true)
      expect(isWithinBounds(neCorner, bounds)).toBe(true)
      expect(isWithinBounds(onEdge, bounds)).toBe(true)
    })

    it('should return false for point outside bounds (north)', () => {
      const point: Coordinates = { lat: 15, lng: 5 }
      expect(isWithinBounds(point, bounds)).toBe(false)
    })

    it('should return false for point outside bounds (south)', () => {
      const point: Coordinates = { lat: -5, lng: 5 }
      expect(isWithinBounds(point, bounds)).toBe(false)
    })

    it('should return false for point outside bounds (east)', () => {
      const point: Coordinates = { lat: 5, lng: 15 }
      expect(isWithinBounds(point, bounds)).toBe(false)
    })

    it('should return false for point outside bounds (west)', () => {
      const point: Coordinates = { lat: 5, lng: -5 }
      expect(isWithinBounds(point, bounds)).toBe(false)
    })

    it('should handle bounds with negative coordinates', () => {
      const negativeBounds: Bounds = {
        sw: { lat: -20, lng: -20 },
        ne: { lat: -10, lng: -10 },
      }

      expect(isWithinBounds({ lat: -15, lng: -15 }, negativeBounds)).toBe(true)
      expect(isWithinBounds({ lat: 0, lng: 0 }, negativeBounds)).toBe(false)
    })
  })
})

// ============================================================================
// Provider Management Tests
// ============================================================================

describe('maps/provider', () => {
  let mockProvider: MapProvider
  let mockMapInstance: MapInstance

  beforeEach(() => {
    mockMapInstance = {
      getViewport: vi.fn().mockReturnValue({ center: { lat: 0, lng: 0 }, zoom: 10 }),
      setViewport: vi.fn(),
      flyTo: vi.fn(),
      fitBounds: vi.fn(),
      getBounds: vi
        .fn()
        .mockReturnValue({ sw: { lat: -90, lng: -180 }, ne: { lat: 90, lng: 180 } }),
      addMarker: vi.fn(),
      removeMarker: vi.fn(),
      updateMarker: vi.fn(),
      getMarkers: vi.fn().mockReturnValue([]),
      clearMarkers: vi.fn(),
      addPolyline: vi.fn(),
      removePolyline: vi.fn(),
      addPolygon: vi.fn(),
      removePolygon: vi.fn(),
      addCircle: vi.fn(),
      removeCircle: vi.fn(),
      openPopup: vi.fn(),
      closePopups: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
      off: vi.fn(),
      onMarkerClick: vi.fn().mockReturnValue(() => {}),
      project: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      unproject: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
      resize: vi.fn(),
      getContainer: vi.fn().mockReturnValue(document.createElement('div')),
      getCanvas: vi.fn().mockReturnValue(document.createElement('canvas')),
      getSnapshot: vi.fn().mockResolvedValue(''),
      getInstance: vi.fn().mockReturnValue(null),
      destroy: vi.fn(),
    }

    mockProvider = {
      getName: vi.fn().mockReturnValue('mock'),
      isLoaded: vi.fn().mockReturnValue(true),
      getStyles: vi.fn().mockReturnValue([]),
      createMap: vi.fn().mockReturnValue(mockMapInstance),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should create a simple provider if none is set', () => {
      // Reset provider by setting a new simple one
      const simpleProvider = createSimpleMapProvider()
      setProvider(simpleProvider)

      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(provider.getName()).toBe('simple')
      expect(typeof provider.createMap).toBe('function')
    })
  })

  describe('createMap', () => {
    it('should use the current provider to create a map', () => {
      setProvider(mockProvider)
      const container = document.createElement('div')

      createMap({ container })

      expect(mockProvider.createMap).toHaveBeenCalledWith({ container })
    })

    it('should return the map instance from the provider', () => {
      setProvider(mockProvider)
      const container = document.createElement('div')

      const result = createMap({ container })

      expect(result).toBe(mockMapInstance)
    })
  })
})

// ============================================================================
// Simple Map Provider Tests
// ============================================================================

describe('maps/createSimpleMapProvider', () => {
  let container: HTMLElement
  let provider: MapProvider
  let mapInstance: MapInstance

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'map-container'
    document.body.appendChild(container)

    provider = createSimpleMapProvider()
    mapInstance = provider.createMap({ container }) as MapInstance
  })

  afterEach(() => {
    mapInstance.destroy()
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  describe('provider interface', () => {
    it('should have getName returning "simple"', () => {
      expect(provider.getName()).toBe('simple')
    })

    it('should have isLoaded returning true', () => {
      expect(provider.isLoaded()).toBe(true)
    })

    it('should have getStyles returning empty array', () => {
      expect(provider.getStyles()).toEqual([])
    })
  })

  describe('createMap with string container', () => {
    it('should create a map with a string container ID', () => {
      const newProvider = createSimpleMapProvider()
      const newMap = newProvider.createMap({ container: 'map-container' }) as MapInstance

      expect(newMap).toBeDefined()
      expect(typeof newMap.getViewport).toBe('function')

      newMap.destroy()
    })
  })

  describe('viewport operations', () => {
    it('should return default viewport', () => {
      const viewport = mapInstance.getViewport()

      expect(viewport.center).toEqual({ lat: 0, lng: 0 })
      expect(viewport.zoom).toBe(10)
      expect(viewport.bearing).toBe(0)
      expect(viewport.pitch).toBe(0)
    })

    it('should use initial center from config', () => {
      const customMap = provider.createMap({
        container,
        center: { lat: 40, lng: -74 },
        zoom: 15,
      }) as MapInstance

      const viewport = customMap.getViewport()

      expect(viewport.center).toEqual({ lat: 40, lng: -74 })
      expect(viewport.zoom).toBe(15)

      customMap.destroy()
    })

    it('should set viewport with partial values', () => {
      mapInstance.setViewport({ center: { lat: 50, lng: 50 } })

      const viewport = mapInstance.getViewport()
      expect(viewport.center).toEqual({ lat: 50, lng: 50 })
      expect(viewport.zoom).toBe(10) // unchanged
    })

    it('should update viewport with setViewport', () => {
      mapInstance.setViewport({
        center: { lat: 30, lng: -90 },
        zoom: 12,
        bearing: 45,
        pitch: 30,
      })

      const viewport = mapInstance.getViewport()

      expect(viewport.center).toEqual({ lat: 30, lng: -90 })
      expect(viewport.zoom).toBe(12)
      expect(viewport.bearing).toBe(45)
      expect(viewport.pitch).toBe(30)
    })

    it('should update viewport with flyTo', () => {
      mapInstance.flyTo({
        center: { lat: 35, lng: -120 },
        zoom: 8,
      })

      const viewport = mapInstance.getViewport()

      expect(viewport.center).toEqual({ lat: 35, lng: -120 })
      expect(viewport.zoom).toBe(8)
    })

    it('should return world bounds from getBounds', () => {
      const bounds = mapInstance.getBounds()

      expect(bounds.sw).toEqual({ lat: -90, lng: -180 })
      expect(bounds.ne).toEqual({ lat: 90, lng: 180 })
    })
  })

  describe('marker management', () => {
    const marker1: MarkerConfig = {
      id: 'marker-1',
      position: { lat: 37.7749, lng: -122.4194 },
      title: 'San Francisco',
    }

    const marker2: MarkerConfig = {
      id: 'marker-2',
      position: { lat: 34.0522, lng: -118.2437 },
      title: 'Los Angeles',
    }

    it('should add a marker', () => {
      mapInstance.addMarker(marker1)

      const markers = mapInstance.getMarkers()
      expect(markers).toHaveLength(1)
      expect(markers[0]).toEqual(marker1)
    })

    it('should add multiple markers', () => {
      mapInstance.addMarker(marker1)
      mapInstance.addMarker(marker2)

      const markers = mapInstance.getMarkers()
      expect(markers).toHaveLength(2)
    })

    it('should remove a marker by ID', () => {
      mapInstance.addMarker(marker1)
      mapInstance.addMarker(marker2)

      mapInstance.removeMarker('marker-1')

      const markers = mapInstance.getMarkers()
      expect(markers).toHaveLength(1)
      expect(markers[0].id).toBe('marker-2')
    })

    it('should update a marker', () => {
      mapInstance.addMarker(marker1)

      mapInstance.updateMarker('marker-1', {
        title: 'Updated Title',
        position: { lat: 38, lng: -123 },
      })

      const markers = mapInstance.getMarkers()
      expect(markers[0].title).toBe('Updated Title')
      expect(markers[0].position).toEqual({ lat: 38, lng: -123 })
      expect(markers[0].id).toBe('marker-1') // ID should not change
    })

    it('should not fail when updating non-existent marker', () => {
      expect(() => {
        mapInstance.updateMarker('non-existent', { title: 'Test' })
      }).not.toThrow()
    })

    it('should clear all markers', () => {
      mapInstance.addMarker(marker1)
      mapInstance.addMarker(marker2)

      mapInstance.clearMarkers()

      const markers = mapInstance.getMarkers()
      expect(markers).toHaveLength(0)
    })

    it('should return empty array when no markers exist', () => {
      const markers = mapInstance.getMarkers()
      expect(markers).toEqual([])
    })

    it('should preserve marker metadata', () => {
      const markerWithMeta: MarkerConfig = {
        id: 'marker-meta',
        position: { lat: 0, lng: 0 },
        meta: { customField: 'value', count: 42 },
      }

      mapInstance.addMarker(markerWithMeta)

      const markers = mapInstance.getMarkers()
      expect(markers[0].meta).toEqual({ customField: 'value', count: 42 })
    })
  })

  describe('shape operations (no-op in simple provider)', () => {
    it('should not throw when adding polyline', () => {
      expect(() => {
        mapInstance.addPolyline({
          id: 'polyline-1',
          path: [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 1 },
          ],
        })
      }).not.toThrow()
    })

    it('should not throw when removing polyline', () => {
      expect(() => {
        mapInstance.removePolyline('polyline-1')
      }).not.toThrow()
    })

    it('should not throw when adding polygon', () => {
      expect(() => {
        mapInstance.addPolygon({
          id: 'polygon-1',
          path: [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 },
          ],
        })
      }).not.toThrow()
    })

    it('should not throw when removing polygon', () => {
      expect(() => {
        mapInstance.removePolygon('polygon-1')
      }).not.toThrow()
    })

    it('should not throw when adding circle', () => {
      expect(() => {
        mapInstance.addCircle({
          id: 'circle-1',
          center: { lat: 0, lng: 0 },
          radius: 1000,
        })
      }).not.toThrow()
    })

    it('should not throw when removing circle', () => {
      expect(() => {
        mapInstance.removeCircle('circle-1')
      }).not.toThrow()
    })
  })

  describe('popup operations (no-op in simple provider)', () => {
    it('should not throw when opening popup', () => {
      expect(() => {
        mapInstance.openPopup({
          position: { lat: 0, lng: 0 },
          content: 'Test popup',
        })
      }).not.toThrow()
    })

    it('should not throw when closing popups', () => {
      expect(() => {
        mapInstance.closePopups()
      }).not.toThrow()
    })
  })

  describe('event handling', () => {
    it('should return unsubscribe function from on()', () => {
      const handler = vi.fn()
      const unsubscribe = mapInstance.on('click', handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should not throw when calling off()', () => {
      const handler = vi.fn()
      expect(() => {
        mapInstance.off('click', handler)
      }).not.toThrow()
    })

    it('should return unsubscribe function from onMarkerClick()', () => {
      const handler = vi.fn()
      const unsubscribe = mapInstance.onMarkerClick('marker-1', handler)

      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('projection methods', () => {
    it('should return origin point from project', () => {
      const point = mapInstance.project({ lat: 37.7749, lng: -122.4194 })

      expect(point).toEqual({ x: 0, y: 0 })
    })

    it('should return origin coordinates from unproject', () => {
      const coords = mapInstance.unproject({ x: 100, y: 100 })

      expect(coords).toEqual({ lat: 0, lng: 0 })
    })
  })

  describe('container and canvas', () => {
    it('should return the container element', () => {
      const containerEl = mapInstance.getContainer()

      expect(containerEl).toBe(container)
    })

    it('should return a canvas element', () => {
      const canvas = mapInstance.getCanvas()

      expect(canvas).toBeInstanceOf(HTMLCanvasElement)
    })
  })

  describe('snapshot', () => {
    it('should return empty string from getSnapshot', async () => {
      const snapshot = await mapInstance.getSnapshot()

      expect(snapshot).toBe('')
    })

    it('should handle options parameter', async () => {
      const snapshot = await mapInstance.getSnapshot({ width: 800, height: 600 })

      expect(snapshot).toBe('')
    })
  })

  describe('instance access', () => {
    it('should return null from getInstance', () => {
      const instance = mapInstance.getInstance()

      expect(instance).toBeNull()
    })
  })

  describe('resize', () => {
    it('should not throw when calling resize', () => {
      expect(() => {
        mapInstance.resize()
      }).not.toThrow()
    })
  })

  describe('destroy', () => {
    it('should remove placeholder from container', () => {
      expect(container.children.length).toBeGreaterThan(0)

      mapInstance.destroy()

      // After destroy, placeholder should be removed
      // Note: We need to check if the specific placeholder div was removed
      const placeholder = container.querySelector('div')
      expect(placeholder).toBeNull()
    })
  })
})

// ============================================================================
// Map Configuration Tests
// ============================================================================

describe('maps/configuration', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('should accept all optional configuration options', () => {
    const provider = createSimpleMapProvider()
    const mapInstance = provider.createMap({
      container,
      center: { lat: 40, lng: -74 },
      zoom: 12,
      minZoom: 1,
      maxZoom: 20,
      bearing: 45,
      pitch: 30,
      style: 'mapbox://styles/mapbox/streets-v12',
      scrollZoom: true,
      dragPan: true,
      dragRotate: true,
      doubleClickZoom: true,
      keyboard: true,
      touchZoomRotate: true,
      touchPitch: true,
      maxBounds: {
        sw: { lat: 30, lng: -80 },
        ne: { lat: 50, lng: -60 },
      },
      renderWorldCopies: false,
      attributionControl: false,
      locale: 'en-US',
    }) as MapInstance

    expect(mapInstance).toBeDefined()
    expect(mapInstance.getViewport().center).toEqual({ lat: 40, lng: -74 })
    expect(mapInstance.getViewport().zoom).toBe(12)

    mapInstance.destroy()
  })

  it('should handle style as object', () => {
    const provider = createSimpleMapProvider()
    const mapInstance = provider.createMap({
      container,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
    }) as MapInstance

    expect(mapInstance).toBeDefined()
    mapInstance.destroy()
  })
})

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('maps/edge-cases', () => {
  describe('calculateDistance edge cases', () => {
    it('should handle coordinates crossing the date line', () => {
      const tokyo: Coordinates = { lat: 35.6762, lng: 139.6503 }
      const sf: Coordinates = { lat: 37.7749, lng: -122.4194 }
      const distance = calculateDistance(tokyo, sf)

      // Distance should be approximately 8280 km
      expect(distance).toBeGreaterThan(8000000)
      expect(distance).toBeLessThan(8500000)
    })

    it('should handle antipodal points', () => {
      const point1: Coordinates = { lat: 0, lng: 0 }
      const point2: Coordinates = { lat: 0, lng: 180 }
      const distance = calculateDistance(point1, point2)

      // Half the Earth's circumference at equator
      expect(distance).toBeGreaterThan(20000000)
      expect(distance).toBeLessThan(20100000)
    })
  })

  describe('calculateBounds edge cases', () => {
    it('should handle coordinates spanning the globe', () => {
      const points: Coordinates[] = [
        { lat: -89, lng: -179 },
        { lat: 89, lng: 179 },
      ]
      const bounds = calculateBounds(points)

      expect(bounds.sw.lat).toBe(-89)
      expect(bounds.sw.lng).toBe(-179)
      expect(bounds.ne.lat).toBe(89)
      expect(bounds.ne.lng).toBe(179)
    })
  })

  describe('marker operations edge cases', () => {
    let container: HTMLElement
    let mapInstance: MapInstance

    beforeEach(() => {
      container = document.createElement('div')
      document.body.appendChild(container)
      const provider = createSimpleMapProvider()
      mapInstance = provider.createMap({ container }) as MapInstance
    })

    afterEach(() => {
      mapInstance.destroy()
      document.body.removeChild(container)
    })

    it('should handle adding marker with same ID (overwrite)', () => {
      const marker1: MarkerConfig = {
        id: 'same-id',
        position: { lat: 0, lng: 0 },
        title: 'First',
      }
      const marker2: MarkerConfig = {
        id: 'same-id',
        position: { lat: 10, lng: 10 },
        title: 'Second',
      }

      mapInstance.addMarker(marker1)
      mapInstance.addMarker(marker2)

      const markers = mapInstance.getMarkers()
      expect(markers).toHaveLength(1)
      expect(markers[0].title).toBe('Second')
    })

    it('should handle removing non-existent marker', () => {
      expect(() => {
        mapInstance.removeMarker('non-existent')
      }).not.toThrow()

      expect(mapInstance.getMarkers()).toHaveLength(0)
    })

    it('should handle markers with HTML popup content', () => {
      const popupElement = document.createElement('div')
      popupElement.innerHTML = '<strong>Test</strong>'

      const marker: MarkerConfig = {
        id: 'html-popup',
        position: { lat: 0, lng: 0 },
        popup: popupElement,
      }

      mapInstance.addMarker(marker)

      const markers = mapInstance.getMarkers()
      expect(markers[0].popup).toBe(popupElement)
    })

    it('should handle markers with all optional properties', () => {
      const marker: MarkerConfig = {
        id: 'full-marker',
        position: { lat: 37.7749, lng: -122.4194, alt: 100 },
        title: 'Full Marker',
        icon: 'https://example.com/icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popup: 'Popup content',
        draggable: true,
        opacity: 0.8,
        color: '#ff0000',
        meta: { category: 'test' },
      }

      mapInstance.addMarker(marker)

      const markers = mapInstance.getMarkers()
      expect(markers[0]).toEqual(marker)
    })
  })
})

// ============================================================================
// Type Exports Verification
// ============================================================================

describe('maps/type-exports', () => {
  it('should export all expected types', () => {
    // This test verifies that TypeScript types are correctly exported
    // by using them - if they were not exported, this would cause compile errors
    const coordinates: Coordinates = { lat: 0, lng: 0 }
    const bounds: Bounds = { sw: { lat: -10, lng: -10 }, ne: { lat: 10, lng: 10 } }
    const viewport: Viewport = { center: { lat: 0, lng: 0 }, zoom: 10 }
    const marker: MarkerConfig = { id: 'test', position: { lat: 0, lng: 0 } }

    expect(coordinates).toBeDefined()
    expect(bounds).toBeDefined()
    expect(viewport).toBeDefined()
    expect(marker).toBeDefined()
  })
})
