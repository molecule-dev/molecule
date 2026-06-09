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

## API

### Functions

#### `SlideThumbnail(root0, root0, root0, root0, root0, root0, root0, root0)`

Slide thumbnail tile for presentation editors / slideshow navigators.
Apps render the live scaled-down preview as `children`; this
component provides the surrounding chrome (active outline + index
label).

```typescript
function SlideThumbnail({
  index,
  children,
  active,
  onClick,
  aspect = '16/9',
  width = 160,
  className,
}: SlideThumbnailProps): JSX.Element
```

- `root0` — *
- `root0` — .index
- `root0` — .children
- `root0` — .active
- `root0` — .onClick
- `root0` — .aspect
- `root0` — .width
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
