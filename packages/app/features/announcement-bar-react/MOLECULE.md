# @molecule/app-announcement-bar-react

React announcement / promo bar.

Exports `<AnnouncementBar>` — persistent top-of-page banner with icon,
message, optional action (link or button), and optional dismiss (×).
Long-lived and prominent, unlike a Toast; carries an action slot +
dismiss, unlike an Alert.

## Quick Start

```tsx
import { AnnouncementBar } from '@molecule/app-announcement-bar-react'

<AnnouncementBar
  kind="promo"
  icon={<span>🎉</span>}
  action={{ label: 'Learn more', href: '/pricing' }}
  onDismiss={() => console.log('dismissed')}
  dataMolId="promo-bar"
>
  New Pro plan — 3 months free for early adopters.
</AnnouncementBar>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-announcement-bar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AnnouncementBarProps`

```typescript
interface AnnouncementBarProps {
  /** Primary message. */
  children: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional call-to-action (link or button). */
  action?: { label: ReactNode; href?: string; onClick?: () => void }
  /** Semantic kind — emitted as `data-kind` on the root (style via CSS/`className`). Defaults to `'info'`. */
  kind?: AnnouncementKind
  /** Show a dismiss (×) button. Defaults to true. */
  dismissible?: boolean
  /** Called when the bar is dismissed. */
  onDismiss?: () => void
  /** Controlled visibility — when provided, overrides internal state. */
  visible?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Types

#### `AnnouncementKind`

Semantic kind, exposed as a `data-kind` attribute for per-kind styling (no built-in style change).

```typescript
type AnnouncementKind = 'info' | 'success' | 'warning' | 'error' | 'promo'
```

### Functions

#### `AnnouncementBar(props)`

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

- `props` — Component props (see {@link AnnouncementBarProps}).

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

`kind` is exposed as a `data-kind` attribute on the root — it does NOT
change the bar's colors by itself; style per-kind via `className` or a
`[data-kind="…"]` selector. Dismissal is uncontrolled by default
(internal state; the bar stays hidden until remount) — pass `visible`
to control it, e.g. to persist dismissal per user. `dismissible`
defaults to `true`. There is no default `data-mol-id`; pass `dataMolId`
so agents/E2E can target the bar. Translations come from the companion
`@molecule/app-locales-announcement-bar` locale bond.

## Translations

Translation strings are provided by `@molecule/app-locales-announcement-bar`.
