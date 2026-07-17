# @molecule/app-listing-card-react

React product / property / listing card primitives.

Exports:
- `<ListingCard>` — outer Card shell. Props: `children`, `onClick?`,
  `className?`, `dataMolId?`.
- `<ListingCardMedia>` — top image slot. Props: `src?`, `alt?`, `children?`
  (custom media node), `aspect?` (`'1/1' | '4/3' | '16/9' | '3/2'`, default
  `'4/3'`, applied as an inline aspect-ratio style), `overlay?` (badge /
  favorite button, absolutely positioned over the media), `className?`.
- `<ListingCardBody>` — stacked text. Props: `title`, `subtitle?`, `price?`,
  `meta?`, `className?`.
- `<ListingCardActions>` — action row. Props: `children`, `layout?`
  (`'horizontal'` default | `'stacked'`), `className?`.
- `<ListingGrid>` — grid container. Props: `children`, `columns?` (1–6, default
  3), `gap?`, `className?`.

## Quick Start

```tsx
import { ListingCard, ListingCardMedia, ListingCardBody, ListingCardActions, ListingGrid } from '@molecule/app-listing-card-react'

<ListingGrid columns={3}>
  <ListingCard onClick={() => navigate(`/listings/${item.id}`)}>
    <ListingCardMedia src={item.imageUrl} aspect="4/3" alt={item.name} />
    <ListingCardBody title={item.name} subtitle={item.location} price={`$${item.price}/night`} />
    <ListingCardActions>
      <button onClick={(e) => { e.stopPropagation(); saveListing(item.id) }}>Save</button>
    </ListingCardActions>
  </ListingCard>
</ListingGrid>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-listing-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ListingCardActionsProps`

```typescript
interface ListingCardActionsProps {
  /** Action content — buttons, favorite toggle, etc. */
  children: ReactNode
  /** Layout — `'horizontal'` (default) fills width, `'stacked'` is vertical. */
  layout?: 'horizontal' | 'stacked'
  /** Extra classes. */
  className?: string
}
```

#### `ListingCardBodyProps`

```typescript
interface ListingCardBodyProps {
  /** Primary title / name. */
  title: ReactNode
  /** Secondary line (subtitle, location, category). */
  subtitle?: ReactNode
  /** Price / metric line. */
  price?: ReactNode
  /** Optional extras row (rating, availability, badges). */
  meta?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `ListingCardMediaProps`

```typescript
interface ListingCardMediaProps {
  /** Image URL or ReactNode. */
  src?: string
  alt?: string
  /** Override with a ReactNode (video, carousel, svg). */
  children?: ReactNode
  /** Aspect ratio (`'1/1' | '4/3' | '16/9' | '3/2'`), applied as an inline `aspect-ratio` style. Defaults to `'4/3'`. */
  aspect?: '1/1' | '4/3' | '16/9' | '3/2'
  /** Optional overlay node (badge, favorite heart). */
  overlay?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `ListingCardProps`

```typescript
interface ListingCardProps {
  /** Slots — usually `<ListingCardMedia>` + `<ListingCardBody>` + `<ListingCardActions>`. */
  children: ReactNode
  /**
   * Called on any click on the card — including clicks inside
   * `<ListingCardActions>`, which bubble into it unless the action handler
   * calls `e.stopPropagation()`.
   */
  onClick?: () => void
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `ListingGridProps`

```typescript
interface ListingGridProps {
  children: ReactNode
  /** Column count, fixed at every viewport width. Defaults to 3. */
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}
```

### Functions

#### `ListingCard(props)`

Product / property / listing card shell. Just a `<Card>` with vertical
stacking of its children — typically `<ListingCardMedia>` +
`<ListingCardBody>` + `<ListingCardActions>`.

Use for product tiles, property cards, course cards, listings,
and similar content-card layouts.

```typescript
function ListingCard({
  children,
  onClick,
  className,
  dataMolId,
}: ListingCardProps): JSX.Element
```

- `props` — Component props (see {@link ListingCardProps}).

#### `ListingCardActions(props)`

Bottom action row of a `<ListingCard>` (Add to cart, Save, etc.).

```typescript
function ListingCardActions({
  children,
  layout = 'horizontal',
  className,
}: ListingCardActionsProps): JSX.Element
```

- `props` — Component props (see {@link ListingCardActionsProps}).

#### `ListingCardBody(props)`

Body of a `<ListingCard>` — title / subtitle / price / meta rows stacked.

```typescript
function ListingCardBody({
  title,
  subtitle,
  price,
  meta,
  className,
}: ListingCardBodyProps): JSX.Element
```

- `props` — Component props (see {@link ListingCardBodyProps}).

#### `ListingCardMedia(props)`

Media slot at the top of a `<ListingCard>`. Locks aspect ratio via
inline style so apps get consistent card sizing without custom CSS.

```typescript
function ListingCardMedia({
  src,
  alt,
  children,
  aspect = '4/3',
  overlay,
  className,
}: ListingCardMediaProps): JSX.Element
```

- `props` — Component props (see {@link ListingCardMediaProps}).

#### `ListingGrid(props)`

Grid for `<ListingCard>`s — a fixed `columns`-column grid at every
viewport width. Alias for `CardGrid` tuned for listing layouts — same
shape, different semantic name so importers can self-document.

```typescript
function ListingGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: ListingGridProps): JSX.Element
```

- `props` — Component props (see {@link ListingGridProps}).

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

- `ListingCard.onClick` is attached to the WHOLE card — clicks on buttons inside
  `<ListingCardActions>` bubble into it. Call `e.stopPropagation()` in every
  action handler (as in the example) or the card navigation fires too.
- `<ListingGrid columns={n}>` renders a responsive n-column grid (via `cm.grid`):
  1 column on phones, stepping up to `n` at larger breakpoints, so listings
  don't overflow on mobile. Override `className` for a fixed grid.
- `overlay` children are rendered inside an absolutely-positioned inset-0 layer;
  give interactive overlays their own pointer handling and stopPropagation.
- Styling resolves through `getClassMap()`; the shell uses `<Card>` from
  `@molecule/app-ui-react` — wire a ClassMap bond first.
