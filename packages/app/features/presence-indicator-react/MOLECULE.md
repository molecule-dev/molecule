# @molecule/app-presence-indicator-react

Presence indicator primitives.

Exports:
- `<PresenceDot>` — small colored status dot (online/away/busy/offline).
- `<AvatarWithPresence>` — wraps any avatar and overlays a presence dot.
- `PresenceStatus` type.

## Quick Start

```tsx
import { PresenceDot, AvatarWithPresence } from '@molecule/app-presence-indicator-react'

const user = { avatarUrl: '/avatar.png', name: 'Ada' }

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
npm install @molecule/app-presence-indicator-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AvatarWithPresenceProps`

Props for {@link AvatarWithPresence}.

```typescript
interface AvatarWithPresenceProps {
  /** The avatar / media to decorate. */
  children: ReactNode
  /** Presence status; omit to hide the dot. */
  status?: PresenceStatus
  /** Corner placement of the dot. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Dot size. */
  dotSize?: number
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

#### `PresenceDotProps`

Props for {@link PresenceDot}.

```typescript
interface PresenceDotProps {
  status: PresenceStatus
  /** Diameter in pixels. Defaults to 10. */
  size?: number
  /** Position — `'inline'` default; `'overlay'` positions absolutely for avatar overlays. */
  position?: 'inline' | 'overlay'
  /** Overlay corner when `position="overlay"`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
```

### Types

#### `PresenceStatus`

Union of supported user-presence states displayed by the dot.

```typescript
type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'
```

### Functions

#### `AvatarWithPresence(props)`

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

- `props` — Component props (see {@link AvatarWithPresenceProps}).

#### `PresenceDot(props)`

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

- `props` — Component props (see {@link PresenceDotProps}).

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

The default aria-label is the English string "Presence: <status>" — pass
`ariaLabel` (e.g. from `t()`) in localized apps; the package has no locale
bond. `position="overlay"` positions absolutely, so the dot must sit inside
a relatively-positioned parent — `<AvatarWithPresence>` provides that
wrapper. Status colors are fixed semantic hues (green/yellow/red/gray),
identical in both themes; the overlay ring color follows
`var(--color-surface)`.
