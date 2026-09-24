/**
 * ConfirmDialog component — the shared "Are you sure?" modal.
 *
 * Promoted from `@molecule/app-danger-zone-react` (2026-09-24) so every app
 * confirms destructive actions through the framework bundle instead of
 * hand-rolling `window.confirm` (broken headless + on touch) or reaching for
 * the danger-zone feature package just to render one dialog. For an INLINE
 * two-click arm/commit affordance use {@link ConfirmButton}; for a dialog
 * that also collects text use {@link PromptDialog}.
 *
 * @example
 * ```tsx
 * import { ConfirmDialog } from '@molecule/app-ui-react'
 *
 * <ConfirmDialog
 *   open={confirmOpen}
 *   onClose={() => setConfirmOpen(false)}
 *   title="Delete vault?"
 *   description="This action cannot be undone."
 *   confirmLabel={t('vault.delete', {}, { defaultValue: 'Delete' })}
 *   onConfirm={handleDelete}
 * />
 * ```
 *
 * @remarks
 * Does NOT track `onConfirm`'s promise and does NOT close itself on confirm:
 * set `loading` yourself while the action runs, then call `onClose()` when it
 * settles — otherwise users can double-fire the destructive action or be left
 * staring at an open dialog. Cancel/Confirm fall back to the `confirm.*`
 * i18n keys (companion bond: `@molecule/app-locales-danger-zone`); pass
 * `confirmLabel`/`cancelLabel` for action-specific wording ("Delete",
 * "Revoke"). `destructive` (default true) only switches the confirm button
 * color. `data-mol-id` for e2e locators goes on YOUR trigger button; the
 * dialog's own buttons are text-labeled ("Cancel"/confirm label) so
 * `getByRole('button', { name })` reaches them.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.js'
import { Modal } from './Modal.js'

/** Props for {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose: () => void
  /** Title. */
  title: ReactNode
  /** Body / warning text. */
  description: ReactNode
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: ReactNode
  /** Cancel-button label. */
  cancelLabel?: ReactNode
  /** Called when the user confirms. */
  onConfirm: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer. */
  children?: ReactNode
  /** Disables both buttons. Set it yourself while your `onConfirm` promise is pending — the dialog does not track it and does not auto-close. */
  loading?: boolean
}

/**
 * Are-you-sure-style confirmation modal for destructive actions.
 *
 * Use standalone (around delete buttons, revoke tokens, irreversible
 * migrations) or with a DangerZoneSection action.
 * @param props - Component props (see {@link ConfirmDialogProps}).
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  children,
  loading,
}: ConfirmDialogProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose}>
      <div className={cm.stack(3)}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h2>
        <p className={cm.textSize('sm')}>{description}</p>
        {children}
        <div className={cm.flex({ justify: 'end', gap: 'sm' })}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel ?? t('confirm.cancel', {}, { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="solid"
            color={destructive ? 'error' : 'primary'}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading
              ? '…'
              : (confirmLabel ?? t('confirm.confirm', {}, { defaultValue: 'Confirm' }))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
