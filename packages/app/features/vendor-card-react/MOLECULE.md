# @molecule/app-vendor-card-react

Vendor / seller / agent profile card.

Exports `<VendorCard>` — Avatar/logo + name + tagline + rating/review
count + member-since + badges + actions row, on the shared `<Card>`.

## Quick Start

```tsx
import { VendorCard } from '@molecule/app-vendor-card-react'
import { Button } from '@molecule/app-ui-react'

<VendorCard
  name="Acme Supplies"
  logoSrc="/logos/acme.png"
  description="Industrial parts, fast shipping"
  rating={4.7}
  reviewCount={312}
  memberSince="Jan 2021"
  actions={<Button size="sm" onClick={() => console.log('follow')}>Follow</Button>}
  onClick={() => console.log('open vendor page')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-vendor-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `VendorCardProps`

Props for the {@link VendorCard} component.

```typescript
interface VendorCardProps {
  /** Vendor / seller display name. */
  name: ReactNode
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner. */
  description?: ReactNode
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display. */
  memberSince?: ReactNode
  /** Optional badges row (Verified, Top seller, etc.). */
  badges?: ReactNode
  /** Right-side actions (Follow, Message, Visit shop). */
  actions?: ReactNode
  /** Optional click handler on the body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `VendorCard(props)`

Vendor / seller / agent profile card. Used in marketplaces, agent
directories, multi-tenant catalogs.

```typescript
function VendorCard({
  name,
  logoSrc,
  description,
  rating,
  reviewCount,
  memberSince,
  badges,
  actions,
  onClick,
  className,
}: VendorCardProps): JSX.Element
```

- `props` — Component props (see {@link VendorCardProps}).

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

Composes `<Card>` + `<Avatar>` from `@molecule/app-ui-react`. `onClick`
makes the whole card clickable but adds no keyboard handler or role —
put primary navigation in `actions` buttons for accessibility. `rating`
renders a single ★ plus the number (`toFixed(1)`), not a five-star row;
`reviewCount` renders only when `rating` is also set. When `name` is not
a plain string the Avatar alt falls back to hardcoded 'Vendor'. All text
slots (description, memberSince, badges, actions) are pre-translated
ReactNodes — no locale bond. Props (documented on the exported
`VendorCardProps` interface): name, logoSrc, description, rating,
reviewCount, memberSince, badges, actions, onClick, className.
