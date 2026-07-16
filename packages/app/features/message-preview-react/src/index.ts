/**
 * `@molecule/app-message-preview-react` — conversation / thread row for chat /
 * inbox sidebars. Initials avatar with presence dot, name + preview + timestamp
 * + unread pip, and an active-selection treatment.
 *
 * Exports `<MessagePreview>` and the `MessagePreviewPresence` type. Props:
 * `name`, `preview`, `timestamp`, `unread?` (0 hides the pip), `presence?`
 * (`'online' | 'away' | 'offline'`), `active?`, `channelIcon?` (Material Symbols
 * ligature name), `initials?` (override the initials derived from `name`),
 * `to?` (render as a router `<Link>`), `onClick?`, `unreadAriaLabel?`,
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
 * - `to` renders a react-router-dom `<Link>` — it requires a `<Router>` ancestor
 *   and the react-router-dom peer; omit `to` (use `onClick`) in router-less apps.
 * - The avatar is initials-only (no image URL prop). Initials are derived from
 *   `name` only when it is a plain string — pass `initials` when `name` is a
 *   ReactNode.
 * - Styling uses Tailwind utility classes + molecule theme tokens (`primary`,
 *   `surface`, `--color-border-secondary`) — it only looks right under the
 *   Tailwind ClassMap bond with the molecule base theme; presence dots are fixed
 *   green/amber/grey hex colors.
 * - The unread pip's accessible label defaults to English "N unread" — pass
 *   `unreadAriaLabel` (via `t()`) in localized apps; the component has no
 *   companion locale bond.
 * - `timestamp` renders verbatim — pre-format ("2m", "Yesterday") yourself.
 *
 * @example
 * ```tsx
 * import { MessagePreview } from '@molecule/app-message-preview-react'
 *
 * <MessagePreview
 *   name="Maya Patel"
 *   preview="Thanks! That fixed it."
 *   timestamp="2m"
 *   unread={3}
 *   presence="online"
 *   channelIcon="mail"
 *   active={activeThreadId === 't1'}
 *   to="/conversation/t1"
 * />
 * ```
 *
 * @module
 */

export * from './MessagePreview.js'
