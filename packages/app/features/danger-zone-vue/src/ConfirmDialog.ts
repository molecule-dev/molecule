/**
 * ConfirmDialog — re-exported from the framework bundle.
 *
 * The Vue port lives in `@molecule/app-ui-vue` (like React's, which lives in
 * `@molecule/app-ui-react` after its 2026-09-24 promotion), so every Vue app
 * can confirm destructive actions without installing this feature package.
 * This re-export keeps `@molecule/app-danger-zone-vue`'s public API aligned
 * with `@molecule/app-danger-zone-react`; prefer importing it from
 * `@molecule/app-ui-vue` directly.
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

export type { ConfirmDialogProps } from './types.js'
export { ConfirmDialog } from '@molecule/app-ui-vue'
