# @molecule/app-carousel-react

Image / card carousel.

Exports `<Carousel>` — arrows + dots + optional autoplay; controlled-optional.

## Quick Start

```tsx
import { Carousel } from '@molecule/app-carousel-react'

<Carousel autoplayMs={4000} showDots showArrows>
  <img src="/slides/one.jpg" alt="Slide 1" />
  <img src="/slides/two.jpg" alt="Slide 2" />
  <img src="/slides/three.jpg" alt="Slide 3" />
</Carousel>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-carousel-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `CarouselProps`

```typescript
interface CarouselProps {
  /** Slides — each child is one frame. */
  children: ReactNode[]
  /** Controlled active index — caller owns state. */
  index?: number
  /** Called when the active index changes. */
  onChange?: (index: number) => void
  /** Show prev/next arrows. Defaults to true. */
  showArrows?: boolean
  /** Show dot indicator strip. Defaults to true. */
  showDots?: boolean
  /** Auto-advance interval in ms (set 0 to disable). */
  autoplayMs?: number
  /** Pause autoplay on mouseover. Defaults to true. */
  pauseOnHover?: boolean
  /** Loop back to start at end. Defaults to true. */
  loop?: boolean
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `Carousel(props)`

Generic image / card carousel with arrows + dots + optional autoplay.
Controlled-optional: omit `index` to let the component manage its own
state.

```typescript
function Carousel({
  children,
  index,
  onChange,
  showArrows = true,
  showDots = true,
  autoplayMs = 0,
  pauseOnHover = true,
  loop = true,
  className,
}: CarouselProps): JSX.Element | null
```

- `props` — Component props (see {@link CarouselProps}).

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

Controlled-optional: omit `index` for internal state; pass `index` +
`onChange` to own it. `autoplayMs={0}` (the default) disables
autoplay; autoplay pauses on hover unless `pauseOnHover={false}`.
`loop` (default `true`) wraps at the ends. Slides are equal-width
children of a translated flex track — give each child its own aspect
ratio/height. Translations come from the companion
`@molecule/app-locales-carousel` locale bond.

## Translations

Translation strings are provided by `@molecule/app-locales-carousel`.
