import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-react'

interface ConfirmDialogProps {
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
  /** When true, disables confirm while its Promise is pending. */
  loading?: boolean
}

/**
 * Are-you-sure-style confirmation modal for destructive actions.
 *
 * Use standalone (around delete buttons, revoke tokens, irreversible
 * migrations) or wrap DangerZoneSection's action with this dialog.
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.title
 * @param root0.description
 * @param root0.confirmLabel
 * @param root0.cancelLabel
 * @param root0.onConfirm
 * @param root0.destructive
 * @param root0.children
 * @param root0.loading
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
}: ConfirmDialogProps) {
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
