# @molecule/app-status-summary-react

Status-page summary.

Exports `<StatusSummary>`, `ComponentStatus`, `StatusComponent`, `StatusGroup` types.

## Quick Start

```tsx
import { StatusSummary } from '@molecule/app-status-summary-react'

<StatusSummary
  groups={[
    {
      id: 'api',
      name: 'API',
      components: [
        { id: 'rest', name: 'REST API', status: 'operational' },
        { id: 'ws', name: 'WebSockets', status: 'degraded' },
      ],
    },
  ]}
  header={<span>Last updated: 2 min ago</span>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-status-summary-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `StatusComponent`

A single monitored component with its current health status.

```typescript
interface StatusComponent {
  id: string
  name: ReactNode
  status: ComponentStatus
  /** Optional sub-label (SLA %, region, etc.). */
  subtitle?: ReactNode
}
```

#### `StatusGroup`

A named group of related StatusComponent entries.

```typescript
interface StatusGroup {
  id: string
  name: ReactNode
  components: StatusComponent[]
}
```

#### `StatusSummaryProps`

Props for the {@link StatusSummary} component.

```typescript
interface StatusSummaryProps {
  /** Grouped components. */
  groups: StatusGroup[]
  /** Overall summary label (auto-derived if omitted). */
  overallStatus?: ComponentStatus
  /** Optional header content (last updated time, subscribe button). */
  header?: ReactNode
  /** Optional below-the-grid slot — typically a recent-incidents list. */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Types

#### `ComponentStatus`

Union of possible component health states.

```typescript
type ComponentStatus =
  | 'operational'
  | 'degraded'
  | 'partial-outage'
  | 'major-outage'
  | 'maintenance'
```

### Functions

#### `StatusSummary(props)`

Status-page summary — grouped component list with colored badges and
an overall banner derived from the worst child status.

```typescript
function StatusSummary({
  groups,
  overallStatus,
  header,
  footer,
  className,
}: StatusSummaryProps): JSX.Element
```

- `props` — Component props (see {@link StatusSummaryProps}).

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

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- When `overallStatus` is omitted the banner shows the WORST status
  found across all components (major-outage > partial-outage >
  degraded > maintenance > operational).
- Status colors are a fixed hex palette applied via inline styles
  (green/yellow/orange/red/blue with white text) — they ignore the
  app theme and cannot be restyled via ClassMap; acceptable for
  status pages, but know they will not follow a rebrand.
- Status labels use `status.operational` … `status.maintenance` i18n
  keys with English fallbacks; no locale bond currently ships these
  keys, so register your own translations if the app is multilingual.
- `header` renders inside the overall banner (last-updated stamp,
  subscribe button); `footer` renders below the grid (incident list).
