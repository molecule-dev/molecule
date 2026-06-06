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
npm install @molecule/app-relative-time-react
```

## API

### Functions

#### `formatRelativeTime(input, now, locale)`

```typescript
function formatRelativeTime(input: string | number | Date, now?: number | Date, locale?: string): string
```

- `input` — *
- `now` — *

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
