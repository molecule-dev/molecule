/**
 * ConfirmDialog — re-exported from the framework bundle.
 *
 * The component was PROMOTED to `@molecule/app-ui-react` (2026-09-24) so
 * every app can confirm destructive actions without installing this feature
 * package. This re-export keeps `@molecule/app-danger-zone-react`'s public
 * API stable; prefer importing it from `@molecule/app-ui-react` directly.
 *
 * Contract (unchanged): the dialog does NOT track `onConfirm`'s promise and
 * does NOT close itself on confirm — set `loading` yourself while the action
 * runs, then call `onClose()` when it settles. Cancel/Confirm fall back to
 * the `confirm.*` i18n keys (companion bond:
 * `@molecule/app-locales-danger-zone`); pass `confirmLabel`/`cancelLabel`
 * for action-specific wording. `destructive` (default true) only switches
 * the confirm button color.
 *
 * @module
 */

export { ConfirmDialog, type ConfirmDialogProps } from '@molecule/app-ui-react'
