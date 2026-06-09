# @molecule/app-photo-lightbox-react

Fullscreen photo viewer.

Exports `<PhotoLightbox>` and `LightboxPhoto` type.

## Quick Start

```tsx
import { PhotoLightbox, LightboxPhoto } from '@molecule/app-photo-lightbox-react'

const photos: LightboxPhoto[] = [
  { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
  { src: '/images/photo2.jpg', alt: 'Valley below' },
]

<PhotoLightbox
  photos={photos}
  open={lightboxOpen}
  onClose={() => setLightboxOpen(false)}
  initialIndex={selectedIndex}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-photo-lightbox-react
```

## API

### Interfaces

#### `LightboxPhoto`

A single photo entry for the lightbox, with src, optional alt text, and optional caption.

```typescript
interface LightboxPhoto {
  src: string
  alt?: string
  caption?: ReactNode
}
```

### Functions

#### `PhotoLightbox(root0, root0, root0, root0, root0, root0)`

Fullscreen photo viewer with prev/next arrows, keyboard navigation
(← → Esc), close button, and optional captions.

```typescript
function PhotoLightbox({
  photos,
  open,
  onClose,
  initialIndex = 0,
  onIndexChange,
}: PhotoLightboxProps): JSX.Element | null
```

- `root0` — *
- `root0` — .photos
- `root0` — .open
- `root0` — .onClose
- `root0` — .initialIndex
- `root0` — .onIndexChange

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
