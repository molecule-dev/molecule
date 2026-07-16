# @molecule/app-slide-thumbnail-react

Slide thumbnail tile for presentation editors / slideshow navigators.
Renders a fixed-width clickable tile with an index badge and an
"active" outline; the app supplies the scaled-down slide preview as
`children`.

Props: `index` (1-based, required), `active`, `onClick`,
`aspect` (`'16/9' | '4/3' | '1/1'`, default `'16/9'`), `width` (px,
default 160), `className`, `children`.

## Quick Start

```tsx
import { SlideThumbnail } from '@molecule/app-slide-thumbnail-react'

interface Slide { id: string; title: string }

function SlideStrip({ slides, activeIndex, onSelect }: {
  slides: Slide[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
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
          <span>{slide.title}</span>
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
npm install @molecule/app-slide-thumbnail-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SlideThumbnailProps`

Props for the {@link SlideThumbnail} component.

```typescript
interface SlideThumbnailProps {
  /** Slide index (1-based). */
  index: number
  /** Live preview content (rendered scaled-down). */
  children?: ReactNode
  /** Whether the thumbnail represents the active slide. */
  active?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Optional aspect ratio (defaults to 16/9). */
  aspect?: '16/9' | '4/3' | '1/1'
  /** Width in pixels. Defaults to 160. */
  width?: number
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SlideThumbnail(props)`

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

- `props` — Component props (see {@link SlideThumbnailProps}).

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

- Requires a wired ClassMap bond (e.g. `@molecule/app-ui-tailwind`) —
  `getClassMap()` throws before bonding.
- The tile surface is hardcoded white (`background: '#fff'`) so light
  slide content stays readable, even in dark themes — render your own
  themed preview inside `children` if that is wrong for your app.
- The active outline uses `currentColor`; set a text color on a parent
  to control it.
- The index badge aria-label is currently English-only ("Slide N").
