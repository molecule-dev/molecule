# @molecule/app-map-drawing-react

Map drawing — toolbar + interaction surface for authoring geofences
(polygons, circles, pins, lines) on top of any `@molecule/app-maps`
backend.

Composes with `@molecule/app-maps` via the `mapBackend` prop +
`mapSlot` render slot, so swapping the underlying map provider does
not require changing the drawing surface.

Used by fleet-management (delivery zones), property-management
(parcel boundaries), and venue-booking (event footprints).

## Quick Start

```tsx
import { MapDrawing } from '@molecule/app-map-drawing-react'
import type { MapShape } from '@molecule/app-map-drawing-react'

<MapDrawing
  tools={['polygon', 'circle', 'pin']}
  height={500}
  onChange={(shapes: MapShape[]) => saveZones(shapes)}
  mapSlot={<MapView />}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-map-drawing-react
```

## API

### Interfaces

#### `GeoJsonLineString`

GeoJSON LineString — sequence of two-or-more positions.

```typescript
interface GeoJsonLineString {
  /** Geometry type discriminator. */
  type: 'LineString'
  /** Ordered list of positions — `[lng, lat]` pairs. */
  coordinates: [number, number][]
}
```

#### `GeoJsonPoint`

GeoJSON Point — `[lng, lat]` (longitude first, per the spec).

```typescript
interface GeoJsonPoint {
  /** Geometry type discriminator. */
  type: 'Point'
  /** Single position — `[lng, lat]`. */
  coordinates: [number, number]
}
```

#### `GeoJsonPolygon`

GeoJSON Polygon — outer ring + optional holes. The drawing surface
only authors the outer ring; holes are preserved verbatim if present
on `initialShapes`.

```typescript
interface GeoJsonPolygon {
  /** Geometry type discriminator. */
  type: 'Polygon'
  /**
   * Array of linear rings. The first ring is the outer boundary; any
   * subsequent rings are holes. Each ring is a closed sequence of
   * `[lng, lat]` positions where the first and last positions are
   * identical.
   */
  coordinates: [number, number][][]
}
```

#### `MapDrawingBackend`

Backend the drawing surface delegates projection + great-circle
distance to. Production callers pass an adapter wired to
`@molecule/app-maps`'s `MapInstance` (`project` / `unproject`); test
callers can pass a stub backend that uses identity projection.

The backend abstraction means the component never depends on a
specific map provider — swap Mapbox for Google Maps for Leaflet by
swapping the backend, not the drawing surface.

```typescript
interface MapDrawingBackend {
  /**
   * Project a `[lng, lat]` position to a screen-space pixel coordinate
   * inside the drawing surface's bounding box.
   *
   * @param coordinates - `[lng, lat]` position.
   * @returns Pixel offset relative to the drawing surface.
   */
  project(coordinates: [number, number]): ScreenPoint

  /**
   * Unproject a screen-space pixel coordinate back to `[lng, lat]`.
   *
   * @param point - Pixel offset relative to the drawing surface.
   * @returns Geographic position in `[lng, lat]` order.
   */
  unproject(point: ScreenPoint): [number, number]

  /**
   * Distance in meters between two `[lng, lat]` positions. Used to
   * compute circle radii from drag distance. Production backends
   * should use the Haversine great-circle formula; the default
   * fallback uses an equirectangular approximation that is fine for
   * small drag deltas at non-polar latitudes.
   *
   * @param a - First position.
   * @param b - Second position.
   * @returns Distance in meters.
   */
  distanceMeters(a: [number, number], b: [number, number]): number
}
```

#### `MapShape`

Drawn shape carried by the component. The `kind` discriminator is
kept independent of the GeoJSON `type` because circles share the
`Point` geometry (a radius lives in `properties`).

```typescript
interface MapShape {
  /** Stable identifier for the shape (used as a React key). */
  id: string
  /** Logical shape kind. Drives toolbar selection + rendering style. */
  kind: 'polygon' | 'circle' | 'pin' | 'line'
  /** GeoJSON geometry. */
  geometry: GeoJsonGeometry
  /**
   * Free-form caller properties carried alongside the geometry. The
   * `radiusMeters` key is reserved for circle shapes and is required
   * when `kind === 'circle'`.
   */
  properties?: Record<string, unknown> & { radiusMeters?: number }
}
```

#### `ScreenPoint`

Screen-space point in CSS pixels relative to the drawing surface's
bounding box. `(0, 0)` is the top-left corner.

```typescript
interface ScreenPoint {
  /** Horizontal offset in CSS pixels. */
  x: number
  /** Vertical offset in CSS pixels. */
  y: number
}
```

### Types

#### `ActiveTool`

Active tool — either one of the drawing tools or one of the action
modes (`select`).

```typescript
type ActiveTool = DrawingTool | 'select'
```

#### `DrawingTool`

Tools the toolbar may show. The fixed set is the four drawing tools
plus two action tools (`select`, `delete`). The component renders
the four drawing tools by default (`tools` prop) and always shows
`select` + `delete` because they have no opt-out semantic.

```typescript
type DrawingTool = 'polygon' | 'circle' | 'pin' | 'line'
```

#### `GeoJsonGeometry`

Union of GeoJSON geometry kinds the drawing surface understands.

```typescript
type GeoJsonGeometry = GeoJsonPoint | GeoJsonLineString | GeoJsonPolygon
```

#### `ShapeSelection`

Selection set — keyed by shape id. Stored as a `Set<string>` so
delete operations stay O(1) regardless of how many shapes are drawn.

```typescript
type ShapeSelection = ReadonlySet<string>
```

### Functions

#### `closeRing(vertices)`

Snap an open ring (the in-progress polygon vertex list) into a
GeoJSON-compliant closed ring by repeating the first point at the
end. Returns `null` when the ring has fewer than three vertices,
since polygons require a minimum of three distinct points plus the
closing repeat.

```typescript
function closeRing(vertices: [number, number][]): [number, number][] | null
```

- `vertices` — Open ring of `[lng, lat]` pairs.

**Returns:** Closed ring, or `null` when there are not enough points.

#### `haversineDistanceMeters(a, b)`

Great-circle distance between two `[lng, lat]` positions in meters
using the Haversine formula. Matches the precision of the production
map backends so the radius computed during drag agrees with what the
backend will project back to the user.

```typescript
function haversineDistanceMeters(a: [number, number], b: [number, number]): number
```

- `a` — First position.
- `b` — Second position.

**Returns:** Distance in meters.

#### `pointInRect(point, a, b)`

Check whether a screen-space point lies inside the given selection
rectangle (axis-aligned, inclusive bounds).

```typescript
function pointInRect(point: ScreenPoint, a: ScreenPoint, b: ScreenPoint): boolean
```

- `point` — Point under test.
- `a` — One corner of the selection rectangle.
- `b` — Opposite corner of the selection rectangle.

**Returns:** `true` when the point lies inside the rectangle.

#### `toRadians(degrees)`

Convert degrees to radians.

```typescript
function toRadians(degrees: number): number
```

- `degrees` — Angle in degrees.

**Returns:** Angle in radians.

### Constants

#### `identityBackend`

Identity drawing backend — used when no real map is mounted (tests,
SSR, demo storyboards). Projection is `lng → x`, `lat → y` so
fixtures can be authored in pixel space and round-trip cleanly. The
distance metric is Euclidean pixels rather than meters; callers that
care about a real radius should always pass a real backend.

```typescript
const identityBackend: MapDrawingBackend
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
