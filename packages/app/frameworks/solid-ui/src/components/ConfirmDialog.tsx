/**
 * ConfirmDialog component — the shared "Are you sure?" modal.
 *
 * For an INLINE two-click arm/commit affordance use {@link ConfirmButton};
 * for a dialog that also collects text use {@link PromptDialog}.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.jsx'
import { Modal } from './Modal.jsx'

/** Props for {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose: () => void
  /** Title. */
  title: JSX.Element
  /** Body / warning text. */
  description: JSX.Element
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: JSX.Element
  /** Cancel-button label. */
  cancelLabel?: JSX.Element
  /** Called when the user confirms. */
  onConfirm: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer. */
  children?: JSX.Element
  /**
   * Disables both buttons. Set it yourself while your `onConfirm` promise is
   * pending — the dialog does not track it and does not auto-close.
   */
  loading?: boolean
}

/**
 * Are-you-sure-style confirmation modal for destructive actions.
 *
 * @param props - Component props (see {@link ConfirmDialogProps}).
 * @returns The rendered confirmation dialog.
 */
export const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
  const [local] = splitProps(props, [
    'open',
    'onClose',
    'title',
    'description',
    'confirmLabel',
    'cancelLabel',
    'onConfirm',
    'destructive',
    'children',
    'loading',
  ])
  const cm = getClassMap()

  return (
    <Modal open={local.open} onClose={local.onClose}>
      <div class={cm.stack(3)}>
        <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{local.title}</h2>
        <p class={cm.textSize('sm')}>{local.description}</p>
        {local.children}
        <div class={cm.flex({ justify: 'end', gap: 'sm' })}>
          <Button variant="ghost" onClick={local.onClose} disabled={local.loading}>
            {local.cancelLabel ?? t('confirm.cancel', {}, { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="solid"
            color={(local.destructive ?? true) ? 'error' : 'primary'}
            onClick={() => void local.onConfirm()}
            disabled={local.loading}
          >
            {local.loading
              ? '…'
              : (local.confirmLabel ?? t('confirm.confirm', {}, { defaultValue: 'Confirm' }))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
