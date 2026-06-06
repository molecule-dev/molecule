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
npm install @molecule/app-notification-badge-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
