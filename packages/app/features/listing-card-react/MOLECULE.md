# @molecule/app-listing-card-react

React product / property / listing card primitives.

Exports:
- `<ListingCard>` — outer shell (Card wrapper with click handler).
- `<ListingCardMedia>` — top-of-card image slot with fixed aspect ratio + overlay.
- `<ListingCardBody>` — title / subtitle / price / meta rows.
- `<ListingCardActions>` — bottom action row (horizontal or stacked).
- `<ListingGrid>` — responsive grid for listing cards.

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
npm install @molecule/app-listing-card-react
```

## API

### Functions

#### `ListingCard(root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .children
- `root0` — .onClick
- `root0` — .className
- `root0` — .dataMolId

#### `ListingCardActions(root0, root0, root0, root0)`

Bottom action row of a `<ListingCard>` (Add to cart, Save, etc.).

```typescript
function ListingCardActions({
  children,
  layout = 'horizontal',
  className,
}: ListingCardActionsProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .layout
- `root0` — .className

#### `ListingCardBody(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .subtitle
- `root0` — .price
- `root0` — .meta
- `root0` — .className

#### `ListingCardMedia(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .src
- `root0` — .alt
- `root0` — .children
- `root0` — .aspect
- `root0` — .overlay
- `root0` — .className

#### `ListingGrid(root0, root0, root0, root0, root0)`

Responsive grid for `<ListingCard>`s. Alias for `CardGrid` tuned for
listing layouts — same shape, different semantic name so importers
can self-document.

```typescript
function ListingGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: ListingGridProps): JSX.Element
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
