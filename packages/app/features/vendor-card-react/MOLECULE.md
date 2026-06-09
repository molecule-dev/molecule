# @molecule/app-vendor-card-react

Vendor / seller / agent profile card.

Exports `<VendorCard>`.

## Quick Start

```tsx
import { VendorCard } from '@molecule/app-vendor-card-react'

<VendorCard
  name="Acme Supplies"
  logoSrc="/logos/acme.png"
  description="Industrial parts, fast shipping"
  rating={4.7}
  reviewCount={312}
  memberSince="Jan 2021"
  actions={<button onClick={handleFollow}>Follow</button>}
  onClick={() => navigate('/vendors/acme')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-vendor-card-react
```

## API

### Functions

#### `VendorCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .name
- `root0` — .logoSrc
- `root0` — .description
- `root0` — .rating
- `root0` — .reviewCount
- `root0` — .memberSince
- `root0` — .badges
- `root0` — .actions
- `root0` — .onClick
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
