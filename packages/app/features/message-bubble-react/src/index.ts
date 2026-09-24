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
 * - Nothing is sent or stored for you: `MessageComposer.onSubmit` receives only the trimmed
 *   text (return value ignored, not awaited — errors are yours to surface) and `MessageList`
 *   renders only the `messages` you pass. Append to your own state and call your API.
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
 * import { useState } from 'react'
 *
 * import { post } from '@molecule/app-http'
 * import { MessageComposer, type MessageData, MessageList } from '@molecule/app-message-bubble-react'
 *
 * const me = { id: 'u1', name: 'Alice', avatarSrc: '/avatars/alice.png' }
 * const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
 *
 * export function ConversationPage() {
 *   const [messages, setMessages] = useState<MessageData[]>([
 *     { id: 'm1', author: { id: 'u2', name: 'Bob' }, body: 'Hi Alice! Ready for the demo?', timestamp: '10:01 AM' },
 *   ])
 *   async function send(text: string): Promise<void> {
 *     setMessages((ms) => [...ms, { id: crypto.randomUUID(), author: me, body: text, timestamp: time.format(new Date()) }])
 *     await post('/conversations/c1/messages', { body: text })
 *   }
 *   return (
 *     <section>
 *       <MessageList messages={messages} selfAuthorId={me.id} emptyState={<p>No messages yet.</p>} />
 *       <MessageComposer onSubmit={(text) => void send(text)} />
 *     </section>
 *   )
 * }
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
