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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
