/**
 * PromptDialog component — the shared "ask for a short string" modal.
 *
 * Vue port of `@molecule/app-ui-react`'s PromptDialog (see that source for
 * the design notes, including the multi-stage-flow gotcha). Composes the
 * ported {@link Modal}, {@link Input} and {@link Button}. A fulfilled
 * `onSubmit` resolves, re-enables the form and closes; a rejection or a
 * synchronous throw keeps the dialog open with the value intact (the caller
 * renders the error itself).
 *
 * @example
 * ```ts
 * import { PromptDialog } from '@molecule/app-ui-vue'
 * ```
 *
 * @module
 */

import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  type PropType,
  ref,
  useId,
  type VNodeChild,
  watch,
} from 'vue'

import { domElement } from '@molecule/app-overlay-dom'
import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { Button } from './Button.js'
import { Input } from './Input.js'
import { Modal } from './Modal.js'

/**
 * Props for {@link PromptDialog}.
 *
 * Vue port of `@molecule/app-ui-react`'s `PromptDialogProps`: React's
 * `ReactNode` members are nodes, the extra body content under the input is
 * the default slot, and `onClose` is the `close` emit — optional, like every
 * Vue listener. `onSubmit` stays a prop because the dialog AWAITS its return
 * to decide whether to close.
 */
export interface PromptDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel, or a fulfilled submit). */
  onClose?: () => void
  /** Dialog heading. */
  title?: VNodeChild
  /** Explanatory line under the title. */
  description?: VNodeChild
  /** Input placeholder. */
  placeholder?: string
  /** Value the input starts from every time the dialog opens. */
  initialValue?: string
  /**
   * Called with the entered value on confirm. Resolve to close the dialog;
   * reject or throw to keep it open (show the error via `children`).
   */
  onSubmit?: (value: string) => void | Promise<void>
  /** Confirm-button label. Falls back to a localized "Confirm". */
  confirmLabel?: VNodeChild
  /** Cancel-button label. Falls back to a localized "Cancel". */
  cancelLabel?: VNodeChild
  /** Render the confirm button in the error color. */
  destructive?: boolean
  /** `data-mol-id` for the text input. */
  inputMolId?: string
  /** `data-mol-id` for the confirm button. */
  confirmMolId?: string
  /** `data-mol-id` for the cancel button. */
  cancelMolId?: string
  /** Extra body content under the input (the default slot). */
  children?: VNodeChild
}

/**
 * Modal that asks the user for a short string, replacing `window.prompt`:
 * title, optional description, a seeded text input and a cancel/confirm
 * footer inside a form.
 *
 * @param props - Component props (open/onClose/title/description/placeholder/
 * initialValue/onSubmit/confirmLabel/cancelLabel/destructive/
 * inputMolId/confirmMolId/cancelMolId).
 */
