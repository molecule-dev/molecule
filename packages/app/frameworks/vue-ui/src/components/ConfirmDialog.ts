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

import { defineComponent, h } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { useTranslation } from '../hooks/useTranslation.js'
import { Button } from './Button.js'
import { Modal } from './Modal.js'

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
      type: Boolean,
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
      type: Boolean,
      default: true,
    },
    /** Disables both buttons while the caller's confirm action is pending. */
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'confirm'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return () => {
      const title = props.title ?? slots.title?.()
      const description = props.description ?? slots.description?.()
      const confirmLabel = props.confirmLabel ?? slots.confirmLabel?.()
      const cancelLabel = props.cancelLabel ?? slots.cancelLabel?.()
      const children = slots.default?.()

      return h(
        Modal,
        {
          open: props.open,
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
              h('h2', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, [title]),
              h('p', { class: cm.textSize('sm') }, [description]),
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
