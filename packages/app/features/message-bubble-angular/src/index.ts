/**
 * Angular message/chat primitives — the counterpart of
 * `@molecule/app-message-bubble-react`: the same names, the same props (React
 * spelling), and the same DOM for the same input.
 *
 * Exports:
 * - `<article mol-message-bubble>` — one message (avatar + meta row + body +
 *   optional attachments/reactions/thread nodes from `message.attachments`
 *   etc.). Inputs: `message`, `isSelf`, `showMeta`, `className`.
 * - `<div mol-message-meta>` — author · timestamp row.
 * - `<div mol-message-attachments [attachments]="[…]">` — attachment rows
 *   (icon + name · size + action).
 * - `<div mol-message-reactions [reactions]="[…]" [onToggle]="…" [onAdd]="…">` —
 *   reaction-chip row.
 * - `<button mol-thread-indicator [replyCount]="3" [onOpen]="…">` —
 *   "3 replies · …" footer.
 * - `<mol-message-list [messages]="…">` — vertical list of bubbles.
 * - `<div mol-message-composer [onSubmit]="…">` — textarea + Send button.
 * - `MessageData`, `MessageAuthor`, `MessageAttachment`, `MessageReaction` types.
 *
 * @remarks
 * - `isSelf` (or `MessageList.selfAuthorId`) only right-aligns the row — there is
 *   no built-in bubble background/tint. Style the body via `className` (or wrap
 *   `message.body`) if you want classic chat bubbles.
 * - `timestamp` renders exactly what you pass — no time-ago or date formatting.
 * - The composer submits on the Send button or Ctrl/Cmd+Enter (`submitOnEnter`),
 *   NOT plain Enter; it trims and clears on submit and blocks empty sends.
 * - Composer strings route through `t()` (`composer.placeholder`,
 *   `composer.send`) with the `@molecule/app-locales-message-bubble` companion
 *   bond; `ThreadIndicator` uses `thread.replies`, pluralized by `count`
 *   (`thread.replies_one` / `thread.replies_other`) in the same bond.
 * - A node-valued prop cannot be an input carrying a live DOM node: pass text,
 *   an `ng-template` reference, or projected content (`[slot=author]`,
 *   `[slot=emptyState]`, `[slot=leading]`, …).
 * - `MessageReactions` marks the viewer's own reaction with `aria-pressed` only —
 *   no visual highlight ships.
 * - Requires wired i18n (`useTranslation`) and a ClassMap bond; the avatar,
 *   button and textarea come from `@molecule/app-ui-angular`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { MessageBubble, MessageComposer } from '@molecule/app-message-bubble-angular'
 * import type { MessageData } from '@molecule/app-message-bubble-angular'
 *
 * @Component({
 *   selector: 'app-chat',
 *   standalone: true,
 *   imports: [MessageBubble, MessageComposer],
 *   template: `
 *     @for (message of messages; track message.id) {
 *       <article mol-message-bubble [message]="message" [isSelf]="message.author.id === 'u1'"></article>
 *     }
 *     <div mol-message-composer [onSubmit]="send.bind(this)"></div>
 *   `,
 * })
 * export class Chat {
 *   messages: MessageData[] = [
 *     { id: '1', author: { id: 'u1', name: 'Alice', avatarSrc: '/alice.png' }, body: 'Hey there!', timestamp: '10:00' },
 *     { id: '2', author: { id: 'u2', name: 'Bob' }, body: 'Hi Alice!', timestamp: '10:01' },
 *   ]
 *   send(text: string): void {
 *     this.messages = [...this.messages, sent(text)]
 *   }
 * }
 * ```
 *
 * @module
 */

export * from './message-attachments.component.js'
export * from './message-bubble.component.js'
export * from './message-composer.component.js'
export * from './message-list.component.js'
export * from './message-meta.component.js'
export * from './message-reactions.component.js'
export * from './thread-indicator.component.js'
export * from './types.js'
