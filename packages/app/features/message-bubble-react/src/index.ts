/**
 * React message/chat primitives.
 *
 * Exports:
 * - `<MessageBubble>` — one message (avatar + meta + body + attachments/reactions/thread).
 * - `<MessageMeta>` — author · timestamp row.
 * - `<MessageAttachments>` — attachment list under a bubble.
 * - `<MessageReactions>` — reaction-chip row + add-reaction button.
 * - `<ThreadIndicator>` — "3 replies · last Monday" footer.
 * - `<MessageList>` — vertical list of bubbles with optional date separators.
 * - `<MessageComposer>` — input row with submit.
 * - `MessageData`, `MessageAuthor`, `MessageAttachment`, `MessageReaction` types.
 *
 * @example
 * ```tsx
 * import { MessageBubble, MessageList, MessageComposer } from '@molecule/app-message-bubble-react'
 *
 * const messages = [
 *   { id: '1', author: { id: 'u1', name: 'Alice', avatarSrc: '/alice.png' }, body: 'Hey there!', timestamp: '2024-06-01T10:00:00Z' },
 *   { id: '2', author: { id: 'u2', name: 'Bob' }, body: 'Hi Bob!', timestamp: '2024-06-01T10:01:00Z' },
 * ]
 *
 * <MessageList messages={messages} selfAuthorId="u1" />
 * <MessageComposer onSubmit={(text) => console.log('send', text)} placeholder="Write a message…" />
 * ```
 *
 * @module
 */

export * from './MessageAttachments.js'
export * from './MessageBubble.js'
export * from './MessageComposer.js'
export * from './MessageList.js'
export * from './MessageMeta.js'
export * from './MessageReactions.js'
export * from './ThreadIndicator.js'
export * from './types.js'
