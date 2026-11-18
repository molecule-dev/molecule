/**
 * Vue message composer: a textarea with optional leading/trailing slots and a
 * Send button.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s `MessageComposer` —
 * the same props (React names), the same DOM for the same input, and the same
 * submit behavior: the Send button or Ctrl/Cmd+Enter (never plain Enter), the
 * value trimmed, and the field cleared on submit.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Textarea } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Message input row — text area + optional leading/trailing slots + submit
 * button.
 *
 * @param props - Component props (see {@link MessageComposerProps}).
 * @returns The message composer component.
 */
export const MessageComposer = defineComponent({
  name: 'MessageComposer',
  props: {
    onSubmit: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
    placeholder: String,
    submitOnEnter: {
      type: Boolean,
      default: true,
    },
    leading: null,
    trailing: null,
    disabled: {
      type: Boolean,
      default: false,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const value = ref('')

    /** Trims the current value and calls onSubmit, then resets the textarea. */
    const submit = (): void => {
      const v = value.value.trim()
      if (!v) return
      props.onSubmit(v)
      value.value = ''
    }

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.sp('p', 2), props.className),
        },
        [
          ...slotOrProp(slots.leading, props.leading),
          h(Textarea, {
            value: value.value,
            onChange: (event: Event) => {
              value.value = (event.target as HTMLTextAreaElement).value
            },
            placeholder:
              props.placeholder ??
              t('composer.placeholder', {}, { defaultValue: 'Write a message…' }),
            disabled: props.disabled,
            onKeyDown: (event: KeyboardEvent) => {
              if (
                props.submitOnEnter &&
                event.key === 'Enter' &&
                (event.metaKey || event.ctrlKey)
              ) {
                event.preventDefault()
                submit()
              }
            },
            className: cm.flex1,
          }),
          ...slotOrProp(slots.trailing, props.trailing),
          h(Button, { onClick: submit, disabled: props.disabled || !value.value.trim() }, () =>
            t('composer.send', {}, { defaultValue: 'Send' }),
          ),
        ],
      )
  },
})
