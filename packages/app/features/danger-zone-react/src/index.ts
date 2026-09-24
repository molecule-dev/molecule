/**
 * React destructive-action primitives.
 *
 * Exports:
 * - `<DangerZoneSection>` — Card with title/description/button for delete/reset/revoke.
 * - `<ConfirmDialog>` — standalone "Are you sure?" modal.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ConfirmDialog, DangerZoneSection } from '@molecule/app-danger-zone-react'
 * import { del } from '@molecule/app-http'
 * import { useTranslation } from '@molecule/app-react'
 *
 * export function DeleteAccountSection() {
 *   const { t } = useTranslation()
 *   const [open, setOpen] = useState(false)
 *   const [busy, setBusy] = useState(false)
 *   const [error, setError] = useState<string | null>(null)
 *   async function deleteAccount(): Promise<void> {
 *     setBusy(true)
 *     try {
 *       await del('/account')
 *       setOpen(false)
 *     } catch (_err) {
 *       // The failure is surfaced to the user via `error` state below.
 *       setError(t('settings.failedToDeleteAccount', undefined, { defaultValue: 'Failed to delete account.' }))
 *     } finally {
 *       setBusy(false)
 *     }
 *   }
 *   return (
 *     <>
 *       <DangerZoneSection
 *         title={t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
 *         description="This permanently removes your account and all data."
 *         actionLabel={t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
 *         onAction={() => setOpen(true)}
 *         dataMolId="delete-account"
 *       />
 *       <ConfirmDialog
 *         open={open}
 *         onClose={() => setOpen(false)}
 *         title={t('settings.deleteAccountModal.title', undefined, { defaultValue: 'Delete Account' })}
 *         description="This action cannot be undone."
 *         confirmLabel={t('common.delete', undefined, { defaultValue: 'Delete' })}
 *         onConfirm={deleteAccount}
 *         loading={busy}
 *       >
 *         {error && <p role="alert">{error}</p>}
 *       </ConfirmDialog>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Neither component performs the destructive action — `onConfirm` is where you call your API
 *   (through `@molecule/app-http`). `<DangerZoneSection>` does NOT open the dialog itself:
 *   wire `onAction` to your own `open` state.
 * - `<ConfirmDialog>` does NOT track `onConfirm`'s promise and does NOT close itself on
 *   confirm: set `loading` yourself while the action runs, then close it when it settles —
 *   otherwise users can double-fire the destructive action or be left staring at an open
 *   dialog. A rejected `onConfirm` promise is NOT caught for you — catch it and show the error
 *   (e.g. as `children`).
 * - `<ConfirmDialog>` calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 *   inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); both call
 *   `getClassMap()`, which throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at
 *   startup. `Card`/`Button`/`Modal` come from `@molecule/app-ui-react` (a peer dependency);
 *   the dialog renders in a `document.body` portal. The `Modal`'s close icon also needs an
 *   icon set bonded at startup (`setIconSet(iconSet)` from `@molecule/app-icons` +
 *   `@molecule/app-icons-molecule`) — opening the dialog throws without it.
 * - Cancel/Confirm fall back to the `confirm.*` i18n keys (companion bond:
 *   `@molecule/app-locales-danger-zone`); pass `confirmLabel`/`cancelLabel` for
 *   action-specific wording ("Delete", "Revoke"). `destructive` (default true) only switches the
 *   confirm button color. While `loading`, buttons show a bare `…`.
 *
 * @module
 */

export * from './ConfirmDialog.js'
export * from './DangerZoneSection.js'
