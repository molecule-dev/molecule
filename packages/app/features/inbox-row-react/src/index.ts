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
 * @module
 */

export * from './InboxRow.js'
