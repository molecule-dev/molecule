# @molecule/app-feature-flag-row-react

Feature-flag list row — flag name + type badge + key + description on
the left, one labelled `<Switch>` per environment (with a rollout-%
readout for percentage flags) on the right. Stack rows inside a list
or table to build a flags dashboard.

Exports `<FeatureFlagRow>` and the `FeatureFlag`,
`FeatureFlagEnvironment`, and `FlagType` types.

## Quick Start

```tsx
import { FeatureFlagRow } from '@molecule/app-feature-flag-row-react'

function FlagsList() {
  return (
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
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-flag-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `FeatureFlagRowProps`

```typescript
interface FeatureFlagRowProps {
  flag: FeatureFlag
  /** Called when an environment toggles. */
  onToggle: (flagKey: string, envId: string, next: boolean) => void
  /** Extra classes. */
  className?: string
}
```

### Types

#### `FlagType`

Discriminant for the kind of feature flag (boolean, multivariate, percentage rollout, or string variant).

```typescript
type FlagType = 'boolean' | 'multivariate' | 'percentage' | 'string'
```

### Functions

#### `FeatureFlagRow(props)`

Feature-flag list row with per-environment toggle + rollout-percentage
display. Use inside a grid or table to build a flags dashboard.

```typescript
function FeatureFlagRow({ flag, onToggle, className }: FeatureFlagRowProps): JSX.Element
```

- `props` — Component props (see {@link FeatureFlagRowProps}).

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

The environment toggle is the `<Switch>` from the
`@molecule/app-ui-react` peer dependency — that package must be
installed and its ClassMap bond wired for the row to render styled.

`rolloutPct` is displayed only when `flag.type === 'percentage'`; on
other flag types the field is ignored. The row is presentation-only:
`onToggle` receives `(flagKey, envId, next)` and the caller persists
the change and re-renders with updated `flag` data.

The type badge translates via `t('flagType.<type>')` with the raw
type string as the English fallback (no locale bond currently ships
`flagType.*` keys — add them to your app's locale resources for
non-English UIs).
