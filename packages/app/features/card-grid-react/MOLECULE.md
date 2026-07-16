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

#### `BentoGridProps`

```typescript
interface BentoGridProps {
  /** Items to render. */
  items: BentoItem[]
  /**
   * Optional `grid-template-areas` string (e.g. `'a a b' 'c d d'`). When
   * provided, each `BentoItem.area` must match a token in the template.
   */
  areas?: string
  /** Default column count when `areas` is absent. Defaults to 12. */
  columns?: number
  /** Gap between items. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}
```

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

#### `CardGridProps`

```typescript
interface CardGridProps {
  /** Cards. */
  children: ReactNode
  /** Column count at the md+ breakpoint. 1–6. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `BentoGrid(props)`

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

- `props` — Component props (see {@link BentoGridProps}).

#### `CardGrid(props)`

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

- `props` — Component props (see {@link CardGridProps}).

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

`<CardGrid>` collapses to one column on narrow viewports and grows to
`columns` (1–6) at the md+ breakpoint via the ClassMap grid. In
`<BentoGrid>`, span mode uses a `columns`-wide grid (default 12) with
per-item `colSpan`/`rowSpan`; passing `areas` switches to named
`grid-template-areas` — then every item must set a matching `area`
token or it falls out of the template.
