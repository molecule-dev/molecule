/**
 * React destructive-action primitives.
 *
 * Exports:
 * - `<DangerZoneSection>` — Card with title/description/button for delete/reset/revoke.
 * - `<ConfirmDialog>` — standalone "Are you sure?" modal.
 *
 * @example
 * ```tsx
 * import { ConfirmDialog, DangerZoneSection } from '@molecule/app-danger-zone-react'
 *
 * <DangerZoneSection
 *   title="Delete account"
 *   description="This permanently removes your account and all data."
 *   actionLabel="Delete account"
 *   onAction={() => setConfirmOpen(true)}
 * />
 *
 * <ConfirmDialog
 *   open={confirmOpen}
 *   onClose={() => setConfirmOpen(false)}
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

export * from './ConfirmDialog.js'
export * from './DangerZoneSection.js'
