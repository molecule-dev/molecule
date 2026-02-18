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
 * Create a simple placeholder map provider that renders a static placeholder
 * div instead of a real map. Useful as a fallback when no map SDK is loaded.
 * @param options - Optional placeholder title and description text.
 * @returns A MapProvider that renders placeholder content.
 */
export const createSimpleMapProvider = (options?: SimpleMapProviderOptions): MapProvider => {
  return {
    getName: () => 'simple',
    isLoaded: () => true,
    getStyles: () => [],

    createMap: (config: MapConfig): MapInstance => {
      const container =
        typeof config.container === 'string'
          ? document.getElementById(config.container)!
          : config.container

      // Create a placeholder div
      const placeholder = document.createElement('div')
      placeholder.style.width = '100%'
      placeholder.style.height = '100%'
      placeholder.style.backgroundColor = '#e0e0e0'
      placeholder.style.display = 'flex'
      placeholder.style.alignItems = 'center'
      placeholder.style.justifyContent = 'center'
      placeholder.style.flexDirection = 'column'
      const title =
        options?.placeholderTitle ??
        t('maps.placeholder.title', undefined, { defaultValue: 'Map Placeholder' })
      const desc =
        options?.placeholderDescription ??
        t('maps.placeholder.description', undefined, {
          defaultValue: 'Use a proper map provider (MapBox, Google Maps, etc.)',
        })
      placeholder.innerHTML = `
        <div style="font-size: 18px; color: #666;">${title}</div>
        <div style="font-size: 14px; color: #999; margin-top: 8px;">${desc}</div>
      `
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
