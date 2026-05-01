# @molecule/app-muscle-group-badge-react

Anatomical muscle-group badge — small body-silhouette glyph with the
targeted muscle highlighted, plus a translated label. Used by
workout-tracker exercise-detail pages.

## Quick Start

```tsx
import { MuscleGroupBadge } from '@molecule/app-muscle-group-badge-react'

<MuscleGroupBadge group="chest" />
<MuscleGroupBadge group="quads" variant="compact" size="sm" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-muscle-group-badge-react
```

## API

### Interfaces

#### `MuscleGroupBadgeProps`

Props for {@link MuscleGroupBadge}.

```typescript
interface MuscleGroupBadgeProps {
  /** The muscle group represented by this badge. */
  group: MuscleGroup
  /** Override the auto-derived translated label. */
  label?: string
  /** Visual variant. */
  variant?: MuscleGroupBadgeVariant
  /** Display size. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional accent color override (CSS color). */
  accentColor?: string
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

### Types

#### `MuscleGroup`

Standard anatomical muscle groups recognized by the badge.

```typescript
type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'fullBody'
```

#### `MuscleGroupBadgeVariant`

Display variant.

```typescript
type MuscleGroupBadgeVariant = 'default' | 'compact'
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
