/**
 * Click-to-edit inline field. Renders the value as text; on click (or
 * Tab + Enter) swaps in an `<Input>` or `<Textarea>` with Save/Cancel
 * buttons. Enter submits (Cmd/Ctrl+Enter for the textarea variant),
 * Escape cancels.
 *
 * @example
 * ```tsx
 * import { InlineEdit } from '@molecule/app-inline-edit-react'
 *
 * const deal = { title: 'Acme renewal' }
 *
 * <InlineEdit
 *   value={deal.title}
 *   onSubmit={async (next) => { console.log('save', next) }}
 *   placeholder="Enter deal title"
 * />
 * ```
 *
 * @remarks
 * - Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()`
 *   THROWS without it) and a bonded ClassMap; button labels come from the
 *   `@molecule/app-locales-inline-edit` companion bond.
 * - Return a Promise from `onSubmit` to disable the buttons while saving.
 *   If `onSubmit` REJECTS, the editor stays open with the draft intact but
 *   the error is not displayed — catch and surface errors inside your
 *   `onSubmit` (toast, form error, etc.).
 * - The draft re-syncs from `value` whenever the prop changes, including
 *   mid-edit — avoid mutating `value` while the user is typing.
 *
 * @module
 */

export * from './InlineEdit.js'
