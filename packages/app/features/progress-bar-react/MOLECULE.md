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
npm install @molecule/app-progress-bar-react
```

## API

### Functions

#### `ProgressBar(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .value
- `root0` — .max
- `root0` — .label
- `root0` — .valueLabel
- `root0` — .size
- `root0` — .color
- `root0` — .className

#### `ProgressCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .description
- `root0` — .icon
- `root0` — .value
- `root0` — .max
- `root0` — .valueLabel
- `root0` — .color
- `root0` — .className
- `root0` — .children

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
