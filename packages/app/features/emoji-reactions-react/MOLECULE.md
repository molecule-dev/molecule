# @molecule/app-emoji-reactions-react

Emoji reaction bar.

Exports `<EmojiReactions>` and `EmojiReaction` type.

## Quick Start

```tsx
import { EmojiReactions } from '@molecule/app-emoji-reactions-react'

<EmojiReactions
  reactions={[
    { emoji: '👍', count: 12, reactedByMe: true },
    { emoji: '❤️', count: 5 },
  ]}
  onToggle={(emoji) => toggleReaction(postId, emoji)}
  onAdd={(emoji) => addReaction(postId, emoji)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-emoji-reactions-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `EmojiReaction`

Represents a single emoji reaction with its aggregated count and current-user state.

```typescript
interface EmojiReaction {
  emoji: string
  count: number
  /** Whether the current user reacted with this emoji. */
  reactedByMe?: boolean
}
```

### Functions

#### `EmojiReactions(root0, root0, root0, root0, root0, root0, root0)`

Generic emoji reaction bar — chip per existing reaction + an add
button that opens a quick-pick row. Different from
`MessageReactions` in `app-message-bubble-react` in being
standalone (not coupled to the message bubble layout).

```typescript
function EmojiReactions({
  reactions,
  onToggle,
  quickPicks = DEFAULT_PICKS,
  onAdd,
  className,
  renderTooltip,
}: EmojiReactionsProps): JSX.Element
```

- `root0` — *
- `root0` — .reactions
- `root0` — .onToggle
- `root0` — .quickPicks
- `root0` — .onAdd
- `root0` — .className
- `root0` — .renderTooltip

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
