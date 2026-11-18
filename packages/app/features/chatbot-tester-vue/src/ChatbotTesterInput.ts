/**
 * Vue composer input row with a send button: Enter sends, Shift+Enter inserts
 * a newline, and the field follows the controlled `value` prop the way
 * react-dom restores it after every edit.
 *
 * Vue counterpart of `@molecule/app-chatbot-tester-react`'s
 * `ChatbotTesterInput` — the same props (React names) and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, watchEffect } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/** Message composer + send button. */
export const ChatbotTesterInput = defineComponent({
  name: 'ChatbotTesterInput',
  inheritAttrs: false,
  props: {
    value: {
      type: String,
      required: true,
    },
    onChange: {
      type: Function as PropType<(next: string) => void>,
      default: undefined,
    },
    onSend: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    loading: Boolean,
    placeholder: String,
    sendLabel: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const field = ref<HTMLTextAreaElement | null>(null)

    // A controlled textarea's value is applied through the live property only
    // (react-dom writes no `value` attribute on a textarea), so a plain
    // `value` binding — which Vue also reflects to the attribute — is wrong here.
    watchEffect(
      () => {
        const el = field.value
        if (el && el.value !== props.value) el.value = props.value
      },
      { flush: 'post' },
    )

    /**
     * Reports the edit, then restores the controlled value exactly as
     * react-dom does after a controlled input's change event.
     *
     * @param event - The native input event.
     */
    const handleInput = (event: Event): void => {
      const field = event.target as HTMLTextAreaElement
      props.onChange?.(field.value)
      if (field.value !== props.value) field.value = props.value
    }

    /**
     * Enter sends; Shift+Enter is left to the browser (a newline).
     *
     * @param event - The native keydown event.
     */
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        props.onSend?.()
      }
    }

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'end', gap: 2 }),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.chatbotTesterInputRow,
          ),
        },
        [
          h('textarea', {
            ref: (el) => {
              field.value = el instanceof HTMLTextAreaElement ? el : null
            },
            onInput: handleInput,
            onKeydown: handleKeydown,
            rows: 1,
            placeholder:
              props.placeholder === undefined
                ? t('chatbotTester.placeholder.message', undefined, {
                    defaultValue: 'Type a message…',
                  })
                : props.placeholder,
            disabled: props.loading,
            class: cm.cn(
              cm.flex1,
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.surface,
              cm.chatbotTesterInputField,
            ),
          }),
          h(
            'button',
            {
              type: 'button',
              'data-mol-id': 'chatbot-tester-send',
              onClick: (event: MouseEvent) => {
                // React's DOM handler passes the click event, as `onClick={onSend}` does.
                ;(props.onSend as ((event?: MouseEvent) => void) | undefined)?.(event)
              },
              disabled: Boolean(props.loading) || !props.value.trim(),
              class: cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                cm.touchTargetCompact,
              ),
            },
            props.sendLabel === undefined
              ? t('chatbotTester.label.send', undefined, { defaultValue: 'Send' })
              : props.sendLabel,
          ),
        ],
      )
  },
})
