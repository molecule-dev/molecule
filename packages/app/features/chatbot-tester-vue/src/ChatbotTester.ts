/**
 * Vue composed chatbot-tester sandbox UI: optional bot picker + messages
 * thread + input row + error region.
 *
 * Stateless about transport: the consumer owns the message array, the send
 * handler and (optionally) the bot list + current bot id. The composer text is
 * this component's own state, exactly as in React.
 *
 * Vue counterpart of `@molecule/app-chatbot-tester-react`'s `ChatbotTester` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watchEffect,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { ChatbotTesterInput } from './ChatbotTesterInput.js'
import { ChatbotTesterMessages } from './ChatbotTesterMessages.js'
import { applyReactSelectSelection, hasNodeValue, nodeChildren } from './dom.js'
import type { TesterBotOption, TesterMessage } from './types.js'

/** Full chatbot tester sandbox. */
export const ChatbotTester = defineComponent({
  name: 'ChatbotTester',
  inheritAttrs: false,
  props: {
    messages: {
      type: Array as PropType<TesterMessage[]>,
      required: true,
    },
    loading: Boolean,
    onSend: {
      type: Function as PropType<(text: string) => void | Promise<void>>,
      default: undefined,
    },
    bots: {
      type: Array as PropType<TesterBotOption[]>,
      default: undefined,
    },
    botId: String,
    onBotChange: {
      type: Function as PropType<(id: string) => void>,
      default: undefined,
    },
    error: null,
    emptyState: null,
    botPickerLabel: null,
    inputPlaceholder: String,
    sendLabel: String,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const input = ref('')
    const selectEl = ref<HTMLSelectElement | null>(null)

    /**
     * The bot list React renders (its `bots ?? []`).
     *
     * @returns The bot options.
     */
    const bots = (): TesterBotOption[] => props.bots ?? []

    /** Re-applies react-dom's controlled-select selection. */
    const applySelection = (): void => {
      applyReactSelectSelection(selectEl.value, props.botId ?? '')
    }

    // Runs after the picker's options are patched, on mount and on every
    // prop change, as react-dom's controlled `<select>` update does.
    watchEffect(
      () => {
        void props.bots
        void props.botId
        void bots().length
        applySelection()
      },
      { flush: 'post' },
    )

    /** Sends the trimmed composer text and clears the field. */
    const handleSend = async (): Promise<void> => {
      const text = input.value.trim()
      if (!text) return
      input.value = ''
      await props.onSend?.(text)
    }

    /**
     * Reports the selected bot, then restores the controlled selection the way
     * react-dom does after a controlled select's change event.
     *
     * @param event - The native change event.
     */
    const handleBotChange = (event: Event): void => {
      props.onBotChange?.((event.target as HTMLSelectElement).value)
      applySelection()
    }

    /**
     * The picker label: the slot wins, then the prop, then `t()`'s default.
     *
     * @returns The label's children.
     */
    const labelChildren = (): VNodeChild[] =>
      hasNodeValue(slots.botPickerLabel, props.botPickerLabel)
        ? nodeChildren(slots.botPickerLabel, props.botPickerLabel)
        : [t('chatbotTester.label.testBot', undefined, { defaultValue: 'Test bot' })]

    return (): VNode => {
      const children: VNodeChild[] = []

      if (bots().length > 1) {
        children.push(
          h(
            'div',
            {
              class: cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.chatbotTesterBotBar,
              ),
            },
            [
              h(
                'label',
                {
                  for: 'chatbot-tester-bot-select',
                  class: cm.cn(cm.textSize('xs'), cm.fontWeight('bold')),
                },
                labelChildren(),
              ),
              h(
                'select',
                {
                  ref: (el) => {
                    selectEl.value = el instanceof HTMLSelectElement ? el : null
                  },
                  id: 'chatbot-tester-bot-select',
                  onChange: handleBotChange,
                  class: cm.cn(cm.textSize('sm'), cm.chatbotTesterBotSelect),
                },
                bots().map((bot) =>
                  h('option', { key: bot.id, value: bot.id }, bot.name || bot.id),
                ),
              ),
            ],
          ),
        )
      }

      children.push(
        h(ChatbotTesterMessages, {
          messages: props.messages,
          loading: props.loading,
          emptyState: hasNodeValue(slots.emptyState, props.emptyState)
            ? nodeChildren(slots.emptyState, props.emptyState)
            : undefined,
        }),
      )

      if (hasNodeValue(slots.error, props.error)) {
        children.push(
          h(
            'p',
            {
              role: 'alert',
              class: cm.cn(cm.textSize('sm'), cm.sp('px', 6), cm.sp('py', 2), cm.textError),
            },
            nodeChildren(slots.error, props.error),
          ),
        )
      }

      children.push(
        h(ChatbotTesterInput, {
          value: input.value,
          onChange: (next: string) => {
            input.value = next
          },
          onSend: handleSend,
          loading: props.loading,
          placeholder: props.inputPlaceholder,
          sendLabel: props.sendLabel,
        }),
      )

      return h(
        'div',
        {
          class: cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.minW(0), props.className),
        },
        children,
      )
    }
  },
})
