# @molecule/app-card-grid-react

React card-grid and bento-grid layouts.

Exports:
- `<CardGrid>` — responsive grid with configurable column count.
- `<BentoGrid>` — col/row-span or named-areas layout for mixed-size cards.

## Quick Start

```tsx
import { CardGrid, BentoGrid } from '@molecule/app-card-grid-react'

<CardGrid columns={3} gap="md">
  <ProductCard product={products[0]} />
  <ProductCard product={products[1]} />
  <ProductCard product={products[2]} />
</CardGrid>

<BentoGrid
  items={[
    { id: 'hero', content: <HeroCard />, colSpan: 8, rowSpan: 2 },
    { id: 'stats', content: <StatsCard />, colSpan: 4 },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-card-grid-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `BentoItem`

Data descriptor for a single cell in a BentoGrid layout.

```typescript
interface BentoItem {
  /** Unique item identifier (React key). */
  id: string
  /** Card content. */
  content: ReactNode
  /** CSS grid-column-span (1-12). Defaults to 4. */
  colSpan?: number
  /** CSS grid-row-span (1-6). Defaults to 1. */
  rowSpan?: number
  /** Named grid-area when using `areas` layout. */
  area?: string
}
```

### Functions

#### `BentoGrid(root0, root0, root0, root0, root0, root0)`

Bento-style grid — items span multiple cells for a magazine / dashboard
layout. Works in two modes: (a) col/row-span driven, (b) named-areas
driven via the `areas` prop.

```typescript
function BentoGrid({
  items,
  areas,
  columns = 12,
  gap = 'md',
  className,
}: BentoGridProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .items
- `root0` — .areas
- `root0` — .columns
- `root0` — .gap
- `root0` — .className

#### `CardGrid(root0, root0, root0, root0, root0)`

Generic responsive card grid. Collapses to one column on narrow viewports
and grows to `columns` on md+. Typical uses: product grids, post grids,
dashboard widget rows.

```typescript
function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: CardGridProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .columns
- `root0` — .gap
- `root0` — .className

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
