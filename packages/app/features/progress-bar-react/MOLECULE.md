# @molecule/app-progress-bar-react

React labeled progress bar and progress-card wrapper.

Exports:
- `<ProgressBar>` — standalone bar with optional label + value display.
- `<ProgressCard>` — `<Card>`-wrapped progress display (title, icon,
  description, bar, optional extras slot).

## Quick Start

```tsx
import { ProgressBar, ProgressCard } from '@molecule/app-progress-bar-react'

<ProgressBar value={65} label="Upload progress" valueLabel="65%" color="primary" />

<ProgressCard
  title="Storage used"
  description="8.5 GB of 10 GB"
  value={85}
  valueLabel="85%"
  color="warning"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-progress-bar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ProgressBarProps`

Props for {@link ProgressBar}.

```typescript
interface ProgressBarProps {
  /** Current numeric value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Optional label rendered above the track. */
  label?: ReactNode
  /** Optional value display rendered on the right of the label row. */
  valueLabel?: ReactNode
  /** Size preset — maps to ClassMap `progressHeight`. */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor`. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

#### `ProgressCardProps`

Props for {@link ProgressCard}.

```typescript
interface ProgressCardProps {
  title: ReactNode
  /** Optional supporting description below the title. */
  description?: ReactNode
  /** Optional icon shown in the card header. */
  icon?: ReactNode
  /** Current value. */
  value: number
  /** Maximum (defaults to 100). */
  max?: number
  /** Value display on the right of the header (e.g. "73%"). */
  valueLabel?: ReactNode
  /** ProgressBar color. */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string
  /** Additional content rendered below the bar. */
  children?: ReactNode
}
```

### Functions

#### `ProgressBar(props)`

Labeled progress bar with optional value display.

Renders a `[label ... valueLabel]` header row above a track. The track
itself uses the wired ClassMap progress tokens — swap the ClassMap bond
to restyle without touching this component.

```typescript
function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  size = 'md',
  color = 'primary',
  className,
}: ProgressBarProps): JSX.Element
```

- `props` — Component props (see {@link ProgressBarProps}).

#### `ProgressCard(props)`

`<Card>`-wrapped progress display with title, optional icon and description,
the progress bar itself, and an optional extras slot below. Useful for
budget/goal cards, storage-used panels, onboarding progress, etc.

```typescript
function ProgressCard({
  title,
  description,
  icon,
  value,
  max = 100,
  valueLabel,
  color = 'primary',
  className,
  children,
}: ProgressCardProps): JSX.Element
```

- `props` — Component props (see {@link ProgressCardProps}).

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

All text (`label`, `valueLabel`, `title`, `description`) is pass-through —
supply already-translated strings; the package renders no text of its own.
Requires a wired ClassMap bond: the track/fill styles come from the
`progress*` ClassMap tokens, so colors follow the active theme.
