# @molecule/app-image-gallery-react

React image gallery.

Exports `<ImageGallery>` — main image + thumbnail grid with controlled-optional
selection and "+N" overflow summarisation.

## Quick Start

```tsx
import { ImageGallery } from '@molecule/app-image-gallery-react'

const images = [
  'https://example.com/photo-1.jpg',
  'https://example.com/photo-2.jpg',
  'https://example.com/photo-3.jpg',
]

// Uncontrolled — manages its own selected index
<ImageGallery images={images} maxThumbnails={4} />

// Controlled — caller drives selected index
<ImageGallery images={images} selectedIndex={activeIdx} onSelect={setActiveIdx} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-image-gallery-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `ImageGallery(root0, root0, root0, root0, root0, root0, root0)`

Main image + thumbnail grid gallery. Controlled-optional: when
`selectedIndex` is omitted the component tracks its own selection.

Used for product images, property listings, portfolio galleries.

```typescript
function ImageGallery({
  images,
  selectedIndex,
  onSelect,
  maxThumbnails = 4,
  alts,
  className,
}: ImageGalleryProps): JSX.Element | null
```

- `root0` — *
- `root0` — .images
- `root0` — .selectedIndex
- `root0` — .onSelect
- `root0` — .maxThumbnails
- `root0` — .alts
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
