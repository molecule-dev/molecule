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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-annotation-pin`.
