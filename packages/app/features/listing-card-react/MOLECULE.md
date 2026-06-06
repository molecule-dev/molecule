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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
