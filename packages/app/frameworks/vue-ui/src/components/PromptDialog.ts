/**
 * PromptDialog component — the shared "ask for a short string" modal.
 *
 * Vue port of `@molecule/app-ui-react`'s PromptDialog (see that source for
 * the design notes, including the multi-stage-flow gotcha). Composes the
 * ported {@link Modal}, {@link Input} and {@link Button}. A fulfilled
 * `onSubmit` resolves, re-enables the form and closes; a rejection keeps the
 * dialog open with the value intact (the caller renders the error itself).
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
  nextTick,
  type PropType,
  ref,
  useId,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { Button } from './Button.js'
import { Input } from './Input.js'
import { Modal } from './Modal.js'

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
      type: Boolean,
      required: true,
    },
    /** Dialog heading. */
    title: null,
    /** Explanatory line under the title. */
    description: null,
    /** Input placeholder. */
    placeholder: String,
    /** Value the input starts from every time the dialog opens. */
    initialValue: {
      type: String,
      default: '',
    },
    /**
     * Called with the entered value on confirm. Unlike the other callbacks
     * this one is declared as a plain prop (not an emit) because the dialog
     * AWAITS its return: resolve to close, reject or throw to stay open.
     */
    onSubmit: {
      type: Function as PropType<(value: string) => void | Promise<void>>,
      default: undefined,
    },
    /** Confirm-button label. Falls back to a localized "Confirm". */
    confirmLabel: null,
    /** Cancel-button label. Falls back to a localized "Cancel". */
    cancelLabel: null,
    /** Render the confirm button in the error color. */
    destructive: {
      type: Boolean,
      default: false,
    },
    /** `data-mol-id` for the text input. */
    inputMolId: String,
    /** `data-mol-id` for the confirm button. */
    confirmMolId: String,
    /** `data-mol-id` for the cancel button. */
    cancelMolId: String,
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
    // The Input component instance, whose root wraps the native input this
    // dialog focuses on open.
    const inputRef = ref<ComponentPublicInstance | null>(null)

    // Re-seed from initialValue each open so a reopened dialog shows the
    // CURRENT value, not whatever the user typed last time.
    watch([() => props.open, () => props.initialValue], ([open]) => {
      if (open) {
        value.value = props.initialValue
        pending.value = false
      }
    })

    // The dialog exists to take one string, so opening it puts focus in the
    // input. Modal's own open watcher moves focus to the dialog's first
    // control (the close button), and its post-flush watcher — registered in
    // the child setup, which runs after this component's — flushes after this
    // one, so focusing here directly would lose to it. One tick of deferral
    // runs after Modal's focus, and the input ends up focused. `immediate`
    // covers the dialog mounted already open (React's effect runs on mount
    // too); the DOM exists by the deferred tick.
    watch(
      () => props.open,
      (open) => {
        if (!open) return
        void nextTick(() => {
          const root = inputRef.value?.$el as HTMLElement | undefined
          root?.querySelector<HTMLInputElement>('input')?.focus()
        })
      },
      { flush: 'post', immediate: true },
    )

    const handleSubmit = (e: Event): void => {
      e.preventDefault()
      if (pending.value) return
      pending.value = true
      void Promise.resolve(props.onSubmit?.(value.value))
        .then(() => {
          // A parent that keeps the dialog open (a multi-stage flow advancing
          // in onClose) gets a form that accepts the next submit.
          pending.value = false
          emit('close')
        })
        .catch((_error) => {
          // Deliberate: a rejection keeps the dialog open; the caller owns
          // the error and renders it through the default slot, so
          // re-displaying or logging it here would duplicate that.
          pending.value = false
        })
    }

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
          'aria-labelledby': titleId,
          'aria-describedby': description ? descriptionId : undefined,
          onClose: () => {
            if (!pending.value) emit('close')
          },
        },
        {
          default: () => [
            h('form', { onSubmit: handleSubmit }, [
              h('div', { class: cm.stack(3) }, [
                h('h2', { id: titleId, class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, [
                  title,
                ]),
                description
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
