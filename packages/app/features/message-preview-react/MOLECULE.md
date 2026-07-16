# @molecule/app-message-preview-react

`@molecule/app-message-preview-react` — conversation / thread row for chat /
inbox sidebars. Initials avatar with presence dot, name + preview + timestamp
+ unread pip, and an active-selection treatment.

Exports `<MessagePreview>` and the `MessagePreviewPresence` type. Props:
`name`, `preview`, `timestamp`, `unread?` (0 hides the pip), `presence?`
(`'online' | 'away' | 'offline'`), `active?`, `channelIcon?` (Material Symbols
ligature name), `initials?` (override the initials derived from `name`),
`to?` (render as a router `<Link>`), `onClick?`, `unreadAriaLabel?`,
`className?`.

Extracted from the customer-support-chat ConversationListItem and its
near-identical siblings in ai-customer-service-bot, ai-voice-assistant, and
team-chat.

## Quick Start

```tsx
import { MessagePreview } from '@molecule/app-message-preview-react'

<MessagePreview
  name="Maya Patel"
  preview="Thanks! That fixed it."
  timestamp="2m"
  unread={3}
  presence="online"
  channelIcon="mail"
  active={activeThreadId === 't1'}
  to="/conversation/t1"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-message-preview-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
```

## API

### Interfaces

#### `MessagePreviewProps`

```typescript
interface MessagePreviewProps {
  name: ReactNode
  preview: ReactNode
  timestamp: ReactNode
  /** Unread count — 0 hides the pip. */
  unread?: number
  presence?: MessagePreviewPresence | null
  active?: boolean
  /** Material-symbols icon name (e.g. mail / chat / phone) shown ahead of the preview. */
  channelIcon?: string
  /** Override the initials computed from `name`. */
  initials?: string
  /** Optional href; when set, the row renders as a router link. */
  to?: string
  onClick?: () => void
  unreadAriaLabel?: string
  className?: string
}
```

### Types

#### `MessagePreviewPresence`

Presence state of the contact shown in the avatar dot.

```typescript
type MessagePreviewPresence = 'online' | 'away' | 'offline'
```

### Functions

#### `MessagePreview(props)`

Conversation / thread preview row. Renders as a `<Link>` when `to` is
provided (requires a react-router `<Router>` ancestor), otherwise as a
`<div>`.

```typescript
function MessagePreview({
  name,
  preview,
  timestamp,
  unread = 0,
  presence,
  active = false,
  channelIcon,
  initials,
  to,
  onClick,
  unreadAriaLabel,
  className,
}: MessagePreviewProps): JSX.Element
```

- `props` — Component props (see {@link MessagePreviewProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
- `react-router-dom`

- `channelIcon` renders a `material-symbols-outlined` glyph: the Material
  Symbols font must be loaded by the app (molecule scaffolds include it) or
  the icon shows as literal text like "mail".
- `to` renders a react-router-dom `<Link>` — it requires a `<Router>` ancestor
  and the react-router-dom peer; omit `to` (use `onClick`) in router-less apps.
- The avatar is initials-only (no image URL prop). Initials are derived from
  `name` only when it is a plain string — pass `initials` when `name` is a
  ReactNode.
- Styling uses Tailwind utility classes + molecule theme tokens (`primary`,
  `surface`, `--color-border-secondary`) — it only looks right under the
  Tailwind ClassMap bond with the molecule base theme; presence dots are fixed
  green/amber/grey hex colors.
- The unread pip's accessible label defaults to English "N unread" — pass
  `unreadAriaLabel` (via `t()`) in localized apps; the component has no
  companion locale bond.
- `timestamp` renders verbatim — pre-format ("2m", "Yesterday") yourself.
