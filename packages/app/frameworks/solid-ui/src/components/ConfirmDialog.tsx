/**
 * ConfirmDialog component — the shared "Are you sure?" modal.
 *
 * For an INLINE two-click arm/commit affordance use {@link ConfirmButton};
 * for a dialog that also collects text use {@link PromptDialog}.
 *
 * @module
 */

import { type Component, createUniqueId, type JSX, splitProps } from 'solid-js'

import { createNodePresence, ResolveNode, useTranslation } from '@molecule/app-solid'
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
  const { t } = useTranslation()
  // The dialog names itself with its visible title and, when rendered, its
  // description (WAI-ARIA dialog pattern): the ids reach the dialog element
  // through Modal's `aria-*` pass-through, so screen readers announce the
  // title and description instead of an unnamed dialog (axe
  // `aria-dialog-name`).
  const titleId = createUniqueId()
  const descriptionId = createUniqueId()
  // A title that renders nothing (React's `slot(title)`) names nothing, so the
  // dialog then points at no heading. Both nodes resolve inside Modal's open
  // branch, so they are created only while the dialog shows.
  const title = createNodePresence()
  const description = createNodePresence()

  return (
    <Modal
      open={local.open}
      onClose={local.onClose}
      aria-labelledby={title.present() ? titleId : undefined}
      aria-describedby={description.present() ? descriptionId : undefined}
    >
      <div class={cm.stack(3)}>
        <ResolveNode node={local.title}>
          {(node, present) => {
            title.report(present)
            return (
              <h2
                id={present() ? titleId : undefined}
                class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
              >
                {node()}
              </h2>
            )
          }}
        </ResolveNode>
        <ResolveNode node={local.description}>
          {(node, present) => {
            description.report(present)
            return (
              <p id={descriptionId} class={cm.textSize('sm')}>
                {node()}
              </p>
            )
          }}
        </ResolveNode>
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
