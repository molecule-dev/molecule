# @molecule/app-notification-badge-react

React notification badge / dot / wrapper.

Exports:
- `<NotificationBadge>` — count pill with `max+` overflow handling.
- `<NotificationDot>` — tiny presence indicator.
- `<NotificationWrapper>` — positions a badge at the corner of any child.

## Quick Start

```tsx
import { NotificationBadge, NotificationDot, NotificationWrapper } from '@molecule/app-notification-badge-react'

// Count pill on its own
<NotificationBadge count={5} variant="error" />

// Unread presence dot
<NotificationDot visible={hasUnread} variant="info" position="corner" />

// Badge overlaid on an icon button
<NotificationWrapper count={12} placement="top-right">
  <BellIcon />
</NotificationWrapper>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notification-badge-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `NotificationBadge(root0, root0, root0, root0, root0, root0)`

Small count pill — typically attached to a nav item, icon button, or
inbox entry. Use `<NotificationDot>` when you just need a presence
indicator without a count.

```typescript
function NotificationBadge({
  count,
  hideOnZero = true,
  max = 99,
  variant = 'error',
  className,
}: NotificationBadgeProps): ReactElement<unknown, string | JSXElementConstructor<any>> | null
```

- `root0` — *
- `root0` — .count
- `root0` — .hideOnZero
- `root0` — .max
- `root0` — .variant
- `root0` — .className

#### `NotificationDot(root0, root0, root0, root0, root0, root0)`

Tiny unread / presence indicator. For counted badges use
`<NotificationBadge>`.

```typescript
function NotificationDot({
  visible = true,
  variant = 'error',
  size = 8,
  position = 'inline',
  className,
}: NotificationDotProps): JSX.Element | null
```

- `root0` — *
- `root0` — .visible
- `root0` — .variant
- `root0` — .size
- `root0` — .position
- `root0` — .className

#### `NotificationWrapper(root0, root0, root0, root0, root0, root0, root0)`

Positions a `<NotificationBadge>` at a corner of any child element.
The wrapper becomes `relative` so the badge absolutely positions
correctly — wrap icon buttons, avatars, or nav entries.

```typescript
function NotificationWrapper({
  children,
  count,
  hideOnZero = true,
  variant = 'error',
  placement = 'top-right',
  className,
}: NotificationWrapperProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .count
- `root0` — .hideOnZero
- `root0` — .variant
- `root0` — .placement
- `root0` — .className

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
