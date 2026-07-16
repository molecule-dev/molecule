# @molecule/app-message-bubble-react

React message/chat primitives.

Exports:
- `<MessageBubble>` — one message (avatar + meta row + body + optional
  attachments/reactions/thread slots from `message.attachments` etc.).
  Props: `message`, `isSelf?`, `showMeta?`, `className?`.
- `<MessageMeta>` — author · timestamp row.
- `<MessageAttachments attachments={[...]}>` — attachment rows (icon + name ·
  size + action slot).
- `<MessageReactions reactions={[...]} onToggle? onAdd?>` — reaction-chip row.
- `<ThreadIndicator replyCount lastReplyAt? onOpen?>` — "3 replies · …" footer.
- `<MessageList messages selfAuthorId? renderDateSeparator? emptyState?>` —
  vertical list of bubbles.
- `<MessageComposer onSubmit placeholder? submitOnEnter? leading? trailing?
  disabled?>` — textarea + Send button.
- `MessageData`, `MessageAuthor`, `MessageAttachment`, `MessageReaction` types.

## Quick Start

```tsx
import { MessageComposer, MessageList } from '@molecule/app-message-bubble-react'
import type { MessageData } from '@molecule/app-message-bubble-react'

const messages: MessageData[] = [
  { id: '1', author: { id: 'u1', name: 'Alice', avatarSrc: '/alice.png' }, body: 'Hey there!', timestamp: '10:00' },
  { id: '2', author: { id: 'u2', name: 'Bob' }, body: 'Hi Alice!', timestamp: '10:01' },
]

<MessageList messages={messages} selfAuthorId="u1" />
<MessageComposer onSubmit={(text) => sendMessage(text)} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-message-bubble-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `MessageAttachment`

Describes a single file attachment rendered inside a message bubble.

```typescript
interface MessageAttachment {
  id: string
  name: string
  /** Size label (e.g. "2.3 MB"). */
  size?: string
  /** Action slot — typically a download button. */
  action?: React.ReactNode
  /** Optional leading icon. */
  icon?: React.ReactNode
}
```

#### `MessageAttachmentsProps`

```typescript
interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

#### `MessageAuthor`

Message / chat types.

```typescript
interface MessageAuthor {
  /** Author id — used to derive `role` (self vs other) in rendering. */
  id: string
  /** Display name. */
  name: string
  /** Optional avatar URL. */
  avatarSrc?: string
}
```

#### `MessageBubbleProps`

```typescript
interface MessageBubbleProps {
  message: MessageData
  /** Whether the current viewer is the message author (affects alignment + accent). */
  isSelf?: boolean
  /** Render the author row (avatar + name + time). Defaults to true. */
  showMeta?: boolean
  /** Extra classes. */
  className?: string
}
```

#### `MessageComposerProps`

```typescript
interface MessageComposerProps {
  /** Called when the user submits. */
  onSubmit: (value: string) => void
  /** Optional placeholder. */
  placeholder?: string
  /** Whether Ctrl/Cmd-Enter submits. Defaults to true. */
  submitOnEnter?: boolean
  /** Optional leading slot (e.g. attachment button). */
  leading?: ReactNode
  /** Optional trailing slot rendered before the submit button. */
  trailing?: ReactNode
  /** Disable input + submit. */
  disabled?: boolean
  /** Extra classes. */
  className?: string
}
```

#### `MessageData`

Data shape for a single chat message rendered by the bubble component.

```typescript
interface MessageData {
  id: string
  author: MessageAuthor
  /** Message body — typically plain text, but can be a ReactNode for rich content. */
  body: ReactNode
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: ReactNode
  /** Optional attachments list (rendered below the body). */
  attachments?: ReactNode
  /** Optional reactions row. */
  reactions?: ReactNode
  /** Optional thread-indicator (reply count + last reply time). */
  thread?: ReactNode
}
```

#### `MessageListProps`

