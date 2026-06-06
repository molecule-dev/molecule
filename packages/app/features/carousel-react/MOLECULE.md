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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
