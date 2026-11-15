/**
 * Vue destructive-action primitives.
 *
 * Exports `<DangerZoneSection>` — Card with title/description/button for
 * delete/reset/revoke — and `<ConfirmDialog>`, the standalone "Are you
 * sure?" modal. It is the Vue counterpart of
 * `@molecule/app-danger-zone-react`: the same props and the same DOM for the
 * same input, so an app can switch framework by changing only the package
 * name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { ConfirmDialog, DangerZoneSection } from '@molecule/app-danger-zone-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const confirmOpen = ref(false)
 *     return () => [
 *       h(DangerZoneSection, {
 *         title: 'Delete account',
 *         description: 'This permanently removes your account and all data.',
 *         actionLabel: 'Delete account',
 *         onAction: () => {
 *           confirmOpen.value = true
 *         },
 *       }),
 *       h(ConfirmDialog, {
 *         open: confirmOpen.value,
 *         onClose: () => {
 *           confirmOpen.value = false
 *         },
 *         title: 'Delete account?',
 *         description: 'This action cannot be undone.',
 *         confirmLabel: 'Delete',
 *         onConfirm: handleDelete,
 *       }),
 *     ]
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * `<ConfirmDialog>` does NOT track `onConfirm`'s promise and does NOT close
 * itself on confirm: set `loading` yourself while the action runs, then call
 * `onClose()` when it settles — otherwise users can double-fire the
 * destructive action or be left staring at an open dialog. Cancel/Confirm
 * fall back to the `confirm.*` i18n keys (companion bond:
 * `@molecule/app-locales-danger-zone`); pass `confirmLabel`/`cancelLabel`
 * for action-specific wording ("Delete", "Revoke"). `destructive` (default
 * true) only switches the confirm button color.
 *
 * @module
 */

export * from './ConfirmDialog.js'
export * from './DangerZoneSection.js'
export * from './types.js'
