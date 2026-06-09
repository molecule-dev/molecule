# @molecule/app-log-viewer-react

Structured log-row viewer.

Exports `<LogViewer>` and `LogEntry` / `LogLevel` types.

## Quick Start

```tsx
import { LogViewer } from '@molecule/app-log-viewer-react'
import type { LogEntry } from '@molecule/app-log-viewer-react'

const entries: LogEntry[] = [
  { id: '1', timestamp: '12:00:01', level: 'info', message: 'Server started', service: 'api' },
  { id: '2', timestamp: '12:00:05', level: 'error', message: 'DB connect failed', service: 'db', data: { code: 'ECONNREFUSED' } },
]

<LogViewer entries={entries} onToggle={(id, open) => console.log(id, open)} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-log-viewer-react
```

## API

### Interfaces

#### `LogEntry`

Shape of a single structured log entry rendered by LogViewer.

```typescript
interface LogEntry {
  id: string
  /** ISO timestamp or formatted string. */
  timestamp: ReactNode
  /** Severity level. */
  level: LogLevel
  /** Single-line message. */
  message: ReactNode
  /** Optional service / component label (e.g. "auth-api"). */
  service?: ReactNode
  /** Optional trace id / request id. */
  traceId?: ReactNode
  /** Optional structured data shown in the expandable panel. */
  data?: unknown
}
```

### Types

#### `LogLevel`

Severity level of a log entry, ordered from lowest to highest.

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

### Functions

#### `LogViewer(root0, root0, root0, root0, root0)`

Structured log list — one `<details>` per entry with timestamp +
level badge + service label + single-line message, expanding to
show trace id + JSON-formatted structured data.

Use for operational tooling, admin dashboards, debug views.

```typescript
function LogViewer({
  entries,
  onToggle,
  className,
  emptyState,
}: LogViewerProps): JSX.Element
```

- `root0` — *
- `root0` — .entries
- `root0` — .onToggle
- `root0` — .className
- `root0` — .emptyState

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
