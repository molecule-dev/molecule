/**
 * Sticky Save/Cancel bar with "Saved" timestamp + loading state for settings
 * and form pages.
 *
 * Exports `<SettingsActionsBar>`. Props: `onSave` (required; sync or async),
 * `onCancel?` (Cancel hidden when omitted), `loading?` (disables Save and
 * shows "Saving…"), `disabled?`, `savedAt?` (epoch ms → "Saved 3m ago"),
 * `error?` (inline node, as a prop or the `error` slot), `sticky?`
 * (default true), `leading?` (slot/prop before the status), `className?`.
 *
 * This is the Vue counterpart of `@molecule/app-settings-actions-bar-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { SettingsActionsBar } from '@molecule/app-settings-actions-bar-vue'
 *
 * const ProfileActions = defineComponent({
 *   setup() {
 *     const saving = ref(false)
 *     const savedAt = ref<number | null>(null)
 *     const save = async (): Promise<void> => {
 *       saving.value = true
 *       try {
 *         await api.saveProfile()
 *         savedAt.value = Date.now()
 *       } finally {
 *         saving.value = false
 *       }
 *     }
 *     return () =>
 *       h(SettingsActionsBar, {
 *         onSave: save,
 *         onCancel: () => resetForm(),
 *         loading: saving.value,
 *         savedAt: savedAt.value,
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - The bar ships with an opaque theme surface (`cm.surface`) + top border
 *   (`cm.borderT`), so when `sticky` is on, page content no longer shows
 *   through it while scrolling. Pass `className` to layer on more styling.
 * - The "Saved …" time is English-shorthand ("3m ago"), computed once per
 *   render — it does not tick while mounted; re-render (or bump `savedAt`)
 *   to refresh it.
 * - `error` renders as plain unstyled text — style/color the node yourself.
 * - Throws unless inside an app with a bonded ClassMap and i18n provider.
 *   Translations: `@molecule/app-locales-settings-actions-bar`.
 *
 * @module
 */

export * from './SettingsActionsBar.js'
export * from './types.js'
