/**
 * Svelte destructive-action primitives — the counterpart of
 * `@molecule/app-danger-zone-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<DangerZoneSection>` — Card with title/description/button for
 * delete/reset/revoke — and `<ConfirmDialog>`, the standalone "Are you
 * sure?" modal.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ConfirmDialog, DangerZoneSection } from '@molecule/app-danger-zone-svelte'
 *
 *   let confirmOpen = $state(false)
 * </script>
 *
 * <DangerZoneSection
 *   title="Delete account"
 *   description="This permanently removes your account and all data."
 *   actionLabel="Delete account"
 *   onAction={() => (confirmOpen = true)}
 * />
 *
 * <ConfirmDialog
 *   open={confirmOpen}
 *   onClose={() => (confirmOpen = false)}
 *   title="Delete account?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 * />
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

export * from './components.js'
export * from './types.js'
