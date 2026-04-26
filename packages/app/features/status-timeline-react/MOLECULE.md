# @molecule/app-status-timeline-react

Vertical ordered-step status timeline. Each step renders as a colored dot + label; steps at or before the current step are "reached" (filled dot), the current step's label is bolded, later steps are dimmed.

Generic for any multi-stage workflow: order tracking, deployment pipelines, onboarding, kanban progressions.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-status-timeline-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Exports

```ts
export interface StatusTimelineStep {
  key: string
  label: string
}

export interface StatusTimelineProps {
  steps: ReadonlyArray<StatusTimelineStep>
  currentKey: string
  ariaLabel?: string
  className?: string
  dataMolId?: string
}

export function StatusTimeline(props: StatusTimelineProps): JSX.Element
```

### Usage

```tsx
import { useTranslation } from '@molecule/app-react'
import { StatusTimeline } from '@molecule/app-status-timeline-react'

const STATUS_ORDER = ['placed', 'shopping', 'packed', 'on_the_way', 'delivered'] as const
const DEFAULTS = {
  placed: 'Order placed',
  shopping: 'Shopper picking items',
  packed: 'Packed',
  on_the_way: 'On the way',
  delivered: 'Delivered',
}

export function OrderStatus({ status }: { status: typeof STATUS_ORDER[number] }) {
  const { t } = useTranslation()
  return (
    <StatusTimeline
      currentKey={status}
      steps={STATUS_ORDER.map(key => ({
        key,
        label: t(`orderTracking.status.${key}`, {}, { defaultValue: DEFAULTS[key] }),
      }))}
    />
  )
}
```
