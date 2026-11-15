/**
 * Solid click-to-edit inline field.
 *
 * Exports `InlineEdit` — the Solid counterpart of
 * `@molecule/app-inline-edit-react` with the same props and the same DOM: the
 * value rendered as text, with a click (or Tab + Enter) swapping in an
 * `<Input>` or `<Textarea>` plus Save/Cancel buttons. Enter submits
 * (Cmd/Ctrl+Enter for the textarea variant), Escape cancels.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { InlineEdit } from '@molecule/app-inline-edit-solid'
 *
 * export function DealTitle() {
 *   const [title, setTitle] = createSignal('Acme renewal')
 *   return (
 *     <InlineEdit
 *       value={title()}
 *       onSubmit={async (next) => { setTitle(next) }}
 *       placeholder="Enter deal title"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and
 *   `@molecule/app-solid`'s i18n provider (`useTranslation()` throws without
 *   it); button labels come from the `@molecule/app-locales-inline-edit`
 *   companion bond.
 * - Return a Promise from `onSubmit` to disable the buttons while saving.
 *   If `onSubmit` REJECTS, the editor stays open with the draft intact but
 *   the error is not displayed — catch and surface errors inside your
 *   `onSubmit` (toast, form error, etc.).
 * - The draft re-syncs from `value` whenever the prop changes, including
 *   mid-edit — avoid mutating `value` while the user is typing.
 *
 * @module
 */

export * from './InlineEdit.jsx'
export * from './types.js'
