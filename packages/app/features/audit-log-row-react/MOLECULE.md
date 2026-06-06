# @molecule/app-audit-log-row-react

Audit / activity / event-log row.

Exports `<AuditLogRow>` and `AuditLogEntry` type.

## Quick Start

```tsx
import { AuditLogRow } from '@molecule/app-audit-log-row-react'

<AuditLogRow
  entry={{
    id: 'evt-001',
    actor: 'alice@example.com',
    action: 'updated',
    target: 'Invoice #1042',
    timestamp: '2 min ago',
    oldValue: 'Draft',
    newValue: 'Sent',
  }}
  onClick={() => openDetail('evt-001')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-audit-log-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
