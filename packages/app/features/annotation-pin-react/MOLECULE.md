# @molecule/app-annotation-pin-react

Annotation pin / hotspot overlay primitives.

Exports `<AnnotationPin>` (single click-to-toggle marker) and
`<AnnotationLayer>` (parent wrapper that manages many pins on a
surface). Reusable for 3d-model viewers, image annotations, map
pins, and hotspot tours.

## Quick Start

```tsx
import { AnnotationLayer, type Pin } from '@molecule/app-annotation-pin-react'

function ImageAnnotator({ src, pins, setPins, activeId, setActiveId }) {
  return (
    <AnnotationLayer
      pins={pins}
      activePinId={activeId}
      onPinClick={(id) => setActiveId(id === activeId ? null : id)}
      onSurfaceClick={({ x, y }) => {
        const id = crypto.randomUUID()
        setPins([...pins, { id, position: { x, y }, label: pins.length + 1 }])
        setActiveId(id)
      }}
    >
      <img src={src} alt="" style={{ width: '100%', display: 'block' }} />
    </AnnotationLayer>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-annotation-pin-react
```

## API

### Interfaces

#### `AnnotationLayerProps`

`<AnnotationLayer>` props.

```typescript
interface AnnotationLayerProps {
  /** Pins to render on the layer. */
  pins: Pin[]
  /** Optional layer content (the surface to annotate — image, canvas, map tile, etc.). */
  children?: ReactNode
  /**
   * The currently active (popup-open) pin id, or `null` for none. The
   * layer is fully controlled — callers manage selection state.
   */
  activePinId?: string | null
  /** Called with the clicked pin id when a pin marker is clicked. */
  onPinClick?: (pinId: string) => void
  /**
   * Called when the user clicks an empty area of the layer (i.e. not on
   * a pin marker or a popup). Coordinates are in the same space as
   * `Pin.position` — normalised 0..1 by default.
   */
  onSurfaceClick?: (position: { x: number; y: number }) => void
  /**
   * Whether positions are normalised (0..1) — when `true` the layer
   * computes click coordinates as fractions of its bounding box; when
   * `false` it returns raw pixel offsets. Defaults to `true`.
   */
  normalised?: boolean
  /**
   * Side the popup renders on, relative to its marker. Defaults to `'right'`.
   */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the layer root. */
  className?: string
  /** Inline style for the layer root. */
  style?: CSSProperties
}
```

#### `AnnotationPinProps`

`<AnnotationPin>` props.

```typescript
interface AnnotationPinProps {
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the marker. */
  label?: ReactNode
  /** Longer note shown inside the popup when the pin is selected. */
  note?: ReactNode
  /**
   * Whether the pin is currently selected. When `true` the popup is
   * rendered. Selection is controlled — callers manage state in
   * `<AnnotationLayer>` (or themselves) and update via `onClick`.
   */
  selected?: boolean
  /** Click handler — fires when the pin marker is clicked. */
  onClick?: () => void
  /**
   * Side the popup renders on, relative to the marker. Defaults to `'right'`.
   */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the root wrapper. */
  className?: string
  /**
   * Whether `position` is normalised (0..1) — when `true` the wrapper
   * positions itself with `%` units so pins re-anchor on resize. When
   * `false` the wrapper uses raw `px` values. Defaults to `true`.
   */
  normalised?: boolean
}
```

#### `Pin`

A single pin to display on a parent surface. `position` is in the
parent's coordinate space — for image / 2D-canvas overlays this is
normalised 0..1 (so the pin re-anchors as the surface resizes); for
pixel-positioned overlays callers can pass raw px values and provide
their own `style` overrides via `className`.

The label/note are pure data — components handle render only. Surfaces
supply pin objects via `<AnnotationLayer pins={...}>` (or render a
single pin directly if there is only one).

```typescript
interface Pin {
  /** Stable identifier (used as React key). */
  id: string
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the pin marker. */
  label?: ReactNode
  /** Longer note / description body, shown inside the popup when the pin is selected. */
  note?: ReactNode
}
```

### Functions

#### `AnnotationLayer(props)`

Wrapper that manages multiple pins on a parent surface. Renders its
`children` (the surface — typically an `<img>`, `<canvas>`, or
map-tile element) and overlays each `pins[]` entry as a clickable
`<AnnotationPin>` marker.

Click behaviour:
- clicking a pin marker fires `onPinClick(pinId)`
- clicking empty space on the layer fires `onSurfaceClick({ x, y })`,
  which callers typically use to add a new pin

The layer itself sets `position: relative` so absolute pin
positioning works without the caller having to provide a wrapper.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text routes through `t()` so the layer
translates via the companion
`@molecule/app-locales-feature-annotation-pin-react` locale bond.

```typescript
function AnnotationLayer(props: AnnotationLayerProps): JSX.Element
```

- `props` — Component props.

**Returns:** The annotation-layer element.

#### `AnnotationPin(props)`

A single pin marker (small circle with optional `label`) rendered at
an absolute position on its parent. Clicking the marker toggles its
popup (which shows the `note` body) via the `onClick` handler.

Positioning is absolute relative to the nearest positioned ancestor —
callers must wrap the surface (image, canvas, map) in a
`position: relative` element. `<AnnotationLayer>` provides this
wrapper automatically.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text (aria-labels, fallback note text)
routes through `t()` so the marker translates via the companion
`@molecule/app-locales-feature-annotation-pin-react` locale bond.

```typescript
function AnnotationPin(props: AnnotationPinProps): JSX.Element
```

- `props` — Component props.

**Returns:** The pin element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-annotation-pin`.
