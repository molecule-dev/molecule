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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
