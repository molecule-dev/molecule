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

## API

### Types

#### `PresenceStatus`

Union of supported user-presence states displayed by the dot.

```typescript
type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'
```

### Functions

#### `AvatarWithPresence(root0, root0, root0, root0, root0, root0)`

Wraps any avatar/image and overlays a presence dot at a corner.
Non-destructive — just positions the dot; the child is untouched.

```typescript
function AvatarWithPresence({
  children,
  status,
  corner = 'bottom-right',
  dotSize,
  className,
}: AvatarWithPresenceProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .status
- `root0` — .corner
- `root0` — .dotSize
- `root0` — .className

#### `PresenceDot(root0, root0, root0, root0, root0, root0, root0)`

Small colored circle indicating user presence. Use inline next to a
name, or with `position="overlay"` attached to the corner of an
`<Avatar>`.

```typescript
function PresenceDot({
  status,
  size = 10,
  position = 'inline',
  corner = 'bottom-right',
  ariaLabel,
  className,
}: PresenceDotProps): React.JSX.Element
```

- `root0` — *
- `root0` — .status
- `root0` — .size
- `root0` — .position
- `root0` — .corner
- `root0` — .ariaLabel
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
