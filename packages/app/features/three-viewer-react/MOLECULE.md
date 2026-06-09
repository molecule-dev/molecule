# @molecule/app-three-viewer-react

3D model viewer wrapping three.js.

Exports `<ThreeViewer>` — a React component that renders GLTF/GLB, OBJ,
or STL models with orbit controls, lighting presets, auto-fit camera,
and full GPU resource cleanup on unmount.

## Quick Start

```tsx
import { ThreeViewer } from '@molecule/app-three-viewer-react'

function ModelPage() {
  return (
    <ThreeViewer
      src="/models/duck.glb"
      lighting="studio"
      autoRotate
      onLoad={() => console.log('loaded')}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-three-viewer-react
```

## API

### Interfaces

#### `ThreeViewerProps`

Props for the {@link ThreeViewer} component.

```typescript
interface ThreeViewerProps {
  /** URL or path to the 3D model file. */
  src: string
  /**
   * Model format. If omitted, inferred from the `src` extension. Falls back
   * to `'gltf'` for unknown extensions.
   */
  format?: ThreeViewerFormat
  /** Lighting preset. Defaults to `'studio'`. */
  lighting?: ThreeViewerLighting
  /** Optional CSS background colour for the canvas (CSS string or hex). */
  background?: string
  /** Slowly rotate the camera around the model. Defaults to `false`. */
  autoRotate?: boolean
  /**
   * Override the orbit camera target (world-space x/y/z). When omitted, the
   * target is automatically set to the centre of the model's bounding box.
   */
  cameraTarget?: [number, number, number]
  /** Fired when the model has loaded into the scene. */
  onLoad?: () => void
  /** Fired when loading fails. */
  onError?: (error: Error) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
```

### Types

#### `ThreeViewerFormat`

Supported 3D model formats.

```typescript
type ThreeViewerFormat = 'gltf' | 'glb' | 'obj' | 'stl'
```

#### `ThreeViewerLighting`

Lighting presets — drive the scene's light rig.

```typescript
type ThreeViewerLighting = 'studio' | 'sunset' | 'flat'
```

### Functions

#### `disposeObject3D(root)`

Walk an Object3D tree and dispose every geometry, material, and texture so
three.js does not leak GPU resources when the viewer unmounts or swaps
models.

```typescript
function disposeObject3D(root: Object3D<Object3DEventMap>): void
```

- `root` — The root node to dispose.

#### `resolveFormat(src, explicit)`

Resolve a model format from an explicit prop or the file extension on `src`.

```typescript
function resolveFormat(src: string, explicit?: ThreeViewerFormat): ThreeViewerFormat
```

- `src` — The model URL.
- `explicit` — The explicit `format` prop, if provided.

**Returns:** The resolved format.

#### `ThreeViewer(props)`

3D model viewer wrapping three.js.

Supports GLTF/GLB, OBJ, and STL inputs, orbit controls, and a small set of
lighting presets. The camera auto-fits to the model's bounding box on
load. All three.js GPU resources (geometry, materials, textures, the
renderer itself) are disposed on unmount or when `src`/`format` changes.

```typescript
function ThreeViewer(props: ThreeViewerProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered viewer.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
