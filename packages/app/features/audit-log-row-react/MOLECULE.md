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

## API

### Interfaces

#### `AuditLogEntry`

Shape of a single audit / activity log entry displayed by AuditLogRow.

```typescript
interface AuditLogEntry {
  id: string
  /** Actor name or id. */
  actor: ReactNode
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: ReactNode
  /** Target object / record. */
  target?: ReactNode
  /** ISO timestamp. */
  timestamp: ReactNode
  /** Optional summary field for delta display — old + new values. */
  oldValue?: ReactNode
  newValue?: ReactNode
  /** Environment / source badge. */
  environment?: ReactNode
  /** Optional trace or correlation id. */
  traceId?: ReactNode
}
```

### Functions

#### `AuditLogRow(root0, root0, root0, root0)`

One row of an audit / activity / event log. Shape:
`[actor] [action] [target] · [timestamp]` with optional
`[old → new]` diff line and environment/trace metadata.

```typescript
function AuditLogRow({ entry, onClick, className }: AuditLogRowProps): JSX.Element
```

- `root0` — *
- `root0` — .entry
- `root0` — .onClick
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
