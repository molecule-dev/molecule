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
 * - `to` renders a `react-router` `<Link>` — it THROWS without a `<Router>` ancestor
 *   (`react-router` is a peer dependency); omit `to` (use `onClick`) in router-less apps.
 * - It is one row, display-only: no data fetching, no unread tracking, and `active` is not
 *   derived from the URL — compute it yourself (e.g. from the route param).
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
 * const threads = [
 *   { id: 't1', name: 'Maya Patel', lastMessage: 'Thanks! That fixed it.', ago: '2m', unread: 3, presence: 'online', channel: 'mail' },
 *   { id: 't2', name: 'Jon Okafor', lastMessage: 'Can we move the call to 3pm?', ago: '1h', unread: 0, presence: 'away', channel: 'chat' },
 * ] as const
 *
 * // Renders inside the app's react-router <Router> (required by `to`).
 * export function InboxSidebar({ activeId }: { activeId?: string }) {
 *   return (
 *     <nav>
 *       {threads.map((thread) => (
 *         <MessagePreview
 *           key={thread.id}
 *           name={thread.name}
 *           preview={thread.lastMessage}
 *           timestamp={thread.ago}
 *           unread={thread.unread}
 *           presence={thread.presence}
 *           channelIcon={thread.channel}
 *           active={thread.id === activeId}
 *           to={`/conversations/${thread.id}`}
 *         />
 *       ))}
 *     </nav>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './MessagePreview.js'
