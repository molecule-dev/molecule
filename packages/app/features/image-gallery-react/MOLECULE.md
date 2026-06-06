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
npm install @molecule/app-image-gallery-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
