# @molecule/app-notification-feed-react

Vertical notification feed: typed icon + title + body + relative time + unread indicator, with optional per-row link wrapping.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notification-feed-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Exports

```ts
export interface FeedItem {
  id: string
  icon: string         // material symbol name
  title: string
  body: string
  createdAt: string    // ISO 8601
  href?: string | null
  unread?: boolean
}

export interface NotificationFeedProps {
  items: ReadonlyArray<FeedItem>
  ariaLabel?: string
  className?: string
  dataMolId?: string
}

export function NotificationFeed(props: NotificationFeedProps): JSX.Element
export function fmtRelativeShort(iso: string): string  // "12m", "3h", "5d"
```

### Usage

Apps build their own type→icon mapping and pass resolved strings in — keeps this package free of per-app type unions.

```tsx
import { NotificationFeed, type FeedItem } from '@molecule/app-notification-feed-react'

const TYPE_ICON = {
  order_status: 'receipt_long',
  driver_message: 'chat',
  promo: 'local_offer',
}

export function NotificationsPage() {
  const { t } = useTranslation()
  const notifs = useFetchedNotifs()

  const items: FeedItem[] = notifs.map(n => ({
    id: n.id,
    icon: TYPE_ICON[n.type],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    href: n.href,
    unread: n.unread,
  }))

  return <NotificationFeed items={items} ariaLabel={t('notifications.feedLabel', {}, { defaultValue: 'Notifications' })} />
}
```
