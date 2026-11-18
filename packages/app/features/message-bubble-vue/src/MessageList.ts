/**
 * Vue message list: a stack of message bubbles with optional date separators.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s `MessageList` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, Fragment, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { MessageBubble } from './MessageBubble.js'
import type { MessageData } from './types.js'

/**
 * The empty state's children: the `emptyState` slot wins over the prop, and an
 * absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children React renders for `emptyState`.
 */
const slotChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Vertical list of `<MessageBubble>`s with optional date separators.
 *
 * With no messages and an empty state React renders the empty state alone;
 * otherwise it renders the stacked wrapper.
 *
 * @param props - Component props (see {@link MessageListProps}).
 * @returns The message list component.
 */
export const MessageList = defineComponent({
  name: 'MessageList',
  props: {
    messages: {
      type: Array as PropType<MessageData[]>,
      required: true,
    },
    selfAuthorId: String,
    renderDateSeparator: {
      type: Function as PropType<(message: MessageData, i: number) => VNodeChild>,
      default: undefined,
    },
    emptyState: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const empty = slotChildren(slots.emptyState, props.emptyState)
      if (props.messages.length === 0 && empty.length > 0) return h(Fragment, empty)
      return h('div', { class: cm.cn(cm.stack(3), props.className) }, [
        ...props.messages.map((message, index) => {
          const separator = props.renderDateSeparator?.(message, index)
          return h('div', { key: message.id, class: cm.stack(2) }, [
            ...(separator != null ? [separator] : []),
            h(MessageBubble, {
              message,
              isSelf: message.author.id === props.selfAuthorId,
            }),
          ])
        }),
      ])
    }
  },
})
