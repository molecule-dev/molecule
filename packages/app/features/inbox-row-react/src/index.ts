/**
 * Inbox / email message list row.
 *
 * Exports `<InboxRow>`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { InboxRow } from '@molecule/app-inbox-row-react'
 *
 * interface Message {
 *   id: string
 *   from: string
 *   subject: string
 *   snippet: string
 *   receivedAt: string
 *   read: boolean
 *   starred: boolean
 *   attachments: number
 * }
 *
 * export function Inbox() {
 *   const [messages, setMessages] = useState<Message[]>([
 *     { id: 'm1', from: 'Alice Johnson', subject: 'Q3 report is ready', snippet: 'Final numbers attached.', receivedAt: '10:42 AM', read: false, starred: false, attachments: 1 },
 *     { id: 'm2', from: 'Bob Lee', subject: 'Lunch?', snippet: 'Tacos at noon?', receivedAt: '9:15 AM', read: true, starred: true, attachments: 0 },
 *   ])
 *   const update = (id: string, patch: Partial<Message>) =>
 *     setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...patch } : m)))
 *   return (
 *     <section>
 *       {messages.map((m) => (
 *         <InboxRow
 *           key={m.id}
 *           sender={m.from}
 *           subject={m.subject}
 *           preview={m.snippet}
 *           timestamp={m.receivedAt}
 *           unread={!m.read}
 *           starred={m.starred}
 *           hasAttachment={m.attachments > 0}
 *           onClick={() => update(m.id, { read: true })}
 *           onToggleStar={() => update(m.id, { starred: !m.starred })}
 *         />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is display-only and fully controlled: clicking does NOT mark the
 *   message read and the star does NOT toggle itself — update your own
 *   `unread` / `starred` state in `onClick` / `onToggleStar` (the star click
 *   does not bubble to `onClick`). The star button renders ONLY when
 *   `onToggleStar` is passed.
 * - The star's aria-label goes through `t('inboxRow.star' | 'inboxRow.unstar')`
 *   with English fallbacks, but no companion locale bond ships those keys yet;
 *   the attachment indicator is a 📎 emoji with a hardcoded English
 *   "Has attachment" label.
 * - When `sender` is not a plain string, the avatar's accessible name falls
 *   back to the literal "Sender" — pass a string `sender` (or your own
 *   `selectionSlot`) when screen-reader naming matters.
 * - `unread` bolds the row via an inline `fontWeight: 600` and renders a
 *   fixed blue dot — the dot color does not follow the theme.
 * - `getClassMap()` requires a bonded ClassMap; `<Avatar>` comes from
 *   `@molecule/app-ui-react`.
 *
 * @module
 */

export * from './InboxRow.js'
