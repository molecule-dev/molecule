# @molecule/app-emoji-reactions-react

Emoji reaction bar.

Exports `<EmojiReactions>` and the `EmojiReaction` type — one toggle
chip per existing reaction plus an optional "+" quick-pick popover.
Standalone (not coupled to a message-bubble layout, unlike
`MessageReactions` in `@molecule/app-message-bubble-react`).

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

#### `EmojiReactionsProps`

```typescript
interface EmojiReactionsProps {
  reactions: EmojiReaction[]
  /** Called when a reaction chip is toggled by the current user. */
  onToggle?: (emoji: string) => void
  /** Quick-pick emojis offered when "+" is clicked. */
  quickPicks?: string[]
  /** Called when the user picks a new emoji. */
  onAdd?: (emoji: string) => void
  /** Optional wrapper class. */
  className?: string
  /** Optional render override for the count display (e.g. avatar list). */
  renderTooltip?: (r: EmojiReaction) => ReactNode
}
```

### Functions

#### `EmojiReactions(props)`

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

- `props` — Component props (see {@link EmojiReactionsProps}).

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

- Fully controlled: the component renders `reactions` as given and emits
  `onToggle` / `onAdd` — it never mutates counts itself.
- The "+" button and quick-pick popover render only when `onAdd` is
  passed. Default quick picks: 👍 ❤️ 🎉 😄 😢 🙏 (override via `quickPicks`).
- `renderTooltip` currently only SUPPRESSES the default
  `"<count> reactions"` title attribute; its return value is not yet
  rendered anywhere. Do not rely on it to show custom tooltip content.
- The default count tooltip is hardcoded English; the add-button label
  resolves through `t('reactions.add')` with an English fallback —
  companion locale bond: `@molecule/app-locales-emoji-reactions`.
- Requires a wired ClassMap bond and the app I18nProvider (standard
  molecule app setup).

## Translations

Translation strings are provided by `@molecule/app-locales-emoji-reactions`.
