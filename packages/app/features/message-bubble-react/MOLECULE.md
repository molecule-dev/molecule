# @molecule/app-message-bubble-react

React message/chat primitives.

Exports:
- `<MessageBubble>` — one message (avatar + meta + body + attachments/reactions/thread).
- `<MessageMeta>` — author · timestamp row.
- `<MessageAttachments>` — attachment list under a bubble.
- `<MessageReactions>` — reaction-chip row + add-reaction button.
- `<ThreadIndicator>` — "3 replies · last Monday" footer.
- `<MessageList>` — vertical list of bubbles with optional date separators.
- `<MessageComposer>` — input row with submit.
- `MessageData`, `MessageAuthor`, `MessageAttachment`, `MessageReaction` types.

## Quick Start

```tsx
import { MessageBubble, MessageList, MessageComposer } from '@molecule/app-message-bubble-react'

const messages = [
  { id: '1', author: { id: 'u1', name: 'Alice', avatarSrc: '/alice.png' }, body: 'Hey there!', timestamp: '2024-06-01T10:00:00Z' },
  { id: '2', author: { id: 'u2', name: 'Bob' }, body: 'Hi Bob!', timestamp: '2024-06-01T10:01:00Z' },
]

<MessageList messages={messages} selfAuthorId="u1" />
<MessageComposer onSubmit={(text) => console.log('send', text)} placeholder="Write a message…" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-message-bubble-react
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

### Functions

#### `MessageAttachments(root0, root0, root0)`

Vertical list of attachment rows below a message body.
Each row: `[icon] [name · size] [action]`.

```typescript
function MessageAttachments({
  attachments,
  className,
}: MessageAttachmentsProps): JSX.Element
```

- `root0` — *
- `root0` — .attachments
- `root0` — .className

#### `MessageBubble(root0, root0, root0, root0, root0)`

One message in a chat thread — avatar, author/timestamp row, body,
plus optional attachments/reactions/thread indicator passed in via
`message.attachments` / `message.reactions` / `message.thread`.

`isSelf` flips the alignment and accent so the viewer's own messages
appear on the right with a primary-tinted bubble.

```typescript
function MessageBubble({
  message,
  isSelf,
  showMeta = true,
  className,
}: MessageBubbleProps): JSX.Element
```

- `root0` — *
- `root0` — .message
- `root0` — .isSelf
- `root0` — .showMeta
- `root0` — .className

#### `MessageComposer(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .onSubmit
- `root0` — .placeholder
- `root0` — .submitOnEnter
- `root0` — .leading
- `root0` — .trailing
- `root0` — .disabled
- `root0` — .className

#### `MessageList(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .messages
- `root0` — .selfAuthorId
- `root0` — .renderDateSeparator
- `root0` — .emptyState
- `root0` — .className

#### `MessageMeta(root0, root0, root0, root0)`

Small `[author · timestamp]` row rendered above a message body. Broken
out so apps can reuse it in notification rows, quote blocks, etc.

```typescript
function MessageMeta({ author, timestamp, className }: MessageMetaProps): JSX.Element
```

- `root0` — *
- `root0` — .author
- `root0` — .timestamp
- `root0` — .className

#### `MessageReactions(root0, root0, root0, root0, root0)`

Row of reaction chips below a message body. Each chip shows emoji +
count and highlights when the current user reacted.

```typescript
function MessageReactions({
  reactions,
  onToggle,
  onAdd,
  className,
}: MessageReactionsProps): JSX.Element
```

- `root0` — *
- `root0` — .reactions
- `root0` — .onToggle
- `root0` — .onAdd
- `root0` — .className

#### `ThreadIndicator(root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .replyCount
- `root0` — .lastReplyAt
- `root0` — .onOpen
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
