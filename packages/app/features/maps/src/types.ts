/**
 * Map types for molecule.dev.
 *
 * @module
 */

/**
 * Latitude/longitude pair with optional altitude.
 */
export interface Coordinates {
  /**
   * Latitude.
   */
  lat: number

  /**
   * Longitude.
   */
  lng: number

  /**
   * Altitude (optional).
   */
  alt?: number
}

/**
 * Geographic bounds (bounding box).
 */
export interface Bounds {
  /**
   * Northeast corner.
   */
  ne: Coordinates

  /**
   * Southwest corner.
   */
  sw: Coordinates
}

/**
 * Map viewport state (center coordinates, zoom, bearing, pitch, and bounds).
 */
export interface Viewport {
  /**
   * Center coordinates.
   */
  center: Coordinates

  /**
   * Zoom level.
   */
  zoom: number

  /**
   * Bearing (rotation) in degrees.
   */
  bearing?: number

  /**
   * Pitch (tilt) in degrees.
   */
  pitch?: number
}

/**
 * Map marker configuration (position, icon, popup, draggable, color, metadata).
 */
export interface MarkerConfig {
  /**
   * Unique ID.
   */
  id: string

  /**
   * Position.
   */
  position: Coordinates

  /**
   * Title (tooltip on hover).
   */
  title?: string

  /**
   * Custom icon URL.
   */
  icon?: string

  /**
   * Icon size.
   */
  iconSize?: [number, number]

  /**
   * Icon anchor point.
   */
  iconAnchor?: [number, number]

  /**
   * Popup content.
   */
  popup?: string | HTMLElement

  /**
   * Draggable.
   */
  draggable?: boolean

  /**
   * Opacity (0-1).
   */
  opacity?: number

  /**
   * Color (for default markers).
   */
  color?: string

  /**
   * Additional metadata.
   */
  meta?: Record<string, unknown>
}

/**
 * Map polyline overlay (path coordinates, stroke color/width/opacity, dash pattern).
 */
export interface PolylineConfig {
  /**
   * Unique ID.
   */
  id: string

  /**
   * Path coordinates.
   */
  path: Coordinates[]

  /**
   * Stroke color.
   */
  strokeColor?: string

  /**
   * Stroke width.
   */
  strokeWidth?: number

  /**
   * Stroke opacity (0-1).
   */
  strokeOpacity?: number

  /**
   * Dash pattern.
   */
  dashArray?: number[]

  /**
   * Additional metadata.
   */
  meta?: Record<string, unknown>
}

/**
 * Map polygon overlay (closed path, fill/stroke colors, opacity).
 */
export interface PolygonConfig {
  /**
   * Unique ID.
   */
  id: string

  /**
   * Polygon coordinates.
   */
  path: Coordinates[]

  /**
   * Fill color.
   */
  fillColor?: string

  /**
   * Fill opacity (0-1).
   */
  fillOpacity?: number

  /**
   * Stroke color.
   */
  strokeColor?: string

  /**
   * Stroke width.
   */
  strokeWidth?: number

  /**
   * Stroke opacity (0-1).
   */
  strokeOpacity?: number

  /**
   * Additional metadata.
   */
  meta?: Record<string, unknown>
}

/**
 * Map circle overlay (center, radius in meters, fill/stroke colors).
 */
export interface CircleConfig {
  /**
   * Unique ID.
   */
  id: string

  /**
   * Center position.
   */
  center: Coordinates

  /**
   * Radius in meters.
   */
  radius: number

  /**
   * Fill color.
   */
  fillColor?: string

  /**
   * Fill opacity (0-1).
   */
  fillOpacity?: number

  /**
   * Stroke color.
   */
  strokeColor?: string

  /**
   * Stroke width.
   */
  strokeWidth?: number

  /**
   * Additional metadata.
   */
  meta?: Record<string, unknown>
}

/**
 * Map popup configuration (position, HTML content, offset, close behavior, max width).
 */
export interface PopupConfig {
  /**
   * Position.
   */
  position: Coordinates

  /**
   * Content.
   */
  content: string | HTMLElement

  /**
   * Offset from position.
   */
  offset?: [number, number]

  /**
   * Close button.
   */
  closeButton?: boolean

  /**
   * Close on click.
   */
  closeOnClick?: boolean

  /**
   * Max width.
   */
  maxWidth?: number

  /**
   * Class name.
   */
  className?: string
}

/**
 * Map event types.
 */
export type MapEvent =
  | 'click'
  | 'dblclick'
  | 'contextmenu'
  | 'mouseenter'
  | 'mouseleave'
  | 'mousemove'
  | 'movestart'
  | 'move'
  | 'moveend'
  | 'zoomstart'
  | 'zoom'
  | 'zoomend'
  | 'load'
  | 'idle'
  | 'resize'

/**
 * Map click event data.
 */
export interface MapClickEvent {
  /**
   * Original event.
   */
  originalEvent: MouseEvent

  /**
   * Coordinates.
   */
  coordinates: Coordinates

  /**
   * Point on screen.
   */
  point: { x: number; y: number }
}

/**
 * Map move event data.
 */
export interface MapMoveEvent {
  /**
   * New viewport.
   */
  viewport: Viewport

  /**
   * Original event.
   */
  originalEvent?: Event
}

/**
 * Map initialization options (container, center, zoom, style, interaction controls, bounds).
 */
export interface MapConfig {
  /**
   * Container element.
   */
  container: HTMLElement | string

  /**
   * Initial center.
   */
  center?: Coordinates

