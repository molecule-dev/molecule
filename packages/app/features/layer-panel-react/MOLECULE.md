# @molecule/app-layer-panel-react

Photoshop / Figma–style reorderable layer panel for React.

Exports:
- `<LayerPanel>` — the panel component (drag-to-reorder via pointer
  events, visibility / lock toggles, double-click inline rename,
  click-to-select, optional thumbnail + opacity + blend-mode metadata).
- Types: `LayerPanelProps`, `Layer`, `LayerBlendMode`.
- Helpers: `moveLayer()`, `formatOpacityPercent()`.

The panel is fully controlled — the host application owns the
`Layer[]` array and re-renders with the next state in response to
the `onReorder` / `onVisibilityToggle` / `onLockToggle` / `onSelect`
/ `onRename` callbacks.

Layers are rendered top-down per Photoshop convention: index 0 is
the first row in the UI and represents the front-most layer.

Toggle/rename labels route through `t()` — add the companion
`@molecule/app-locales-layer-panel` bond to translate them. Locked layers
cannot be dragged or renamed. The eye / lock toggles render emoji glyphs.

## Quick Start

```tsx
import { useState } from 'react'
import { LayerPanel, type Layer } from '@molecule/app-layer-panel-react'

const initial: Layer[] = [
  { id: 'bg', name: 'Background', visible: true, locked: false },
  { id: 'fg', name: 'Sketch', visible: true, locked: false, opacity: 0.8 },
]

function Editor() {
  const [layers, setLayers] = useState<Layer[]>(initial)
  const [activeId, setActiveId] = useState<string | undefined>()
  return (
    <LayerPanel
      layers={layers}
      activeId={activeId}
      onReorder={setLayers}
      onVisibilityToggle={(id) =>
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
      }
      onLockToggle={(id) =>
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)))
      }
      onSelect={setActiveId}
      onRename={(id, name) =>
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
      }
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-layer-panel-react @molecule/app-i18n @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `Layer`

A single editable layer in the stack. The host application owns the
data — `<LayerPanel>` is a controlled view that emits intent callbacks
(`onReorder`, `onVisibilityToggle`, `onLockToggle`, `onSelect`,
`onRename`) and never mutates anything itself.

```typescript
interface Layer {
  /** Stable id used as the React key and as the value passed to callbacks. */
  id: string
  /** Human-readable name shown in the row and edited via inline rename. */
  name: string
  /** When `false` the layer renders dimmed with a slashed-eye icon. */
  visible: boolean
  /** When `true` interactive controls (rename, drag) are disabled. */
  locked: boolean
  /** Optional 0–1 alpha shown as a percentage in the row metadata. */
  opacity?: number
  /** Optional blend mode shown as text in the row's metadata badge. */
  blendMode?: LayerBlendMode
  /**
   * Optional thumbnail data URL or remote URL displayed left of the
   * layer name. Apps without thumbnails should omit this.
   */
  thumbnail?: string
}
```

#### `LayerPanelProps`

Public props for `<LayerPanel>`.

```typescript
interface LayerPanelProps {
  /**
   * Ordered layers, **top-down** (index 0 renders as the first row and
   * represents the top-most layer in Photoshop terms).
   */
  layers: Layer[]
  /** Called with the full reordered list after a drag completes. */
  onReorder: (next: Layer[]) => void
  /** Called when the eye icon is clicked. */
  onVisibilityToggle: (id: string) => void
  /** Called when the lock icon is clicked. */
  onLockToggle: (id: string) => void
  /** Called when a row is clicked (single click, anywhere in the row body). */
  onSelect: (id: string) => void
  /** Called when an inline rename commits with a non-empty trimmed value. */
  onRename: (id: string, name: string) => void
  /**
   * Currently active layer id — drives `aria-selected` and a "selected"
   * highlight on the row. Optional; when omitted no row is highlighted.
   */
  activeId?: string
  /** Optional extra classes appended to the panel root. */
  className?: string
}
```

### Types

#### `LayerBlendMode`

Photoshop/Figma-style blend mode. The set mirrors the CSS
`mix-blend-mode` keywords so apps can pass the value straight through
to a canvas/DOM renderer if they want.

```typescript
type LayerBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'
```

### Functions

#### `formatOpacityPercent(opacity)`

Format an opacity value (`0`..`1`) as a Photoshop-style integer
percent string (`"100%"`). Returns an empty string when opacity is
`undefined` so callers can render "no metadata" rows naturally.

Values outside `[0, 1]` are clamped, fractional results are rounded
to the nearest integer.

```typescript
function formatOpacityPercent(opacity: number | undefined): string
```

- `opacity` — The 0–1 opacity, or `undefined`.

**Returns:** A locale-agnostic `"NN%"` string, or `""` when opacity is undefined.

#### `LayerPanel(props)`

Photoshop / Figma–style layer panel.

Renders a vertical, drag-to-reorder list of layers with eye/lock
toggles, inline rename (double-click), and click-to-select. All
interactions emit intent callbacks; the host application owns the
data and re-renders with the next `layers` array.

Drag-to-reorder uses pointer events (no `@dnd-kit` or HTML5 DnD
dependency), so it works on touch surfaces and inside transformed
canvases without quirks. The visual convention is top-down — index 0
is the front-most layer.

```typescript
function LayerPanel(props: LayerPanelProps): JSX.Element
```

- `props` — {@link LayerPanelProps}.

**Returns:** The layer panel element.

#### `moveLayer(layers, fromIndex, toIndex)`

Move a layer from one index to another inside the panel array, returning a
fresh array. The display convention is **top-down** (index 0 is the
top-most layer in Photoshop terms — the front-most), so callers don't
have to reverse anything.

Out-of-range indices are clamped to `[0, layers.length - 1]`. If the
source and destination resolve to the same index the original array
is returned unchanged (referential equality preserved).

```typescript
function moveLayer(layers: readonly Layer[], fromIndex: number, toIndex: number): Layer[]
```

- `layers` — Current ordered layers (top-down).
- `fromIndex` — Index of the layer being moved.
- `toIndex` — Destination index after the move.

**Returns:** A new array reflecting the reordered layers, or the original
 *   reference if the move is a no-op.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-layer-panel`.
