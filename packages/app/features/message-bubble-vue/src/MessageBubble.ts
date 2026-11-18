/**
 * Vue message bubble: avatar, author row, body, and optional
 * attachments/reactions/thread rows.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s `MessageBubble` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'

import { MessageMeta } from './MessageMeta.js'
import type { MessageData } from './types.js'

/**
 * Renders a node-valued message field, or nothing when React's truthiness
 * would hide it.
 *
 * @param value - The field value.
 * @returns The children to render.
 */
const node = (value: VNodeChild | null | undefined): VNodeChild[] => (value != null ? [value] : [])

/**
 * One message in a chat thread — avatar, author/timestamp row, body, plus
 * optional attachments/reactions/thread indicator passed in via
 * `message.attachments` / `message.reactions` / `message.thread`.
 *
 * `isSelf` flips the row direction so the viewer's own messages appear on
 * the right — no bubble background/tint is applied; style the body via
 * `className` if you want classic chat bubbles.
 *
 * @param props - Component props (see {@link MessageBubbleProps}).
 * @returns The message bubble component.
 */
export const MessageBubble = defineComponent({
  name: 'MessageBubble',
  props: {
    message: {
      type: Object as PropType<MessageData>,
      required: true,
    },
    isSelf: {
      type: Boolean,
      default: false,
    },
    showMeta: {
      type: Boolean,
      default: true,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const { author, body, timestamp, attachments, reactions, thread } = props.message
      return h(
        'article',
        {
          class: cm.cn(
            cm.flex({
              align: 'start',
              gap: 'sm',
              direction: props.isSelf ? 'row-reverse' : 'row',
            }),
            props.className,
          ),
        },
        [
          h('div', { class: cm.shrink0 }, [
            h(Avatar, { src: author.avatarSrc, alt: author.name, name: author.name, size: 'sm' }),
          ]),
          h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
            props.showMeta ? h(MessageMeta, { author: author.name, timestamp }) : null,
            h('div', { class: cm.cn(cm.sp('p', 3)) }, node(body)),
            ...(attachments ? [h('div', { class: cm.sp('mt', 1) }, node(attachments))] : []),
            ...(reactions ? [h('div', { class: cm.sp('mt', 1) }, node(reactions))] : []),
            ...(thread ? [h('div', { class: cm.sp('mt', 1) }, node(thread))] : []),
          ]),
        ],
      )
    }
  },
})
