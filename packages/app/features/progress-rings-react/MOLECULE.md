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
npm install @molecule/app-progress-rings-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ProgressRing`

Single ring entry — value/max plus the colored accent and an optional label.

```typescript
interface ProgressRing {
  /** Current progress value. Clamped against `max` at render time. */
  value: number
  /** Maximum / goal value. Must be > 0; values <= 0 fall back to 1. */
  max: number
  /**
   * SVG stroke color for this ring. Pass a CSS color (token-resolved by the
   * caller against the active theme) — the component never hardcodes color.
   */
  color: string
  /** Optional accessible label for this ring (e.g. "Steps", "Sleep"). */
  label?: string
}
```

#### `ProgressRingsProps`

Props for `<ProgressRings>` — the unified single + concentric-triad component.

```typescript
interface ProgressRingsProps {
  /** One or more rings. 1 ring = single circle; 2+ = concentric Apple-Health-style stack. */
  rings: ProgressRing[]
  /** Outer SVG diameter in px. Defaults to 160. */
  size?: number
  /** Stroke thickness for each ring in px. Defaults to 12. */
  strokeWidth?: number
  /** Gap between concentric rings in px (ignored when only one ring). Defaults to 4. */
  gap?: number
  /**
   * Stroke linecap rounding. `'round'` produces the iOS-Health pill caps;
   * `'butt'` is flat. Defaults to `'round'`.
   */
  cornerRadius?: 'round' | 'butt'
  /** Override the outer wrapper classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Optional aria-label for the whole graphic. Falls back to translated summary. */
  ariaLabel?: string
}
```

### Functions

#### `ProgressRings(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Apple-Health-style concentric SVG progress rings. Renders a single circular
ring when `rings.length === 1`, or a nested stack of rings (outermost first)
for 2+ entries. Pure SVG — no canvas, no chart-library dep. Layout and
typography resolve via the wired ClassMap; ring colors come from props
(typically resolved from theme tokens by the caller).

```typescript
function ProgressRings({
  rings,
  size = 160,
  strokeWidth = 12,
  gap = 4,
  cornerRadius = 'round',
  className,
  dataMolId,
  ariaLabel,
}: ProgressRingsProps): JSX.Element
```

- `root0` — *
- `root0` — .rings
- `root0` — .size
- `root0` — .strokeWidth
- `root0` — .gap
- `root0` — .cornerRadius
- `root0` — .className
- `root0` — .dataMolId
- `root0` — .ariaLabel

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-progress-rings`.
