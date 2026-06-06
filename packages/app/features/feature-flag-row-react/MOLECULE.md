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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
