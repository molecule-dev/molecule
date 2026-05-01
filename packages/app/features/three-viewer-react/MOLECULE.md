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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
