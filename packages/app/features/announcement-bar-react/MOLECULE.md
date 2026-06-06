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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
