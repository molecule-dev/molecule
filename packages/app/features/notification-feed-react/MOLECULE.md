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

### Interfaces

#### `FeedItem`

A single item rendered inside a NotificationFeed list.

```typescript
interface FeedItem {
  /** Stable identifier (used as React key). */
  id: string
  /** Material symbol icon name (e.g. `'check_circle'`, `'chat'`). */
  icon: string
  /** Bolded headline string. */
  title: string
  /** Secondary body string. */
  body: string
  /** ISO timestamp shown as relative time on the right. */
  createdAt: string
  /** Optional route — when set, wraps the row in `<Link>`. */
  href?: string | null
  /** When true, the row gets a left primary-accent border. */
  unread?: boolean
}
```

#### `NotificationFeedProps`

Props for the NotificationFeed component.

```typescript
interface NotificationFeedProps {
  /** Items to render, top to bottom. */
  items: ReadonlyArray<FeedItem>
  /** Aria-label for the underlying `<ul>`. */
  ariaLabel?: string
  /** Extra classes on the outer `<ul>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

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

#### `NotificationFeed(root0, root0, root0, root0, root0)`

Vertical notification feed: typed icon + title + body + relative time
with optional unread border-l accent and optional per-row Link.

Apps build their own typed-icon mapping (notif.type → icon name) and
pass the resolved icon string in. Keeps this package free of per-app
type unions.

```typescript
function NotificationFeed({
  items,
  ariaLabel,
  className,
  dataMolId,
}: NotificationFeedProps): JSX.Element
```

- `root0` — *
- `root0` — .items
- `root0` — .ariaLabel
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The feed renders real notifications with icon, title, body, and a
  relative time — no `undefined` fields or raw timestamps.
- [ ] Unread rows are visibly distinct, and any unread badge/count matches
  the number of unread rows.
- [ ] Clicking a notification that carries an href navigates to its target.
- [ ] Marking as read (however this app wires it) clears the unread state
  and it stays cleared after a full reload.
- [ ] Performing an action the app notifies about adds a new notification to
  the feed (newest first).
- [ ] An empty feed shows a readable empty state — not a blank panel.
