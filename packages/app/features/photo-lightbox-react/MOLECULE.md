# @molecule/app-photo-lightbox-react

Fullscreen photo viewer.

Exports `<PhotoLightbox>` (modal overlay with prev/next arrows, keyboard
navigation via ArrowLeft / ArrowRight / Escape, backdrop-click close,
optional captions, and an "N / total" counter) and the `LightboxPhoto`
type.

## Quick Start

```tsx
import { useState } from 'react'
import { PhotoLightbox, type LightboxPhoto } from '@molecule/app-photo-lightbox-react'

const photos: LightboxPhoto[] = [
  { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
  { src: '/images/photo2.jpg', alt: 'Valley below' },
]

function Gallery() {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  return (
    <PhotoLightbox
      photos={photos}
      open={open}
      onClose={() => setOpen(false)}
      initialIndex={index}
      onIndexChange={setIndex}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-photo-lightbox-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `PhotoLightboxProps`

Props for {@link PhotoLightbox}.

```typescript
interface PhotoLightboxProps {
  /** Photos array. */
  photos: LightboxPhoto[]
  /** Whether the lightbox is open. */
  open: boolean
  /** Called when the user closes (X, backdrop, Escape). */
  onClose: () => void
  /** Initial active index. */
  initialIndex?: number
  /** Called whenever the active index changes. */
  onIndexChange?: (index: number) => void
}
```

### Functions

#### `PhotoLightbox(props)`

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

- `props` — Component props (see {@link PhotoLightboxProps}).

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

Companion locale bond: `@molecule/app-locales-photo-lightbox` (keys
`lightbox.close` / `lightbox.previous` / `lightbox.next`). The overlay is
`position: fixed` at `z-index: 100` with a near-black backdrop in both
themes; it does NOT lock body scroll while open. Requires the app-react
i18n provider and a wired ClassMap bond.

## Translations

Translation strings are provided by `@molecule/app-locales-photo-lightbox`.
