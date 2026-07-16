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
npm install @molecule/app-audit-log-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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
  /** Pre-formatted display timestamp (rendered verbatim — format before passing, e.g. "2 min ago"). */
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

#### `AuditLogRowProps`

```typescript
interface AuditLogRowProps {
  entry: AuditLogEntry
  /** Called when the row is clicked. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `AuditLogRow(props)`

One row of an audit / activity / event log. Shape:
`[actor] [action] [target] · [timestamp]` with optional
`[old → new]` diff line and environment/trace metadata.

```typescript
function AuditLogRow({ entry, onClick, className }: AuditLogRowProps): JSX.Element
```

- `props` — Component props (see {@link AuditLogRowProps}).

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
