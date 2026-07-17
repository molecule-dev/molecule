/**
 * Leaflet implementation of the `@molecule/app-maps` `MapProvider`.
 *
 * Renders real slippy maps with OpenStreetMap raster tiles — no API key. See the
 * module `@remarks` in `index.ts` for the required `leaflet/dist/leaflet.css`.
 *
 * @module
 */

import L from 'leaflet'

import type {
  Bounds,
  CircleConfig,
  Coordinates,
  MapConfig,
  MapEvent,
  MapInstance,
  MapProvider,
  MarkerConfig,
  PolygonConfig,
  PolylineConfig,
  PopupConfig,
  Viewport,
} from '@molecule/app-maps'

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'

/**
 * Default marker icon as an inline-SVG `divIcon`. Leaflet's PNG default icons
 * 404 under most bundlers (they resolve relative to the CSS), so a self-contained
 * SVG pin makes markers render out-of-the-box with zero asset wiring.
 */
const defaultIcon = (color = '#2563eb'): L.DivIcon =>
  L.divIcon({
    className: 'mol-map-marker',
    html:
      `<svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="${color}"/>` +
      `<circle cx="13" cy="13" r="5" fill="#fff"/></svg>`,
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  })

const toLatLng = (c: Coordinates): L.LatLngExpression => [c.lat, c.lng]
const fromLatLng = (ll: L.LatLng): Coordinates => ({ lat: ll.lat, lng: ll.lng })
const toLeafletBounds = (b: Bounds): L.LatLngBoundsExpression => [
  [b.sw.lat, b.sw.lng],
  [b.ne.lat, b.ne.lng],
]

/** Builds the Leaflet marker for a molecule `MarkerConfig`. */
const buildMarker = (m: MarkerConfig): L.Marker => {
  const icon = m.icon
    ? L.icon({
        iconUrl: m.icon,
        iconSize: m.iconSize ?? [26, 38],
        iconAnchor: m.iconAnchor ?? [13, 38],
      })
    : defaultIcon(m.color)
  const marker = L.marker(toLatLng(m.position), {
    icon,
    draggable: m.draggable ?? false,
    opacity: m.opacity ?? 1,
    title: m.title,
  })
  if (m.popup) marker.bindPopup(m.popup as string | HTMLElement)
  return marker
}

/** Resolves the container element from a `MapConfig` (id string or element). */
const resolveContainer = (container: HTMLElement | string): HTMLElement => {
  if (typeof container === 'string') {
    const el = document.getElementById(container)
    if (!el)
      throw new Error(`@molecule/app-maps-leaflet: container element "#${container}" not found`)
    return el
  }
  return container
}

