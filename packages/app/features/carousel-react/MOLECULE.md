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
npm install @molecule/app-carousel-react
```

## API

### Functions

#### `Carousel(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .children
- `root0` — .index
- `root0` — .onChange
- `root0` — .showArrows
- `root0` — .showDots
- `root0` — .autoplayMs
- `root0` — .pauseOnHover
- `root0` — .loop
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
