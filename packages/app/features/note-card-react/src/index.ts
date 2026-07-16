/**
 * Sticky-note style card.
 *
 * Exports `<NoteCard>`.
 *
 * @example
 * ```tsx
 * import { NoteCard } from '@molecule/app-note-card-react'
 *
 * declare function openNote(): void
 *
 * <NoteCard
 *   title="Meeting notes"
 *   body="Follow up with design team on the new dashboard layout."
 *   color="#fef9c3"
 *   pinned
 *   modifiedAt="Jun 5, 2026"
 *   onClick={openNote}
 * />
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
 * `onClick` makes the whole card clickable but renders no button
 * semantics — supply your own focus/keyboard affordance (or wrap the
 * card in a button/link) when click-to-open matters for a11y.
 *
 * @module
 */

export * from './NoteCard.js'
