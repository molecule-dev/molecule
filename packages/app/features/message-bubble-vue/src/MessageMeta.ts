/**
 * Vue message meta row: author · timestamp.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s `MessageMeta` — the
 * same props (React names), the same DOM for the same input. Node-valued props
 * (`author`, `timestamp`) arrive as a prop or as the same-named slot; both
 * render the same nodes.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing (React renders an empty
 * element for an absent node).
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
 * Small `[author · timestamp]` row rendered above a message body. Broken
 * out so apps can reuse it in notification rows, quote blocks, etc.
 *
 * @param props - Component props (see {@link MessageMetaProps}).
 * @returns The message meta component.
 */
export const MessageMeta = defineComponent({
  name: 'MessageMeta',
  props: {
    author: null,
    timestamp: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'baseline', gap: 'sm' }),
            cm.textSize('xs'),
            props.className,
          ),
        },
        [
          h('span', { class: cm.fontWeight('semibold') }, slotOrProp(slots.author, props.author)),
          h('span', {}, slotOrProp(slots.timestamp, props.timestamp)),
        ],
      )
  },
})
