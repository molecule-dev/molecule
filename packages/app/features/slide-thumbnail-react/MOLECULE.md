# @molecule/app-slide-thumbnail-react

Slide thumbnail tile for presentation editors / slideshow navigators.

Exports `<SlideThumbnail>`.

## Quick Start

```tsx
import { SlideThumbnail } from '@molecule/app-slide-thumbnail-react'

export function SlideStrip({ slides, activeIndex, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {slides.map((slide, i) => (
        <SlideThumbnail
          key={slide.id}
          index={i + 1}
          active={i === activeIndex}
          onClick={() => onSelect(i)}
          width={160}
        >
          <SlidePreview slide={slide} />
        </SlideThumbnail>
      ))}
    </div>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-slide-thumbnail-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
