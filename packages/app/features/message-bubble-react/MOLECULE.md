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

## Type
`feature`

## Installation
```bash
npm install @molecule/app-message-bubble-react
```

## API

### Interfaces

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