```typescript
interface MessageListProps {
  messages: MessageData[]
  /** When provided, viewer-authored messages flip alignment to the right. */
  selfAuthorId?: string
  /** Optional date separator renderer (receives the current message). */
  renderDateSeparator?: (message: MessageData, i: number) => ReactNode
  /** Empty-state node when `messages` is empty. */
  emptyState?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `MessageMetaProps`

```typescript
interface MessageMetaProps {
  /** Author display name. */
  author: ReactNode
  /** Timestamp display. */
  timestamp: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `MessageReaction`

A single emoji reaction with its count and current-user state.

```typescript
interface MessageReaction {
  /** Emoji or symbol. */
  emoji: string
  /** Reaction count. */
  count: number
  /** Whether the current user reacted. */
  reactedByMe?: boolean
}
```

#### `MessageReactionsProps`

```typescript
interface MessageReactionsProps {
  reactions: MessageReaction[]
  /** Called when a reaction chip is toggled. */
  onToggle?: (emoji: string) => void
  /** Called when the "+" button is clicked. */
  onAdd?: () => void
  /** Extra classes. */
  className?: string
}
```

#### `ThreadIndicatorProps`

```typescript
interface ThreadIndicatorProps {
  /** Number of replies. */
  replyCount: number
  /** Last-reply timestamp display. */
  lastReplyAt?: ReactNode
  /** Called when clicked. */
  onOpen?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `MessageAttachments(props)`

Vertical list of attachment rows below a message body.
Each row: `[icon] [name · size] [action]`.

```typescript
function MessageAttachments({
  attachments,
  className,
}: MessageAttachmentsProps): JSX.Element
```

- `props` — Component props (see {@link MessageAttachmentsProps}).

#### `MessageBubble(props)`

One message in a chat thread — avatar, author/timestamp row, body,
plus optional attachments/reactions/thread indicator passed in via
`message.attachments` / `message.reactions` / `message.thread`.

`isSelf` flips the row direction so the viewer's own messages appear on
the right — no bubble background/tint is applied; style the body via
`className` if you want classic chat bubbles.

```typescript
function MessageBubble({
  message,
  isSelf,
  showMeta = true,
  className,
}: MessageBubbleProps): JSX.Element
```

- `props` — Component props (see {@link MessageBubbleProps}).

#### `MessageComposer(props)`

Message input row — text area + optional leading/trailing slots + submit button.

```typescript
function MessageComposer({
  onSubmit,
  placeholder,
  submitOnEnter = true,
  leading,
  trailing,
  disabled,
  className,
}: MessageComposerProps): JSX.Element
```

- `props` — Component props (see {@link MessageComposerProps}).

#### `MessageList(props)`

Vertical list of `<MessageBubble>`s with optional date separators.

```typescript
function MessageList({
  messages,
  selfAuthorId,
  renderDateSeparator,
  emptyState,
  className,
}: MessageListProps): JSX.Element
```

- `props` — Component props (see {@link MessageListProps}).

#### `MessageMeta(props)`

Small `[author · timestamp]` row rendered above a message body. Broken
out so apps can reuse it in notification rows, quote blocks, etc.

```typescript
function MessageMeta({ author, timestamp, className }: MessageMetaProps): JSX.Element
```

- `props` — Component props (see {@link MessageMetaProps}).

#### `MessageReactions(props)`

Row of reaction chips below a message body. Each chip shows emoji +
count; when the current user reacted the chip is marked with
`aria-pressed` only — no visual highlight ships.

```typescript
function MessageReactions({
  reactions,
  onToggle,
  onAdd,
  className,
}: MessageReactionsProps): JSX.Element
```

- `props` — Component props (see {@link MessageReactionsProps}).

#### `ThreadIndicator(props)`

"3 replies · last Monday" indicator rendered below a message bubble.
Clicking opens the thread view.

```typescript
function ThreadIndicator({
  replyCount,
  lastReplyAt,
  onOpen,
  className,
}: ThreadIndicatorProps): JSX.Element
```

- `props` — Component props (see {@link ThreadIndicatorProps}).

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

- `isSelf` (or `MessageList.selfAuthorId`) only right-aligns the row — there is
  no built-in bubble background/tint. Style the body via `className` (or wrap
  `message.body`) if you want classic chat bubbles.
- `timestamp` renders exactly what you pass — no time-ago or date formatting.
  Pre-format ("2m ago", "10:01") before passing; raw ISO strings display as-is.
- The composer submits on the Send button or Ctrl/Cmd+Enter (`submitOnEnter`),
  NOT plain Enter; it trims and clears on submit and blocks empty sends.
- Composer strings route through `t()` (`composer.placeholder`,
  `composer.send`) with the `@molecule/app-locales-message-bubble` companion
  bond; `ThreadIndicator` uses `thread.replies`, which that bond does not yet
  ship — it falls back to English.
- `MessageReactions` marks the viewer's own reaction with `aria-pressed` only —
  no visual highlight ships.
- Requires wired i18n (`useTranslation`) and a ClassMap bond; Avatar/Button/
  Textarea come from `@molecule/app-ui-react`.

## Translations

Translation strings are provided by `@molecule/app-locales-message-bubble`.