export const PromptDialog = defineComponent({
  name: 'MPromptDialog',
  inheritAttrs: false,
  props: {
    /** Whether the dialog is open. */
    open: {
      type: Boolean as PropType<PromptDialogProps['open']>,
      required: true,
    },
    /** Dialog heading. */
    title: null,
    /** Explanatory line under the title. */
    description: null,
    /** Input placeholder. */
    placeholder: String as PropType<PromptDialogProps['placeholder']>,
    /** Value the input starts from every time the dialog opens. */
    initialValue: {
      type: String as PropType<PromptDialogProps['initialValue']>,
      default: '',
    },
    /**
     * Called with the entered value on confirm. Unlike the other callbacks
     * this one is declared as a plain prop (not an emit) because the dialog
     * AWAITS its return: resolve to close, reject or throw to stay open.
     */
    onSubmit: {
      type: Function as PropType<PromptDialogProps['onSubmit']>,
      default: undefined,
    },
    /** Confirm-button label. Falls back to a localized "Confirm". */
    confirmLabel: null,
    /** Cancel-button label. Falls back to a localized "Cancel". */
    cancelLabel: null,
    /** Render the confirm button in the error color. */
    destructive: {
      type: Boolean as PropType<PromptDialogProps['destructive']>,
      default: false,
    },
    /** `data-mol-id` for the text input. */
    inputMolId: String as PropType<PromptDialogProps['inputMolId']>,
    /** `data-mol-id` for the confirm button. */
    confirmMolId: String as PropType<PromptDialogProps['confirmMolId']>,
    /** `data-mol-id` for the cancel button. */
    cancelMolId: String as PropType<PromptDialogProps['cancelMolId']>,
  },
  emits: ['close'],
  setup(props, { slots, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const value = ref(props.initialValue)
    const pending = ref(false)
    // The dialog names itself with its visible title and, when rendered, its
    // description (WAI-ARIA dialog pattern): the ids reach the dialog element
    // through Modal's `aria-*` pass-through, so screen readers announce
    // "Rename board — The slug updates automatically." instead of an unnamed
    // dialog (axe `aria-dialog-name`).
    const titleId = useId()
    const descriptionId = useId()
    // Modal reads the native input when its portal is ready to take focus.
    const inputRef = ref<ComponentPublicInstance | null>(null)
    const inputTarget: OverlayTarget = {
      /** The input exposed by the binding's Input component. */
      get current() {
        return domElement(inputRef.value?.$el)
      },
    }

    // Re-seed from initialValue each open so a reopened dialog shows the
    // CURRENT value, not whatever the user typed last time.
    watch([() => props.open, () => props.initialValue], ([open]) => {
      if (open) {
        value.value = props.initialValue
        pending.value = false
      }
    })

    const handleSubmit = async (e: Event): Promise<void> => {
      e.preventDefault()
      if (pending.value) return
      pending.value = true
      try {
        await props.onSubmit?.(value.value)
        // A parent that keeps the dialog open (a multi-stage flow advancing
        // in onClose) gets a form that accepts the next submit.
        pending.value = false
        emit('close')
      } catch (_error) {
        // Deliberate: a rejection or a synchronous throw keeps the dialog
        // open; the caller owns the error and renders it through the default
        // slot, so re-displaying or logging it here would duplicate that.
        pending.value = false
      }
    }

    return () => {
      const title = props.title ?? slots.title?.()
      const description = props.description ?? slots.description?.()
      const confirmLabel = props.confirmLabel ?? slots.confirmLabel?.()
      const cancelLabel = props.cancelLabel ?? slots.cancelLabel?.()
      const children = slots.default?.()
      // A title that renders nothing (React's `slot(title)`: no prop, an empty
      // slot, a false `v-if`) names nothing, so the dialog points at no heading.
      const headingId = toChildArray(title).length > 0 ? titleId : undefined
      const hasDescription = toChildArray(description).length > 0

      return h(
        Modal,
        {
          open: props.open,
          initialFocus: inputTarget,
          'aria-labelledby': headingId,
          'aria-describedby': hasDescription ? descriptionId : undefined,
          onClose: () => {
            if (!pending.value) emit('close')
          },
        },
        {
          default: () => [
            h('form', { onSubmit: handleSubmit }, [
              h('div', { class: cm.stack(3) }, [
                h('h2', { id: headingId, class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, [
                  title,
                ]),
                hasDescription
                  ? h('p', { id: descriptionId, class: cm.textSize('sm') }, [description])
                  : null,
                h(Input, {
                  ref: inputRef,
                  value: value.value,
                  onChange: (e: Event) => {
                    value.value = (e.target as HTMLInputElement).value
                  },
                  placeholder: props.placeholder,
                  'aria-label': typeof props.title === 'string' ? props.title : props.placeholder,
                  disabled: pending.value,
                  'data-mol-id': props.inputMolId,
                }),
                children,
                h('div', { class: cm.flex({ justify: 'end', gap: 'sm' }) }, [
                  h(
                    Button,
                    {
                      type: 'button',
                      variant: 'ghost',
                      disabled: pending.value,
                      onClick: (event: MouseEvent) => emit('close', event),
                      'data-mol-id': props.cancelMolId,
                    },
                    {
                      default: () => [
                        cancelLabel ?? t('prompt.cancel', {}, { defaultValue: 'Cancel' }),
                      ],
                    },
                  ),
                  h(
                    Button,
                    {
                      type: 'submit',
                      variant: 'solid',
                      color: props.destructive ? 'error' : 'primary',
                      disabled: pending.value,
                      'data-mol-id': props.confirmMolId,
                    },
                    {
                      default: () => [
                        confirmLabel ?? t('prompt.confirm', {}, { defaultValue: 'Confirm' }),
                      ],
                    },
                  ),
                ]),
              ]),
            ]),
          ],
        },
      )
    }
  },
})
