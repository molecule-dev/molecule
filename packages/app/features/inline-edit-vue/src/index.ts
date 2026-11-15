/**
 * Vue click-to-edit inline field.
 *
 * Exports `<InlineEdit>` — the value rendered as text, with a click (or Tab +
 * Enter) swapping in an `<Input>` or `<Textarea>` plus Save/Cancel buttons.
 * Enter submits (Cmd/Ctrl+Enter for the textarea variant), Escape cancels. It
 * is the Vue counterpart of `@molecule/app-inline-edit-react`: the same props
 * (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { InlineEdit } from '@molecule/app-inline-edit-vue'
 *
 * const Deal = defineComponent({
 *   setup() {
 *     const title = ref('Acme renewal')
 *     return () =>
 *       h(InlineEdit, {
 *         value: title.value,
 *         onSubmit: async (next: string) => {
 *           title.value = next
 *         },
 *         placeholder: 'Enter deal title',
 *       })
 *   },
 * })
 *
 * createApp(Deal).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and
 *   `@molecule/app-vue`'s i18n provider (`useTranslation()` throws without
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

export * from './InlineEdit.js'
export * from './types.js'
