# @molecule/app-progress-rings-react

Apple-Health-style concentric SVG progress rings — single + triad.

Exports `<ProgressRings>` for one or more rings rendered as a single SVG.
Designed to replace the per-app duplicates in healthcare flagships
(`HealthSummaryTriad`, `WellnessRingsTriad`, `RecoveryRingsTriad`,
`AdherenceTriad`) and the single-ring usage in business apps
(employee-onboarding, okr-goal-tracking).

## Quick Start

```tsx
import { ProgressRings } from '@molecule/app-progress-rings-react'

<ProgressRings
  rings={[
    { value: 8200, max: 10000, color: 'var(--color-success)', label: 'Steps' },
    { value: 7, max: 8, color: 'var(--color-info)', label: 'Sleep (hrs)' },
    { value: 35, max: 60, color: 'var(--color-warning)', label: 'Active (min)' },
  ]}
  size={160}
  strokeWidth={12}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-progress-rings-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-progress-rings`.
