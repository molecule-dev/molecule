# @molecule/app-announcement-bar-react

React announcement / promo bar.

Exports `<AnnouncementBar>` — persistent banner with icon, message,
action, and optional dismiss.

## Quick Start

```tsx
import { AnnouncementBar } from '@molecule/app-announcement-bar-react'

<AnnouncementBar
  kind="promo"
  icon={<span>🎉</span>}
  action={{ label: 'Learn more', href: '/pricing' }}
  onDismiss={() => console.log('dismissed')}
>
  New Pro plan — 3 months free for early adopters.
</AnnouncementBar>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-announcement-bar-react
```

## API

### Types

#### `AnnouncementKind`

Semantic kind that controls the default styling of an AnnouncementBar.

```typescript
type AnnouncementKind = 'info' | 'success' | 'warning' | 'error' | 'promo'
```

### Functions

#### `AnnouncementBar(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Persistent announcement banner — product updates, promos, outage
notices, feature callouts. Different from `<Toast>` in being
long-lived and prominent (top-of-page), and from `<Alert>` in
including an action slot + dismiss.

```typescript
function AnnouncementBar({
  children,
  icon,
  action,
  kind = 'info',
  dismissible = true,
  onDismiss,
  visible,
  className,
  dataMolId,
}: AnnouncementBarProps): JSX.Element | null
```

- `root0` — *
- `root0` — .children
- `root0` — .icon
- `root0` — .action
- `root0` — .kind
- `root0` — .dismissible
- `root0` — .onDismiss
- `root0` — .visible
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
