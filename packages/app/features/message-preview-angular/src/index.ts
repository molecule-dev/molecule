/**
 * `@molecule/app-message-preview-angular` — conversation / thread row for chat /
 * inbox sidebars. Initials avatar with presence dot, name + preview + timestamp
 * + unread pip, and an active-selection treatment.
 *
 * Exports `<MessagePreview>` and the `MessagePreviewPresence` type. Props:
 * `name`, `preview`, `timestamp`, `unread?` (0 hides the pip), `presence?`
 * (`'online' | 'away' | 'offline'`), `active?`, `channelIcon?` (Material Symbols
 * ligature name), `initials?` (override the initials derived from `name`),
 * `to?` (render as a router link), `onClick?`, `unreadAriaLabel?`,
 * `className?`.
 *
 * Extracted from the customer-support-chat ConversationListItem and its
 * near-identical siblings in ai-customer-service-bot, ai-voice-assistant, and
 * team-chat.
 *
 * @remarks
 * - `channelIcon` renders a `material-symbols-outlined` glyph: the Material
 *   Symbols font must be loaded by the app (molecule scaffolds include it) or
 *   the icon shows as literal text like "mail".
 * - `to` renders the binding's `Link` (`<a molLink>`) — it requires the router
 *   service and the same in-app navigation rules; omit `to` (use `onClick`) in
 *   router-less apps.
 * - With `onClick` the row carries `role="button"` + `tabindex="0"` and Enter /
 *   Space activate it, matching native button keyboard semantics.
 * - The avatar is initials-only (no image URL prop). Initials are derived from
 *   `name` only when it is a plain string — pass `initials` when `name` is a
 *   node.
 * - Styling uses ClassMap tokens (`primary`, `surface`,
 *   `--color-border-secondary`) — it only looks right under the Tailwind
 *   ClassMap bond with the molecule base theme; presence dots are fixed
 *   green/amber/grey hex colors.
 * - The unread pip's accessible label defaults to English "N unread" — pass
 *   `unreadAriaLabel` (via `t()`) in localized apps; the component has no
 *   companion locale bond.
 * - `timestamp` renders verbatim — pre-format ("2m", "Yesterday") yourself.
 * - Node props are projected content: `[slot=name]`, `[slot=preview]`,
 *   `[slot=timestamp]`; a `TemplateRef` input works too, and a plain string or
 *   number renders as text.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { MessagePreview } from '@molecule/app-message-preview-angular'
 *
 * @Component({
 *   selector: 'app-thread-list',
 *   standalone: true,
 *   imports: [MessagePreview],
 *   template: `
 *     <mol-message-preview
 *       name="Maya Patel"
 *       preview="Thanks! That fixed it."
 *       timestamp="2m"
 *       [unread]="3"
 *       presence="online"
 *       channelIcon="mail"
 *       [active]="activeThreadId === 't1'"
 *       to="/conversation/t1"
 *     ></mol-message-preview>
 *   `,
 * })
 * export class ThreadList {
 *   activeThreadId = 't1'
 * }
 * ```
 *
 * @module
 */

export * from './message-preview.component.js'
export * from './types.js'
