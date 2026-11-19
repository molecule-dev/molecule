/**
 * ConfirmDialog component — the shared "Are you sure?" modal.
 *
 * Vue port of `@molecule/app-ui-react`'s ConfirmDialog (see that source for
 * the design notes). Composes the ported {@link Modal} and {@link Button};
 * cancel/confirm fall back to the `confirm.*` i18n keys exactly like React.
 *
 * @example
 * ```ts
 * import { ConfirmDialog } from '@molecule/app-ui-vue'
 * ```
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { Button } from './Button.js'
import { Modal } from './Modal.js'

/**
 * Props for {@link ConfirmDialog}.
 *
 * Vue port of `@molecule/app-ui-react`'s `ConfirmDialogProps`: React's
 * `ReactNode` members are nodes, the extra body content is the default slot,
 * and `onClose`/`onConfirm` are the `close`/`confirm` emits — optional, like
 * every Vue listener (React declares them required).
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose?: () => void
  /** Title. */
  title?: VNodeChild
  /** Body / warning text. */
  description?: VNodeChild
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: VNodeChild
  /** Cancel-button label. */
  cancelLabel?: VNodeChild
  /** Called when the user confirms. */
  onConfirm?: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer (the default slot). */
  children?: VNodeChild
  /** Disables both buttons while the caller's confirm action is pending. */
  loading?: boolean
}

/**
 * Are-you-sure-style confirmation modal for destructive actions: a title, a
 * description, optional extra body content and a cancel/confirm footer.
 *
 * Does NOT track `onConfirm`'s promise and does NOT close itself on confirm
 * (set `loading` while the action runs, then close yourself).
 * @param props - Component props (open/onClose/title/description/
 * confirmLabel/cancelLabel/onConfirm/destructive/loading).
 */
export const ConfirmDialog = defineComponent({
  name: 'MConfirmDialog',
  inheritAttrs: false,
  props: {
    /** Whether the dialog is open. */
    open: {
      type: Boolean as PropType<ConfirmDialogProps['open']>,
      required: true,
    },
    /** Title. */
    title: null,
    /** Body / warning text. */
    description: null,
    /** Confirm-button label (e.g. "Delete"). */
    confirmLabel: null,
    /** Cancel-button label. */
    cancelLabel: null,
    /** Is the confirm action destructive? Defaults to true. */
    destructive: {
      type: Boolean as PropType<ConfirmDialogProps['destructive']>,
      default: true,
    },
    /** Disables both buttons while the caller's confirm action is pending. */
    loading: {
      type: Boolean as PropType<ConfirmDialogProps['loading']>,
      default: false,
    },
  },
  emits: ['close', 'confirm'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // The dialog names itself with its visible title and, when rendered, its
    // description (WAI-ARIA dialog pattern): the ids reach the dialog element
    // through Modal's `aria-*` pass-through, so screen readers announce the
    // title and description instead of an unnamed dialog (axe
    // `aria-dialog-name`).
    const titleId = useId()
    const descriptionId = useId()

    return () => {
      const title = props.title ?? slots.title?.()
      const description = props.description ?? slots.description?.()
      const confirmLabel = props.confirmLabel ?? slots.confirmLabel?.()
      const cancelLabel = props.cancelLabel ?? slots.cancelLabel?.()
      const children = slots.default?.()
      // A dialog without a rendered heading must not carry a labelledby that
      // resolves to nothing — omit the name wiring entirely instead.
      const headingId = title != null ? titleId : undefined

      return h(
        Modal,
        {
          open: props.open,
          'aria-labelledby': headingId,
          'aria-describedby': description ? descriptionId : undefined,
          // Modal emits 'close' bare for escape/overlay and with the click
          // event for its chrome button; forward the exact same shape (an
          // extra undefined arg would change the recorded call).
          onClose: (event?: unknown) => {
            if (event === undefined) emit('close')
            else emit('close', event)
          },
        },
        {
          default: () => [
            h('div', { class: cm.stack(3) }, [
              h('h2', { id: headingId, class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, [
                title,
              ]),
              h('p', { id: descriptionId, class: cm.textSize('sm') }, [description]),
              children,
              h('div', { class: cm.flex({ justify: 'end', gap: 'sm' }) }, [
                h(
                  Button,
                  {
                    variant: 'ghost',
                    disabled: props.loading,
                    onClick: (event: MouseEvent) => emit('close', event),
                  },
                  {
                    default: () => [
                      cancelLabel ?? t('confirm.cancel', {}, { defaultValue: 'Cancel' }),
                    ],
                  },
                ),
                h(
                  Button,
                  {
                    variant: 'solid',
                    color: props.destructive ? 'error' : 'primary',
                    disabled: props.loading,
                    onClick: () => emit('confirm'),
                  },
                  {
                    default: () => [
                      props.loading
                        ? '…'
                        : (confirmLabel ?? t('confirm.confirm', {}, { defaultValue: 'Confirm' })),
                    ],
                  },
                ),
              ]),
            ]),
          ],
        },
      )
    }
  },
})
