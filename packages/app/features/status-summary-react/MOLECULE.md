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
npm install @molecule/app-status-summary-react
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

#### `StatusSummary(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .groups
- `root0` — .overallStatus
- `root0` — .header
- `root0` — .footer
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
