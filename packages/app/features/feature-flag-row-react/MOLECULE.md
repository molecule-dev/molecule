# @molecule/app-feature-flag-row-react

Feature-flag list row.

Exports `<FeatureFlagRow>`, `FeatureFlag`, `FeatureFlagEnvironment`, `FlagType` types.

## Quick Start

```tsx
import { FeatureFlagRow } from '@molecule/app-feature-flag-row-react'

<FeatureFlagRow
  flag={{
    key: 'new-checkout',
    name: 'New Checkout Flow',
    description: 'Redesigned multi-step checkout experience.',
    type: 'percentage',
    environments: [
      { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
      { id: 'production', label: 'Production', enabled: true, rolloutPct: 20 },
    ],
  }}
  onToggle={(key, envId, next) => updateFlag(key, envId, next)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-flag-row-react
```

## API

### Interfaces

#### `FeatureFlag`

Complete definition of a feature flag including its key, display name, type, and per-environment configuration.

```typescript
interface FeatureFlag {
  key: string
  name: ReactNode
  description?: ReactNode
  type: FlagType
  environments: FeatureFlagEnvironment[]
}
```

#### `FeatureFlagEnvironment`

Per-environment state for a feature flag, including enabled status and optional rollout percentage.

```typescript
interface FeatureFlagEnvironment {
  /** Environment id (e.g. "production", "staging"). */
  id: string
  /** Display label. */
  label: ReactNode
  /** Enabled in this env. */
  enabled: boolean
  /** Rollout percentage 0-100. Optional — render when `type='percentage'`. */
  rolloutPct?: number
}
```

### Types

#### `FlagType`

Discriminant for the kind of feature flag (boolean, multivariate, percentage rollout, or string variant).

```typescript
type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'string'
```

### Functions

#### `FeatureFlagRow(root0, root0, root0, root0)`

Feature-flag list row with per-environment toggle + rollout-percentage
display. Use inside a grid or table to build a flags dashboard.

```typescript
function FeatureFlagRow({ flag, onToggle, className }: FeatureFlagRowProps): JSX.Element
```

- `root0` — *
- `root0` — .flag
- `root0` — .onToggle
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
