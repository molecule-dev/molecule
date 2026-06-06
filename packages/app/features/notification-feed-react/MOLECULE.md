# @molecule/app-notification-feed-react

Vertical notification feed.

Exports `<NotificationFeed>` — a list of notification rows with typed
icon, title, body, relative time, and unread indicator. Optionally wraps
each row in a Link if the notification has an href.

## Quick Start

```tsx
import { NotificationFeed } from '@molecule/app-notification-feed-react'

const items = [
  { id: '1', icon: 'check_circle', title: 'Build succeeded', body: 'main branch deployed to prod', createdAt: '2024-06-01T09:00:00Z', unread: true, href: '/deployments/42' },
  { id: '2', icon: 'chat', title: 'New comment', body: 'Alice left a comment on PR #17', createdAt: '2024-06-01T08:30:00Z' },
]

<NotificationFeed items={items} ariaLabel="Notifications" dataMolId="notification-feed" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notification-feed-react
```

## API

### Functions

#### `fmtRelativeShort(iso)`

Render an ISO timestamp as a short relative string: "12m", "3h", "5d".

Used by NotificationFeed to keep the timestamp tight enough to fit the
top-right corner of a feed row.

```typescript
function fmtRelativeShort(iso: string): string
```

- `iso` — ISO 8601 timestamp string

**Returns:** short relative string (e.g. "12m", "3h", "5d")

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
