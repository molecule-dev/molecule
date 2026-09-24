// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real `@molecule/app-maps` +
 * `@molecule/app-maps-leaflet` map under the drawing surface. Only the Leaflet
 * SDK (the outside world) is mocked, with a linear pixel ↔ lat/lng projection.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMap, type MapInstance, setProvider } from '@molecule/app-maps'
import { provider as leafletProvider } from '@molecule/app-maps-leaflet'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  haversineDistanceMeters,
  MapDrawing,
  type MapDrawingBackend,
  type MapShape,
} from '../index.js'

const hoisted = vi.hoisted(() => {
  const mapInstance = {
    remove: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    // 1px = 0.001° from the top-left corner at (lat 40.8, lng -74.1).
    containerPointToLatLng: vi.fn((p: { x: number; y: number }) => ({
      lat: 40.8 - p.y * 0.001,
      lng: -74.1 + p.x * 0.001,
    })),
    latLngToContainerPoint: vi.fn((ll: [number, number]) => ({
      x: (ll[1] + 74.1) / 0.001,
      y: (40.8 - ll[0]) / 0.001,
    })),
  }
  const tiles = { addTo: vi.fn(() => tiles) }
  const L = {
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => tiles),
    point: vi.fn((x: number, y: number) => ({ x, y })),
  }
  return { L, mapInstance }
})

vi.mock('leaflet', () => ({ default: hoisted.L }))

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.onSave - Receives the full shape list after every change.
 * @returns The zones editor.
 */
function DeliveryZonesEditor({
  onSave,
}: {
  onSave: (zones: MapShape[]) => void
}): React.JSX.Element {
  const mapEl = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapInstance | null>(null)

  useEffect(() => {
    const container = mapEl.current
    if (!container) return
    let instance: MapInstance | null = null
    let cancelled = false
    void Promise.resolve(
      createMap({ container, center: { lat: 40.7128, lng: -74.006 }, zoom: 12 }),
    ).then((m) => {
      if (cancelled) return m.destroy()
      instance = m
      setMap(m)
    })
    return () => {
      cancelled = true
      instance?.destroy()
    }
  }, [])

  // Geographic projection through the live map — re-reads pan/zoom on every call.
  const backend = useMemo<MapDrawingBackend | undefined>(
    () =>
      map
        ? {
            project: ([lng, lat]) => map.project({ lat, lng }),
            unproject: (p) => {
              const c = map.unproject(p)
              return [c.lng, c.lat]
            },
            distanceMeters: haversineDistanceMeters,
          }
        : undefined,
    [map],
  )

  return (
    <MapDrawing
      tools={['polygon', 'circle', 'pin']}
      height={500}
      mapSlot={<div ref={mapEl} style={{ height: '100%' }} />}
      mapBackend={backend}
      onChange={onSave}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setProvider(leafletProvider) // the app's startup wiring the example assumes
  })
  afterEach(() => {
    cleanup()
  })

  it('creates the map in the slot and saves pins in geographic [lng, lat]', async () => {
    const onSave = vi.fn()
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <DeliveryZonesEditor onSave={onSave} />
      </I18nProvider>,
    )
    const slot = view.container.querySelector('[data-mol-id="map-drawing-slot"]')
    await waitFor(() => expect(hoisted.L.map).toHaveBeenCalledTimes(1))
    const [container, options] = (hoisted.L.map.mock.calls[0] ?? []) as unknown as [
      HTMLElement,
      { center: [number, number]; zoom: number },
    ]
    expect(slot?.contains(container)).toBe(true)
    expect(options).toMatchObject({ center: [40.7128, -74.006], zoom: 12 })
    await act(async () => {
      await Promise.resolve()
    })

    const surface = view.getByRole('application', { name: 'Map drawing surface' })
    surface.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 500, right: 400, bottom: 500 }) as DOMRect
    fireEvent.click(view.getByRole('button', { name: 'Pin' }))
    fireEvent.pointerDown(surface, { clientX: 94, clientY: 87 })

    expect(onSave).toHaveBeenCalledTimes(1)
    const zones = onSave.mock.calls[0]?.[0] as MapShape[]
    expect(zones).toHaveLength(1)
    expect(zones[0]?.kind).toBe('pin')
    const [lng, lat] = zones[0]?.geometry.coordinates as [number, number]
    expect(lng).toBeCloseTo(-74.006, 6)
    expect(lat).toBeCloseTo(40.713, 6)

    view.unmount()
    expect(hoisted.mapInstance.remove).toHaveBeenCalledTimes(1)
  })
})
