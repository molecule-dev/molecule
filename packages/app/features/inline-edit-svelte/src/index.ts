/**
 * Svelte click-to-edit inline field.
 *
 * Exports `InlineEdit` — the Svelte counterpart of `@molecule/app-inline-edit-react`
 * with the same props and the same DOM: the value rendered as text, with a
 * click (or Tab + Enter) swapping in an `<Input>` or `<Textarea>` plus
 * Save/Cancel buttons. Enter submits (Cmd/Ctrl+Enter for the textarea
 * variant), Escape cancels.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { InlineEdit } from '@molecule/app-inline-edit-svelte'
 *
 *   let title = $state('Acme renewal')
 * </script>
 *
 * <InlineEdit
 *   value={title}
 *   onSubmit={async (next) => {
 *     title = next
 *   }}
 *   placeholder="Enter deal title"
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and an
 *   `@molecule/app-svelte` i18n provider above it (`useTranslation()` throws
 *   without it); button labels come from the
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

export * from './components.js'
export * from './types.js'
