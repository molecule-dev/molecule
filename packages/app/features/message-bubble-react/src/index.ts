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
