/**
 * Vue scrollable message list for the chatbot sandbox: one left-aligned
 * (assistant) or right-aligned (user) bubble per message, with the typing
 * indicator appended while a reply is in flight.
 *
 * Vue counterpart of `@molecule/app-chatbot-tester-react`'s
 * `ChatbotTesterMessages` — the same props (React names) and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { hasNodeValue, nodeChildren } from './dom.js'
import type { TesterMessage } from './types.js'

/**
 * Scrollable transcript pane. Renders the empty-state slot instead of the list
 * when there are no messages, nothing is loading and an empty state was given
 * (React's branch).
 */
export const ChatbotTesterMessages = defineComponent({
  name: 'ChatbotTesterMessages',
  inheritAttrs: false,
  props: {
    messages: {
      type: Array as PropType<TesterMessage[]>,
      required: true,
    },
    loading: Boolean,
    emptyState: null,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    /**
     * Whether React takes the empty-state branch.
     *
     * @returns True when the empty state renders instead of the list.
     */
    const showsEmptyState = (): boolean =>
      !props.loading &&
      props.messages.length === 0 &&
      hasNodeValue(slots.emptyState, props.emptyState)

    return (): VNode => {
      if (showsEmptyState()) {
        return h(
          'div',
          { class: cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' })) },
          nodeChildren(slots.emptyState, props.emptyState),
        )
      }
      const rows: VNodeChild[] = props.messages.map((msg) => {
        const isUser = msg.role === 'user'
        return h(
          'div',
          { key: msg.id, class: cm.cn(cm.flex({ justify: isUser ? 'end' : 'start' })) },
          [
            h(
              'div',
              {
                class: cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.chatbotTesterMessageBubble,
                  isUser ? cm.chatbotTesterMessageBubbleUser : cm.chatbotTesterMessageBubbleBot,
                ),
              },
              [
                msg.content,
                msg.timestamp
                  ? h(
                      'div',
                      {
                        class: cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                          isUser ? cm.chatbotTesterMessageTimeUser : cm.chatbotTesterMessageTimeBot,
                        ),
                      },
                      msg.timestamp,
                    )
                  : null,
              ],
            ),
          ],
        )
      })
      return h(
        'div',
        { class: cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 4), cm.chatbotTesterMessageList) },
        [
          h('div', { class: cm.stack(3) }, [
            ...rows,
            props.loading
              ? h(
                  'div',
                  { class: cm.cn(cm.textSize('xs'), cm.chatbotTesterTypingIndicator) },
                  '...',
                )
              : null,
            h('div'),
          ]),
        ],
      )
    }
  },
})
