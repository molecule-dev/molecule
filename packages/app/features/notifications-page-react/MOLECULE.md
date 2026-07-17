# @molecule/app-notifications-page-react

Drop-in `/notifications` page for molecule-built apps.

Exports `<NotificationsPage>` — a full-page Notifications view that
composes `@molecule/app-notification-feed-react` and wires it to the
routes exposed by `@molecule/api-resource-notification` over the
HTTP bond. Header, filter chips (all / unread / mentions), pagination,
mark-all-read action, and empty state are all handled internally.

## Quick Start

```tsx
import { NotificationsPage } from '@molecule/app-notifications-page-react'

export function NotificationsRoute() {
  return <NotificationsPage pageSize={25} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notifications-page-react @molecule/app-i18n @molecule/app-notification-feed-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `NotificationsPageItem`

A single notification record as returned by `GET /notifications`
from `@molecule/api-resource-notification`.

Mirrors the core `Notification` shape from
`@molecule/api-notification-center` minus implementation-specific
fields (Date is serialised to string ISO across the wire).

```typescript
interface NotificationsPageItem {
  /** Provider-assigned notification identifier. */
  id: string
  /** Notification category (`system`, `message`, `mention`, etc.). */
  type: string
  /** Notification headline. */
  title: string
  /** Notification body text. */
  body: string
  /** Whether the notification has been read. */
  read: boolean
  /** ISO 8601 timestamp the notification was created at. */
  createdAt: string
  /**
   * Optional structured payload attached by the producer.
   *
   * The page component reads `data.href` (string) when present and
   * forwards it to the underlying feed row so the row becomes a link.
   */
  data?: Record<string, unknown>
}
```

#### `NotificationsPageProps`

Props for `<NotificationsPage>`.

```typescript
interface NotificationsPageProps {
  /** Items per page. Defaults to `20`. */
  pageSize?: number
  /**
   * Override the URL that is fetched for the notifications list.
   * Defaults to `/api/notifications`.
   *
   * Useful when the API is mounted at a non-standard prefix.
   */
  endpoint?: string
  /**
   * Override the URL hit by the "Mark all as read" action.
   * Defaults to `/api/notifications/read-all`.
   */
  markAllReadEndpoint?: string
  /**
   * Optional `type → icon` overrides. Merged on top of the default map.
   */
  typeIcons?: NotificationsPageTypeIconMap
  /** Extra classes appended to the outer page wrapper. */
  className?: string
  /** `data-mol-id` selector for AI-agent interaction. */
  dataMolId?: string
}
```

#### `NotificationsPageResult`

Paginated response shape returned by `GET /notifications`.

```typescript
interface NotificationsPageResult {
  /** The notifications on the current page. */
  items: NotificationsPageItem[]
  /** Total number of matching notifications across all pages. */
  total: number
  /** Number of items skipped before this page. */
  offset: number
  /** Maximum number of items per page. */
  limit: number
}
```

### Types

#### `NotificationsPageFilter`

Filter chips shown above the notification list.

- `'all'` shows every notification (read + unread, every type).
- `'unread'` keeps only `read === false`.
- `'mentions'` keeps only `type === 'mention'`.

```typescript
type NotificationsPageFilter = 'all' | 'unread' | 'mentions'
```

#### `NotificationsPageTypeIconMap`

Maps `Notification.type` values to material-symbol icon names so the
underlying `<NotificationFeed>` can render the right glyph.

Defaults are provided for the most common types; consumers can extend
or replace the map by passing the `typeIcons` prop.

```typescript
type NotificationsPageTypeIconMap = Readonly<Record<string, string>>
```

### Functions

#### `NotificationsPage(props)`

Drop-in `/notifications` page used by every flagship app.

Composes `<NotificationFeed>` with a header (eyebrow + title +
mark-all-read action), a row of filter chips (all / unread / mentions),
a paginated body, and an empty state. All data is loaded over the HTTP
bond by hitting the routes exposed by `@molecule/api-resource-notification`.

All UI text flows through `t()` so apps can localise via the companion
locale bond `@molecule/app-locales-notifications-page`. All
styling flows through `getClassMap()` — no Tailwind class strings live
here.

```typescript
function NotificationsPage({
  pageSize = DEFAULT_PAGE_SIZE,
  endpoint = DEFAULT_ENDPOINT,
  markAllReadEndpoint = DEFAULT_MARK_ALL_READ_ENDPOINT,
  typeIcons,
  className,
  dataMolId,
}?: NotificationsPageProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `props` — Configuration props.
- `props.pageSize` — Items per page (default 20).
- `props.endpoint` — Override the `GET /notifications` URL.
- `props.markAllReadEndpoint` — Override the `POST /notifications/read-all` URL.
- `props.typeIcons` — Optional `type → material-symbol` overrides.
- `props.className` — Extra classes appended to the outer wrapper.
- `props.dataMolId` — `data-mol-id` selector for AI-agent interaction.

**Returns:** The rendered page element.

#### `resolveTypeIcon(type, overrides)`

Resolve an icon name for the given notification type, applying caller
overrides on top of the default map and falling back to a generic
bell glyph when the type is unknown.

```typescript
function resolveTypeIcon(type: string, overrides?: Readonly<Record<string, string>>): string
```

- `type` — The `Notification.type` value (e.g. `'message'`).
- `overrides` — Optional caller-provided overrides.

**Returns:** The material-symbol icon name to render.

### Constants

#### `DEFAULT_TYPE_ICONS`

Default mapping covering the most common notification types.

Unknown types fall back to `notifications` at render time.

```typescript
const DEFAULT_TYPE_ICONS: Readonly<Record<string, string>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-notification-feed-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-notification-feed-react`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

All UI text resolves through `t()` and ships in the companion locale
bond `@molecule/app-locales-notifications-page`. All styling
resolves through `getClassMap()` — no Tailwind class names live in
this package.

Prereqs: an `<HttpProvider>` ancestor (from `@molecule/app-react` —
`useHttpClient()` throws without it), a wired ClassMap bond, and an
`I18nProvider`. Icons come from the composed
`@molecule/app-notification-feed-react`, which renders Material
Symbols LIGATURES — load the "Material Symbols Outlined" font (and its
CSS class) or icon names render as plain text. Notifications whose
`data.href` is set render react-router `<Link>` rows, which require a
`<Router>` ancestor. Defaults assume the API is proxied at `/api` —
override `endpoint` / `markAllReadEndpoint` otherwise.

## Translations

Translation strings are provided by `@molecule/app-locales-notifications-page`.
