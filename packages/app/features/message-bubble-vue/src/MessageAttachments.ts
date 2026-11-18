/**
 * Vue message attachment rows: `[icon] [name · size] [action]`.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s
 * `MessageAttachments` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { MessageAttachment } from './types.js'

/**
 * Renders one node-valued attachment field (a VNode) or nothing.
 *
 * @param value - The attachment's `icon` or `action`.
 * @returns The children to render.
 */
const node = (value: VNodeChild | null | undefined): VNodeChild[] => (value != null ? [value] : [])

/**
 * Vertical list of attachment rows below a message body.
 * Each row: `[icon] [name · size] [action]`.
 *
 * @param props - Component props (see {@link MessageAttachmentsProps}).
 * @returns The attachment list component.
 */
export const MessageAttachments = defineComponent({
  name: 'MessageAttachments',
  props: {
    attachments: {
      type: Array as PropType<MessageAttachment[]>,
      required: true,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h('div', { class: cm.cn(cm.stack(1), props.className) }, [
        ...props.attachments.map((attachment) =>
          h('div', { key: attachment.id, class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...node(attachment.icon),
            h('span', { class: cm.cn(cm.flex1, cm.textSize('sm')) }, [
              h('span', { class: cm.fontWeight('medium') }, attachment.name),
              ...(attachment.size ? [h('span', { class: cm.sp('ml', 2) }, attachment.size)] : []),
            ]),
            ...node(attachment.action),
          ]),
        ),
      ])
  },
})