  /**
   * Initial zoom level.
   */
  zoom?: number

  /**
   * Min zoom level.
   */
  minZoom?: number

  /**
   * Max zoom level.
   */
  maxZoom?: number

  /**
   * Initial bearing.
   */
  bearing?: number

  /**
   * Initial pitch.
   */
  pitch?: number

  /**
   * Map style (URL or style object).
   */
  style?: string | Record<string, unknown>

  /**
   * Enable scroll zoom.
   */
  scrollZoom?: boolean

  /**
   * Enable drag pan.
   */
  dragPan?: boolean

  /**
   * Enable drag rotate.
   */
  dragRotate?: boolean

  /**
   * Enable double-click zoom.
   */
  doubleClickZoom?: boolean

  /**
   * Enable keyboard navigation.
   */
  keyboard?: boolean

  /**
   * Enable touch zoom/rotate.
   */
  touchZoomRotate?: boolean

  /**
   * Enable touch pitch.
   */
  touchPitch?: boolean

  /**
   * Max bounds (pan limits).
   */
  maxBounds?: Bounds

  /**
   * Render world copies.
   */
  renderWorldCopies?: boolean

  /**
   * Attribution control.
   */
  attributionControl?: boolean

  /**
   * Locale for controls.
   */
  locale?: string
}

/**
 * Live map instance providing viewport control, marker/layer management, and event handling.
 */
export interface MapInstance {
  /**
   * Gets the current viewport.
   */
  getViewport(): Viewport

  /**
   * Sets the viewport.
   */
  setViewport(viewport: Partial<Viewport>, options?: { animate?: boolean; duration?: number }): void

  /**
   * Flies to a location.
   */
  flyTo(
    location: Partial<Viewport>,
    options?: { duration?: number; curve?: number; easing?: (t: number) => number },
  ): void

  /**
   * Fits the map to bounds.
   */
  fitBounds(bounds: Bounds, options?: { padding?: number; animate?: boolean }): void

  /**
   * Gets the current bounds.
   */
  getBounds(): Bounds

  /**
   * Adds a marker.
   */
  addMarker(marker: MarkerConfig): void

  /**
   * Removes a marker.
   */
  removeMarker(id: string): void

  /**
   * Updates a marker.
   */
  updateMarker(id: string, updates: Partial<MarkerConfig>): void

  /**
   * Gets all markers.
   */
  getMarkers(): MarkerConfig[]

  /**
   * Clears all markers.
   */
  clearMarkers(): void

  /**
   * Adds a polyline.
   */
  addPolyline(polyline: PolylineConfig): void

  /**
   * Removes a polyline.
   */
  removePolyline(id: string): void

  /**
   * Adds a polygon.
   */
  addPolygon(polygon: PolygonConfig): void

  /**
   * Removes a polygon.
   */
  removePolygon(id: string): void

  /**
   * Adds a circle.
   */
  addCircle(circle: CircleConfig): void

  /**
   * Removes a circle.
   */
  removeCircle(id: string): void

  /**
   * Opens a popup.
   */
  openPopup(popup: PopupConfig): void

  /**
   * Closes all popups.
   */
  closePopups(): void

  /**
   * Adds an event listener.
   */
  on<T = unknown>(event: MapEvent, handler: (data: T) => void): () => void

  /**
   * Removes an event listener.
   */
  off<T = unknown>(event: MapEvent, handler: (data: T) => void): void

  /**
   * Adds a click listener for a marker.
   */
  onMarkerClick(markerId: string, handler: (marker: MarkerConfig) => void): () => void

  /**
   * Projects coordinates to pixel position.
   */
  project(coordinates: Coordinates): { x: number; y: number }

  /**
   * Unprojects pixel position to coordinates.
   */
  unproject(point: { x: number; y: number }): Coordinates

  /**
   * Resizes the map.
   */
  resize(): void

  /**
   * Gets the map container element.
   */
  getContainer(): HTMLElement

  /**
   * Gets the canvas element.
   */
  getCanvas(): HTMLCanvasElement

  /**
   * Takes a screenshot.
   */
  getSnapshot(options?: { width?: number; height?: number }): Promise<string>

  /**
   * Gets the underlying map instance.
   */
  getInstance(): unknown

  /**
   * Destroys the map.
   */
  destroy(): void
}

/**
 * Map provider interface.
 */
export interface MapProvider {
  /**
   * Create a new map instance with the given configuration.
   * @returns A MapInstance that can be used to control the map.
   */
  createMap(config: MapConfig): MapInstance | Promise<MapInstance>

  /**
   * Get the display name of this map provider (e.g., 'Google Maps', 'Mapbox').
   * @returns The provider name string.
   */
  getName(): string

  /**
   * Check if the map provider's SDK/library has been loaded and is ready.
   * @returns Whether the map provider is loaded and ready to create maps.
   */
  isLoaded(): boolean

  /**
   * Get the list of available map styles for this provider.
   * @returns Array of style objects with id, name, and URL.
   */
  getStyles(): { id: string; name: string; url: string }[]

  /**
   * Geocodes an address.
   */
  geocode?(address: string): Promise<Coordinates[]>

  /**
   * Reverse geocodes coordinates.
   */
  reverseGeocode?(coordinates: Coordinates): Promise<string>

  /**
   * Gets directions between points.
   */
  getDirections?(
    origin: Coordinates,
    destination: Coordinates,
    options?: { mode?: 'driving' | 'walking' | 'cycling' },
  ): Promise<{ route: Coordinates[]; duration: number; distance: number }>
}
