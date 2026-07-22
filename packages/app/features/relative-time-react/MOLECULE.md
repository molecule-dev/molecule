# @molecule/app-relative-time-react

React relative-time formatting.

Exports:
- `formatRelativeTime(date, now?, locale?)` — utility using Intl.RelativeTimeFormat.
- `<RelativeTime>` — live-updating component ("5 minutes ago").

## Quick Start

```tsx
import { RelativeTime, formatRelativeTime } from '@molecule/app-relative-time-react'

// Component — auto-refreshes every minute
<RelativeTime date="2024-06-01T10:00:00Z" titleLocale="en-US" />

// Utility — one-shot formatting
const label = formatRelativeTime('2024-06-01T10:00:00Z', Date.now(), 'en-US')
// → "5 minutes ago"
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-relative-time-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `RelativeTimeProps`

Props accepted by the {@link RelativeTime} component.

```typescript
interface RelativeTimeProps {
  /** ISO string, Date, or epoch ms. */
  date: Date | string | number
  /** Locale override. */
  locale?: string
  /** Auto-refresh interval (ms). Defaults to 60_000 (1 min). Set 0 to disable. */
  refreshMs?: number
  /** When provided, renders the absolute date in a `title` attribute for hover tooltip. */
  titleLocale?: string
  /** Extra classes (applies to the surrounding `<time>` element). */
  className?: string
}
```

### Functions

#### `formatRelativeTime(input, now, locale)`

Formats a date, timestamp, or epoch number as a human-readable relative time
string (e.g. "5 minutes ago", "in 3 days") using {@link Intl.RelativeTimeFormat}.

```typescript
function formatRelativeTime(input: string | number | Date, now?: number | Date, locale?: string): string
```

#### `RelativeTime(props)`

Live-updating relative time display ("5 minutes ago"). Re-computes on
a timer so the text stays accurate as the user leaves the page open.

Pass `refreshMs={0}` for a one-shot render (cheaper in long lists;
the parent can provide a single ticker).

```typescript
function RelativeTime({
  date,
  locale,
  refreshMs = 60_000,
  titleLocale,
  className,
}: RelativeTimeProps): React.JSX.Element
```

- `props` — Component props (see {@link RelativeTimeProps}).

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

- Zero molecule wiring required — no ClassMap, no i18n provider, no bonds;
  safe in any React tree.
- `<RelativeTime>` props: `date` (Date | ISO string | epoch ms), `locale?`,
  `refreshMs?` (default 60000 — pass `0` to disable the per-instance timer,
  cheaper in long lists), `titleLocale?` (adds an absolute-date `title`
  tooltip), `className?`.
- `locale` defaults to the runtime's locale, NOT your app's i18n locale —
  pass the active locale explicitly for consistent localized output.
- When `Intl.RelativeTimeFormat` is unavailable, fallback strings
  ("just now", "5m ago") are English-only.
