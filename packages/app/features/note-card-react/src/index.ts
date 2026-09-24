/**
 * Sticky-note style card.
 *
 * Exports `<NoteCard>`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { NoteCard } from '@molecule/app-note-card-react'
 *
 * interface Note { id: string; title: string; body: string; color: string; pinned: boolean; updatedAt: string }
 *
 * const initialNotes: Note[] = [
 *   { id: 'n1', title: 'Meeting notes', body: 'Follow up with design team\non the new dashboard layout.', color: '#fef9c3', pinned: true, updatedAt: 'Jun 5, 2026' },
 *   { id: 'n2', title: 'Groceries', body: 'Milk, eggs, coffee', color: '#dbeafe', pinned: false, updatedAt: 'Jun 4, 2026' },
 * ]
 *
 * export function NotesBoard() {
 *   const [notes, setNotes] = useState(initialNotes)
 *   const [openId, setOpenId] = useState<string | null>(null)
 *   return (
 *     <section>
 *       {openId && <p>Editing {openId}</p>}
 *       {notes.map((note) => (
 *         <NoteCard
 *           key={note.id}
 *           title={note.title}
 *           body={note.body}
 *           color={note.color}
 *           pinned={note.pinned}
 *           modifiedAt={note.updatedAt}
 *           onClick={() => setOpenId(note.id)}
 *           actions={
 *             <button
 *               type="button"
 *               onClick={(event) => {
 *                 event.stopPropagation() // don't also trigger the card's onClick
 *                 setNotes((prev) => prev.filter((n) => n.id !== note.id))
 *               }}
 *             >
 *               Delete
 *             </button>
 *           }
 *         />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * The card intentionally keeps a paper-sticky-note look in BOTH themes:
 * its text color is fixed near-black, so `color` must be a LIGHT pastel
 * (`#fef9c3`, `#dbeafe`, `#dcfce7`, ...) — a dark `color` value makes
 * the body unreadable. The card does not re-tint with the app theme.
 *
 * `body` renders with `white-space: pre-wrap`, so `\n` line breaks show as-is (no Markdown).
 * Buttons inside `actions` bubble to the card's `onClick` — call `event.stopPropagation()` in
 * them. The card has no editing, persistence or sorting: pinned notes are NOT moved to the top,
 * `pinned` only shows a 📌 marker.
 *
 * `onClick` makes the whole card clickable but renders no button
 * semantics — supply your own focus/keyboard affordance (or wrap the
 * card in a button/link) when click-to-open matters for a11y.
 *
 * @module
 */

export * from './NoteCard.js'