/** Wraps a live Leaflet map in the molecule `MapInstance` contract. */
const wrapInstance = (map: L.Map): MapInstance => {
  const markers = new Map<string, { marker: L.Marker; config: MarkerConfig }>()
  const polylines = new Map<string, L.Polyline>()
  const polygons = new Map<string, L.Polygon>()
  const circles = new Map<string, L.Circle>()

  return {
    getViewport(): Viewport {
      return { center: fromLatLng(map.getCenter()), zoom: map.getZoom() }
    },
    setViewport(viewport: Partial<Viewport>): void {
      const center = viewport.center ? toLatLng(viewport.center) : map.getCenter()
      map.setView(center, viewport.zoom ?? map.getZoom())
    },
    flyTo(location: Partial<Viewport>): void {
      const center = location.center ? toLatLng(location.center) : map.getCenter()
      map.flyTo(center, location.zoom ?? map.getZoom())
    },
    fitBounds(bounds: Bounds, options?: { padding?: number; animate?: boolean }): void {
      map.fitBounds(toLeafletBounds(bounds), {
        padding: options?.padding ? [options.padding, options.padding] : undefined,
        animate: options?.animate,
      })
    },
    getBounds(): Bounds {
      const b = map.getBounds()
      return { ne: fromLatLng(b.getNorthEast()), sw: fromLatLng(b.getSouthWest()) }
    },
    addMarker(marker: MarkerConfig): void {
      const existing = markers.get(marker.id)
      if (existing) existing.marker.remove()
      const built = buildMarker(marker)
      built.addTo(map)
      markers.set(marker.id, { marker: built, config: marker })
    },
    removeMarker(id: string): void {
      markers.get(id)?.marker.remove()
      markers.delete(id)
    },
    updateMarker(id: string, updates: Partial<MarkerConfig>): void {
      const existing = markers.get(id)
      if (!existing) return
      const merged = { ...existing.config, ...updates }
      existing.marker.remove()
      const built = buildMarker(merged)
      built.addTo(map)
      markers.set(id, { marker: built, config: merged })
    },
    getMarkers(): MarkerConfig[] {
      return [...markers.values()].map((m) => m.config)
    },
    clearMarkers(): void {
      for (const { marker } of markers.values()) marker.remove()
      markers.clear()
    },
    addPolyline(polyline: PolylineConfig): void {
      polylines.get(polyline.id)?.remove()
      const line = L.polyline(polyline.path.map(toLatLng), {
        color: polyline.strokeColor,
        weight: polyline.strokeWidth,
        opacity: polyline.strokeOpacity,
        dashArray: polyline.dashArray?.join(','),
      }).addTo(map)
      polylines.set(polyline.id, line)
    },
    removePolyline(id: string): void {
      polylines.get(id)?.remove()
      polylines.delete(id)
    },
    addPolygon(polygon: PolygonConfig): void {
      polygons.get(polygon.id)?.remove()
      const poly = L.polygon(polygon.path.map(toLatLng), {
        fillColor: polygon.fillColor,
        fillOpacity: polygon.fillOpacity,
      }).addTo(map)
      polygons.set(polygon.id, poly)
    },
    removePolygon(id: string): void {
      polygons.get(id)?.remove()
      polygons.delete(id)
    },
    addCircle(circle: CircleConfig): void {
      circles.get(circle.id)?.remove()
      const c = L.circle(toLatLng(circle.center), { radius: circle.radius }).addTo(map)
      circles.set(circle.id, c)
    },
    removeCircle(id: string): void {
      circles.get(id)?.remove()
      circles.delete(id)
    },
    openPopup(popup: PopupConfig): void {
      L.popup({ maxWidth: popup.maxWidth })
        .setLatLng(toLatLng(popup.position))
        .setContent(popup.content as string | HTMLElement)
        .openOn(map)
    },
    closePopups(): void {
      map.closePopup()
    },
    on<T = unknown>(event: MapEvent, handler: (data: T) => void): () => void {
      const wrapped = (e: unknown): void => handler(e as T)
      map.on(event, wrapped)
      return () => map.off(event, wrapped)
    },
    off<T = unknown>(event: MapEvent, handler: (data: T) => void): void {
      map.off(event, handler as L.LeafletEventHandlerFn)
    },
    onMarkerClick(markerId: string, handler: (marker: MarkerConfig) => void): () => void {
      const entry = markers.get(markerId)
      if (!entry) return () => {}
      const wrapped = (): void => handler(entry.config)
      entry.marker.on('click', wrapped)
      return () => entry.marker.off('click', wrapped)
    },
    project(coordinates: Coordinates): { x: number; y: number } {
      const p = map.latLngToContainerPoint(toLatLng(coordinates))
      return { x: p.x, y: p.y }
    },
    unproject(point: { x: number; y: number }): Coordinates {
      return fromLatLng(map.containerPointToLatLng(L.point(point.x, point.y)))
    },
    resize(): void {
      map.invalidateSize()
    },
    getContainer(): HTMLElement {
      return map.getContainer()
    },
    getCanvas(): HTMLCanvasElement {
      // Leaflet renders via SVG/DOM tile layers, not a single WebGL canvas. Return
      // the map's canvas renderer surface if one exists, else a detached canvas —
      // getCanvas() is a WebGL-provider (Mapbox/MapLibre) concept.
      const found = map.getContainer().querySelector('canvas')
      return found ?? document.createElement('canvas')
    },
    getSnapshot(): Promise<string> {
      return Promise.reject(
        new Error(
          '@molecule/app-maps-leaflet: getSnapshot() is not supported (Leaflet has no built-in ' +
            'export). Use a WebGL provider (Mapbox/MapLibre) or the leaflet-image plugin.',
        ),
      )
    },
    getInstance(): unknown {
      return map
    },
    destroy(): void {
      map.remove()
    },
  }
}

/**
 * Creates a Leaflet-backed `MapProvider`.
 *
 * @returns A `MapProvider` that renders real OpenStreetMap-tiled maps.
 */
export const createProvider = (): MapProvider => ({
  getName: () => 'leaflet',
  isLoaded: () => typeof L !== 'undefined' && typeof L.map === 'function',
  getStyles: () => [{ id: 'osm', name: 'OpenStreetMap', url: OSM_TILES }],
  createMap(config: MapConfig): MapInstance {
    const container = resolveContainer(config.container)
    const map = L.map(container, {
      center: config.center ? toLatLng(config.center) : [0, 0],
      zoom: config.zoom ?? 2,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      scrollWheelZoom: config.scrollZoom ?? true,
      doubleClickZoom: config.doubleClickZoom ?? true,
      touchZoom: config.touchZoomRotate ?? true,
      dragging: config.dragPan ?? true,
      keyboard: config.keyboard ?? true,
    })
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)
    if (config.maxBounds) map.setMaxBounds(toLeafletBounds(config.maxBounds))
    return wrapInstance(map)
  },
})

/** The default Leaflet map provider, ready to bond with `setProvider(provider)`. */
export const provider: MapProvider = createProvider()
