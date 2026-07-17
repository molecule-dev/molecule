# @molecule/app-notification-badge-react

React notification badge / dot / wrapper.

Exports:
- `<NotificationBadge>` — count pill with `max+` overflow handling.
- `<NotificationDot>` — tiny presence indicator.
- `<NotificationWrapper>` — positions a badge at the corner of any child.

## Quick Start

```tsx
import { NotificationBadge, NotificationDot, NotificationWrapper } from '@molecule/app-notification-badge-react'

<NotificationBadge count={5} variant="error" />

<NotificationDot visible variant="info" position="corner" />

<NotificationWrapper count={12} placement="top-right">
  <span aria-hidden>notifications</span>
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

### Interfaces

#### `NotificationBadgeProps`

```typescript
interface NotificationBadgeProps {
  /** Numeric count — renders as a pill. When 0 and `hideOnZero` is true, the badge isn't rendered. */
  count: number
  /** Hide the badge when `count` is 0. Defaults to true. */
  hideOnZero?: boolean
  /** When `count > max`, renders as `max+`. Defaults to 99. */
  max?: number
  /** Accent color. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Extra classes. */
  className?: string
}
```

#### `NotificationDotProps`

```typescript
interface NotificationDotProps {
  /** When false, nothing is rendered. */
  visible?: boolean
  /** Color variant. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Dot size (pixels). Defaults to 8. */
  size?: number
  /** Optional positioning — `'corner'` places absolutely at top-right of parent. */
  position?: 'inline' | 'corner'
  /** Extra classes. */
  className?: string
}
```

#### `NotificationWrapperProps`

```typescript
interface NotificationWrapperProps {
  /** The child that should receive the badge (icon button, avatar, nav item). */
  children: ReactNode
  /** Notification count. */
  count: number
  /** Hide the badge when count is 0. Defaults to true. */
  hideOnZero?: boolean
  /** Visual variant. */
  variant?: 'error' | 'warning' | 'info' | 'success' | 'neutral'
  /** Corner placement. Defaults to `'top-right'`. */
  placement?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `NotificationBadge(props)`

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

- `props` — Component props (see {@link NotificationBadgeProps}).

#### `NotificationDot(props)`

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

- `props` — Component props (see {@link NotificationDotProps}).

#### `NotificationWrapper(props)`

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

- `props` — Component props (see {@link NotificationWrapperProps}).

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

Requires a wired ClassMap bond — `getClassMap()` throws before wiring.

Every variant resolves to a real theme background token, so all five are
visible in both light and dark themes: `error` / `warning` / `info` /
`success` map to the semantic status colors, and `neutral` maps to the
`surface-secondary` surface token (what `cm.surfaceSecondary` emits) for a
neutral grey fill. (`neutral` previously used `bg-outline`, which no theme
defines, so the neutral pill/dot rendered transparent — fixed.)

`<NotificationWrapper>` absolutely positions the badge 4px OUTSIDE the
child's corner — an `overflow: hidden` ancestor will clip it.
