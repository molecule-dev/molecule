# @molecule/app-presence-indicator-react

Presence indicator primitives.

Exports:
- `<PresenceDot>` — small colored status dot (online/away/busy/offline).
- `<AvatarWithPresence>` — wraps any avatar and overlays a presence dot.
- `PresenceStatus` type.

## Quick Start

```tsx
import { PresenceDot, AvatarWithPresence } from '@molecule/app-presence-indicator-react'

// Inline dot next to a user name
<PresenceDot status="online" />

// Dot overlaid on an avatar image
<AvatarWithPresence status="away" corner="bottom-right">
  <img src={user.avatarUrl} alt={user.name} width={40} height={40} />
</AvatarWithPresence>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-presence-indicator-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
