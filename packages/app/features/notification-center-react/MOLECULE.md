# @molecule/app-notification-center-react

Notification dropdown panel.

Exports `<NotificationCenter>` and `NotificationItem` type.

## Quick Start

```tsx
import { NotificationCenter } from '@molecule/app-notification-center-react'

<NotificationCenter
  items={[
    { id: '1', title: 'Build succeeded', body: 'main branch deployed', timestamp: '2m ago', read: false, onClick: () => navigate('/builds') },
    { id: '2', title: 'New comment', body: 'Alice commented on your PR', timestamp: '1h ago', read: true },
  ]}
  onMarkAllRead={() => markAllRead()}
  onViewAll={() => navigate('/notifications')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-notification-center-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
