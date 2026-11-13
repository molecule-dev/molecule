/**
 * Inbox / email message list row.
 *
 * Exports `<InboxRow>`.
 *
 * @example
 * ```tsx
 * import { InboxRow } from '@molecule/app-inbox-row-react'
 *
 * <InboxRow
 *   sender="Alice Johnson"
 *   senderAvatarSrc="https://example.com/alice.jpg"
 *   subject="Q3 report is ready"
 *   preview="Hi, I've attached the final numbers for review..."
 *   timestamp="10:42 AM"
 *   unread={true}
 *   starred={false}
 *   hasAttachment={true}
 *   onClick={() => openMessage(msg.id)}
 *   onToggleStar={() => toggleStar(msg.id)}
 * />
 * ```
 *
 * @remarks
 * - Star/attachment indicators use fixed colors and emoji. Their aria-labels
 *   ("Star"/"Unstar"/"Has attachment") route through `t()` under `inboxRow.*`,
 *   translated by the `@molecule/app-locales-inbox-row` companion bond.
 * - When `sender` is not a plain string, the avatar's accessible name falls
 *   back to the translated "Sender" (`inboxRow.sender`) — pass a string
 *   `sender` (or your own `selectionSlot`) when screen-reader naming matters.
 * - `unread` bolds the row via an inline `fontWeight: 600` and renders a
 *   fixed blue dot — the dot color does not follow the theme.
 * - `getClassMap()` requires a bonded ClassMap; `<Avatar>` comes from
 *   `@molecule/app-ui-react`.
 *
 * @module
 */

export * from './InboxRow.js'
