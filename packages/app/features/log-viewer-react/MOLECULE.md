# @molecule/app-log-viewer-react

Structured log-row viewer.

Exports `<LogViewer>` plus the `LogEntry` / `LogLevel` types. Renders one
expandable `<details>` row per entry: timestamp + colored severity badge +
service label + single-line message, expanding to a JSON-formatted
structured-data panel. Props: `entries`, `onToggle?(id, expanded)`,
`emptyState?`, `className?`.

Use for operational tooling, admin dashboards, debug views.

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
npm install @molecule/app-log-viewer-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `LogViewerProps`

```typescript
interface LogViewerProps {
  entries: LogEntry[]
  /** Called when an entry expands/collapses. */
  onToggle?: (id: string, expanded: boolean) => void
  /** Extra classes on the list wrapper. */
  className?: string
  /** Empty-state content. */
  emptyState?: ReactNode
}
```

### Types

#### `LogLevel`

Severity level of a log entry, ordered from lowest to highest.

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

### Functions

#### `LogViewer(props)`

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

- `props` — Component props (see {@link LogViewerProps}).

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

- Expansion state is internal; `onToggle` is notification-only — there is no
  controlled expanded-ids prop.
- The timestamp column is a fixed 48px box: pass short pre-formatted times
  (e.g. `HH:mm:ss`), not full ISO strings, or they overflow.
- Severity badges use a fixed hex palette with white text (trace grey → fatal
  dark red) that does not follow the app theme; the level name renders raw and
  uppercased (not localized).
- `data` is pretty-printed with `JSON.stringify(…, null, 2)`; strings render
  verbatim. Large payloads scroll horizontally inside the panel.
