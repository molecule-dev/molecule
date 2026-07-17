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

### Interfaces

#### `ImageGalleryProps`

```typescript
interface ImageGalleryProps {
  /** Image URLs in display order. */
  images: string[]
  /** Controlled selected index — caller owns state. */
  selectedIndex?: number
  /** Called when a thumbnail is clicked. */
  onSelect?: (index: number) => void
  /** Max thumbnails shown. Extra are summarised as "+N". */
  maxThumbnails?: number
  /** Alt-text for screen readers. Applied per-image; falls back to `'Image N'`. */
  alts?: string[]
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

### Functions

#### `ImageGallery(props)`

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

- `props` — Component props (see {@link ImageGalleryProps}).

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

- Renders `null` when `images` is empty — no empty-state UI.
- `maxThumbnails` doubles as the thumbnail grid's column count. Any value is
  safe: it is snapped to the nearest column count the ClassMap grid actually
  supports (1-6 or 12), so a real `grid-cols-*` class is always emitted and
  extra thumbnails wrap onto additional rows instead of collapsing.
- Default alt text is the English "Image N" — pass `alts` with translated
  strings in localized apps.
- `getClassMap()` requires a bonded ClassMap (e.g.
  `@molecule/app-ui-tailwind`).
