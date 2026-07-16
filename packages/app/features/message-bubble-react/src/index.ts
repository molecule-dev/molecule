/**
 * React message/chat primitives.
 *
 * Exports:
 * - `<MessageBubble>` — one message (avatar + meta row + body + optional
 *   attachments/reactions/thread slots from `message.attachments` etc.).
 *   Props: `message`, `isSelf?`, `showMeta?`, `className?`.
 * - `<MessageMeta>` — author · timestamp row.
 * - `<MessageAttachments attachments={[...]}>` — attachment rows (icon + name ·
 *   size + action slot).
 * - `<MessageReactions reactions={[...]} onToggle? onAdd?>` — reaction-chip row.
 * - `<ThreadIndicator replyCount lastReplyAt? onOpen?>` — "3 replies · …" footer.
 * - `<MessageList messages selfAuthorId? renderDateSeparator? emptyState?>` —
 *   vertical list of bubbles.
 * - `<MessageComposer onSubmit placeholder? submitOnEnter? leading? trailing?
 *   disabled?>` — textarea + Send button.
 * - `MessageData`, `MessageAuthor`, `MessageAttachment`, `MessageReaction` types.
 *
 * @remarks
 * - `isSelf` (or `MessageList.selfAuthorId`) only right-aligns the row — there is
 *   no built-in bubble background/tint. Style the body via `className` (or wrap
 *   `message.body`) if you want classic chat bubbles.
 * - `timestamp` renders exactly what you pass — no time-ago or date formatting.
 *   Pre-format ("2m ago", "10:01") before passing; raw ISO strings display as-is.
 * - The composer submits on the Send button or Ctrl/Cmd+Enter (`submitOnEnter`),
 *   NOT plain Enter; it trims and clears on submit and blocks empty sends.
 * - Composer strings route through `t()` (`composer.placeholder`,
 *   `composer.send`) with the `@molecule/app-locales-message-bubble` companion
 *   bond; `ThreadIndicator` uses `thread.replies`, which that bond does not yet
 *   ship — it falls back to English.
 * - `MessageReactions` marks the viewer's own reaction with `aria-pressed` only —
 *   no visual highlight ships.
 * - Requires wired i18n (`useTranslation`) and a ClassMap bond; Avatar/Button/
 *   Textarea come from `@molecule/app-ui-react`.
 *
 * @example
 * ```tsx
 * import { MessageComposer, MessageList } from '@molecule/app-message-bubble-react'
 * import type { MessageData } from '@molecule/app-message-bubble-react'
 *
 * const messages: MessageData[] = [
 *   { id: '1', author: { id: 'u1', name: 'Alice', avatarSrc: '/alice.png' }, body: 'Hey there!', timestamp: '10:00' },
 *   { id: '2', author: { id: 'u2', name: 'Bob' }, body: 'Hi Alice!', timestamp: '10:01' },
 * ]
 *
 * <MessageList messages={messages} selfAuthorId="u1" />
 * <MessageComposer onSubmit={(text) => sendMessage(text)} />
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
