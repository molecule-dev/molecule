/**
 * Click-to-edit inline field. Renders the value as text; on click (or
 * Tab + Enter) swaps in an `<Input>` or `<Textarea>` with Save/Cancel
 * buttons. Enter submits (Cmd/Ctrl+Enter for the textarea variant),
 * Escape cancels.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { patch } from '@molecule/app-http'
 * import { InlineEdit } from '@molecule/app-inline-edit-react'
 *
 * export function DealTitle({ dealId, initialTitle }: { dealId: string; initialTitle: string }) {
 *   const [title, setTitle] = useState(initialTitle)
 *   const [error, setError] = useState<string | null>(null)
 *
 *   async function save(next: string): Promise<void> {
 *     setError(null)
 *     try {
 *       await patch(`/deals/${dealId}`, { title: next })
 *       setTitle(next)
 *     } catch (err) {
 *       // Don't rethrow: InlineEdit never catches it (unhandled rejection). The editor
 *       // closes showing the unchanged title, and the error explains why.
 *       setError(err instanceof Error ? err.message : String(err))
 *     }
 *   }
 *
 *   return (
 *     <>
 *       <InlineEdit value={title} onSubmit={save} placeholder="Deal title" />
 *       {error && <p role="alert">{error}</p>}
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()`
 *   THROWS without it) and a bonded ClassMap; button labels come from the
 *   `@molecule/app-locales-inline-edit` companion bond.
 * - It does NOT persist or update anything: `value` is controlled — save in
 *   `onSubmit` (through `@molecule/app-http`) and then update the state you
 *   pass as `value`, or the old text comes back when the editor closes.
 * - Return a Promise from `onSubmit` to disable the buttons ("Saving…") while
 *   saving; the editor closes when it resolves. If `onSubmit` REJECTS, the
 *   editor stays open with the draft intact but the error is neither shown
 *   nor caught (an unhandled rejection) — catch inside `onSubmit` and surface
 *   the error yourself.
 * - `placeholder` doubles as the editor's aria-label (fallback: English
 *   "Edit"). Enter saves in the `input` variant; the `textarea` variant needs
 *   Cmd/Ctrl+Enter. Saving an unchanged value still calls `onSubmit`.
 * - The draft re-syncs from `value` whenever the prop changes, including
 *   mid-edit — avoid mutating `value` while the user is typing.
 *
 * @module
 */

export * from './InlineEdit.js'
