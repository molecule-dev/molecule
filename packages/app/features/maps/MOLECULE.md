# @molecule/app-maps

Map interface for molecule.dev.

Provides a unified API for interactive maps that works with
different map libraries (MapBox, Google Maps, Leaflet, etc.).

## Type
`feature`

## Installation
```bash
npm install @molecule/app-maps
```

## API

### Interfaces

#### `Bounds`

Geographic bounds (bounding box).

```typescript
interface Bounds {
  /**
   * Northeast corner.
   */
  ne: Coordinates

  /**
   * Southwest corner.
   */
  sw: Coordinates
}
```

#### `CircleConfig`

Map circle overlay (center, radius in meters, fill/stroke colors).

```typescript
interface CircleConfig {
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
```

#### `Coordinates`

Latitude/longitude pair with optional altitude.

```typescript
interface Coordinates {
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
```

#### `MapClickEvent`

Map click event data.

```typescript
interface MapClickEvent {
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
```

#### `MapConfig`

Map initialization options (container, center, zoom, style, interaction controls, bounds).

```typescript
interface MapConfig {
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
```

#### `MapInstance`

Live map instance providing viewport control, marker/layer management, and event handling.

```typescript
interface MapInstance {
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
```

#### `MapMoveEvent`

Map move event data.

```typescript
interface MapMoveEvent {
  /**
   * New viewport.
   */
  viewport: Viewport

  /**
   * Original event.
   */
  originalEvent?: Event
}
```

#### `MapProvider`

Map provider interface.

```typescript
interface MapProvider {
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
```

#### `MarkerConfig`

Map marker configuration (position, icon, popup, draggable, color, metadata).

```typescript
interface MarkerConfig {
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
```

#### `PolygonConfig`

Map polygon overlay (closed path, fill/stroke colors, opacity).

```typescript
interface PolygonConfig {
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
```

#### `PolylineConfig`

Map polyline overlay (path coordinates, stroke color/width/opacity, dash pattern).

```typescript
interface PolylineConfig {
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
```

#### `PopupConfig`

Map popup configuration (position, HTML content, offset, close behavior, max width).

```typescript
interface PopupConfig {
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
```

#### `Viewport`

Map viewport state (center coordinates, zoom, bearing, pitch, and bounds).

```typescript
interface Viewport {
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
```

### Types

#### `MapEvent`

Map event types.

```typescript
type MapEvent =
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
```

### Functions

#### `calculateBounds(coordinates)`

Calculate the bounding box that contains all given coordinates.

```typescript
function calculateBounds(coordinates: Coordinates[]): Bounds
```

- `coordinates` — Array of coordinates to compute bounds for.

**Returns:** The southwest and northeast corners of the bounding box.

#### `calculateCenter(coordinates)`

Calculate the geographic center (centroid) of multiple coordinates.

```typescript
function calculateCenter(coordinates: Coordinates[]): Coordinates
```

- `coordinates` — Array of coordinates to average.

**Returns:** The center point as a Coordinates object.

#### `calculateDistance(from, to)`

Calculate the Haversine distance between two geographic coordinates.

```typescript
function calculateDistance(from: Coordinates, to: Coordinates): number
```

- `from` — The starting coordinates.
- `to` — The destination coordinates.

**Returns:** The distance in meters.

#### `createMap(config)`

Create a new map instance using the current provider.

```typescript
function createMap(config: MapConfig): MapInstance | Promise<MapInstance>
```

- `config` — Map configuration (container element, center, zoom, style, etc.).

**Returns:** A MapInstance for controlling the map.

#### `createSimpleMapProvider(options)`

Create a simple placeholder map provider that renders a static placeholder
div instead of a real map. Useful as a fallback when no map SDK is loaded.

```typescript
function createSimpleMapProvider(options?: SimpleMapProviderOptions): MapProvider
```

- `options` — Optional placeholder title and description text.

**Returns:** A MapProvider that renders placeholder content.

#### `getProvider()`

Get the current map provider. Falls back to a simple placeholder
provider if none has been explicitly set.

```typescript
function getProvider(): MapProvider
```

**Returns:** The active MapProvider instance.

#### `hasProvider()`

Check if a map provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a MapProvider has been bonded.

#### `isWithinBounds(coordinates, bounds)`

Check if a coordinate point falls within a geographic bounding box.

```typescript
function isWithinBounds(coordinates: Coordinates, bounds: Bounds): boolean
```

- `coordinates` — The point to test.
- `bounds` — The bounding box with southwest and northeast corners.

**Returns:** Whether the point is inside the bounds.

#### `setProvider(provider)`

Set the map provider.

```typescript
function setProvider(provider: MapProvider): void
```

- `provider` — MapProvider implementation to register.

### Constants

#### `defaultStyles`

Default Mapbox style URLs for common map appearances.

```typescript
const defaultStyles: { streets: string; outdoors: string; light: string; dark: string; satellite: string; satelliteStreets: string; navigationDay: string; navigationNight: string; }
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` 1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-maps`.
