# @molecule/app-loyalty-tier-badge-react

Bronze/Silver/Gold/Platinum loyalty tier badge with optional progress
bar to the next tier. Used by hotel-booking, online-store, and
travel-booking flagship loyalty programs.

## Quick Start

```tsx
import { LoyaltyTierBadge } from '@molecule/app-loyalty-tier-badge-react'

<LoyaltyTierBadge tier="gold" points={42_000} nextTierThreshold={75_000} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-loyalty-tier-badge-react
```

## API

### Interfaces

#### `LoyaltyTierBadgeProps`

Props for {@link LoyaltyTierBadge}.

```typescript
interface LoyaltyTierBadgeProps {
  /** Current tier. */
  tier: LoyaltyTier
  /**
   * Member's current points / nights / qualifying activity in the tier
   * unit. Optional; when present and `nextTierThreshold` is also given the
   * badge renders a progress bar and "X to next tier" readout.
   */
  points?: number
  /**
   * Threshold (in the same unit as `points`) at which the next tier is
   * earned. Combined with `points` to compute progress.
   */
  nextTierThreshold?: number
  /** Override the auto-derived next-tier label (e.g. "Diamond"). */
  nextTierLabel?: string
  /** Override the displayed tier label (defaults to translated tier name). */
  tierLabel?: string
  /** Display size. */
  size?: 'sm' | 'md' | 'lg'
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

### Types

#### `LoyaltyTier`

Standard loyalty tier rungs.

```typescript
type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'
```

### Functions

#### `computeProgress(points, threshold)`

Compute progress (0–1) toward the next tier given current points + threshold.

```typescript
function computeProgress(points?: number, threshold?: number): number
```

- `points` — Current points balance.
- `threshold` — Points needed to reach the next tier.

**Returns:** Clamped 0–1 progress ratio.

#### `LoyaltyTierBadge(props)`

Loyalty tier badge — renders a colored glyph + tier label + (optional)
"X / Y to next tier" progress bar. Used by hotel-booking, online-store,
and travel-booking flagship loyalty programs.

Tier glyph colors fall back to standard metallic accents when no theme
tokens are wired; pass `tierLabel` / `nextTierLabel` to override the
translated defaults for branded programs (e.g. "Member" / "Elite").

```typescript
function LoyaltyTierBadge({
  tier,
  points,
  nextTierThreshold,
  nextTierLabel,
  tierLabel,
  size = 'md',
  dataMolId,
  className,
}: LoyaltyTierBadgeProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The rendered tier badge.

#### `nextTierOf(tier)`

Resolve the next tier name (lowercase) given the current tier. Returns
`null` when the member is already at the highest tier.

```typescript
function nextTierOf(tier: LoyaltyTier): LoyaltyTier | null
```

- `tier` — Current tier.

**Returns:** The next-tier name or `null` if at the top.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
