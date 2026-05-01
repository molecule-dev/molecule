# @molecule/app-notification-feed-react

Vertical notification feed.

Exports `<NotificationFeed>` — a list of notification rows with typed
icon, title, body, relative time, and unread indicator. Optionally wraps
each row in a Link if the notification has an href.

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
