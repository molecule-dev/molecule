/**
 * Simple map provider implementation for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { MapConfig, MapInstance, MapProvider, MarkerConfig, Viewport } from './types.js'

interface SimpleMapProviderOptions {
  placeholderTitle?: string
  placeholderDescription?: string
}

/**
 * Create the built-in PLACEHOLDER map provider. It does NOT render a real map:
 * it draws a static grey panel that identifies itself as a placeholder and
 * `console.warn`s once when it first engages, because no real map SDK ships with
 * the fleet. Markers are tracked in memory but never drawn; overlays, popups,
 * events and projection are no-ops; `getSnapshot()` returns an empty string. It
 * exists only so map-using screens render *something honest* until a real
 * `MapProvider` (Mapbox GL / Google Maps / Leaflet / MapLibre) is implemented
 * and bonded via `setProvider()`.
 * @param options - Optional placeholder title and description text.
 * @returns A MapProvider that renders an honest, self-identifying placeholder.
 */
export const createSimpleMapProvider = (options?: SimpleMapProviderOptions): MapProvider => {
  // Warn at most once per placeholder-provider instance, the first time it
  // actually renders — no matter how many maps it creates — so a missing real
  // provider is loud and visible instead of a grey div silently masquerading as
  // a working map.
  let hasWarned = false

  return {
    getName: () => 'simple',
    isLoaded: () => true,
    getStyles: () => [],

    createMap: (config: MapConfig): MapInstance => {
      const container =
        typeof config.container === 'string'
          ? document.getElementById(config.container)!
          : config.container

      if (!hasWarned) {
        hasWarned = true
        console.warn(
          '[@molecule/app-maps] No map provider bonded — rendering a NON-FUNCTIONAL ' +
            'grey placeholder, not a real map. Bond @molecule/app-maps-leaflet (Leaflet + ' +
            "OpenStreetMap, no API key): import 'leaflet/dist/leaflet.css'; import { provider } " +
            "from '@molecule/app-maps-leaflet'; setProvider(provider) at startup, before any " +
            'createMap call. Or implement the MapProvider interface against another SDK.',
        )
      }

      const title =
        options?.placeholderTitle ??
        t('maps.placeholder.title', undefined, { defaultValue: 'Map Placeholder' })
      const desc =
        options?.placeholderDescription ??
        t('maps.placeholder.description', undefined, {
          defaultValue: 'Use a proper map provider (MapBox, Google Maps, etc.)',
        })

      // Build the placeholder with safe DOM construction (createElement +
      // textContent) — NEVER innerHTML — so caller-supplied placeholder text or
      // localized i18n values can never inject markup/scripts (no XSS vector).
      // The `data-mol-map-placeholder` marker lets tooling and tests tell this
      // apart from a real rendered map.
      const placeholder = document.createElement('div')
      placeholder.setAttribute('data-mol-map-placeholder', 'true')
      placeholder.setAttribute('role', 'img')
      placeholder.setAttribute('aria-label', title)
      placeholder.style.width = '100%'
      placeholder.style.height = '100%'
      placeholder.style.backgroundColor = '#e0e0e0'
      placeholder.style.display = 'flex'
      placeholder.style.alignItems = 'center'
      placeholder.style.justifyContent = 'center'
      placeholder.style.flexDirection = 'column'

      const titleEl = document.createElement('div')
      titleEl.style.fontSize = '18px'
      titleEl.style.color = '#666'
      titleEl.textContent = title
      placeholder.appendChild(titleEl)

      const descEl = document.createElement('div')
      descEl.style.fontSize = '14px'
      descEl.style.color = '#999'
      descEl.style.marginTop = '8px'
      descEl.textContent = desc
      placeholder.appendChild(descEl)

      container.appendChild(placeholder)

      const markers = new Map<string, MarkerConfig>()
      let viewport: Viewport = {
        center: config.center || { lat: 0, lng: 0 },
        zoom: config.zoom || 10,
        bearing: config.bearing || 0,
        pitch: config.pitch || 0,
      }

      return {
        getViewport: () => viewport,
        setViewport: (v) => {
          viewport = { ...viewport, ...v }
        },
        flyTo: (v) => {
          viewport = { ...viewport, ...v }
        },
        fitBounds: () => {},
        getBounds: () => ({
          sw: { lat: -90, lng: -180 },
          ne: { lat: 90, lng: 180 },
        }),
        addMarker: (m) => markers.set(m.id, m),
        removeMarker: (id) => markers.delete(id),
        updateMarker: (id, updates) => {
          const marker = markers.get(id)
          if (marker) {
            markers.set(id, { ...marker, ...updates })
          }
        },
        getMarkers: () => Array.from(markers.values()),
        clearMarkers: () => markers.clear(),
        addPolyline: () => {},
        removePolyline: () => {},
        addPolygon: () => {},
        removePolygon: () => {},
        addCircle: () => {},
        removeCircle: () => {},
        openPopup: () => {},
        closePopups: () => {},
        on: () => () => {},
        off: () => {},
        onMarkerClick: () => () => {},
        project: () => ({ x: 0, y: 0 }),
        unproject: () => ({ lat: 0, lng: 0 }),
        resize: () => {},
        getContainer: () => container,
        getCanvas: () => document.createElement('canvas'),
        getSnapshot: async () => '',
        getInstance: () => null,
        destroy: () => {
          placeholder.remove()
        },
      }
    },
  }
}
