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
npm install @molecule/app-emoji-reactions-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
