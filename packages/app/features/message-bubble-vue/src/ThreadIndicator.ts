/**
 * Vue thread indicator: `"3 replies · last Monday"`.
 *
 * Vue counterpart of `@molecule/app-message-bubble-react`'s
 * `ThreadIndicator` — the same props (React names), the same DOM for the same
 * input. The reply count is pluralized through
 * `t('thread.replies', { count }, { count })`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
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
 * "3 replies · last Monday" indicator rendered below a message bubble.
 * Clicking opens the thread view.
 *
 * @param props - Component props (see {@link ThreadIndicatorProps}).
 * @returns The thread indicator component.
 */
export const ThreadIndicator = defineComponent({
  name: 'ThreadIndicator',
  props: {
    replyCount: {
      type: Number as PropType<number>,
      required: true,
    },
    lastReplyAt: null,
    onOpen: {
      type: Function as PropType<(event: Event) => void>,
      default: undefined,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      // React's `lastReplyAt && …` truthiness: an empty string or no node at
      // all renders no separator span.
      const showLastReply = slots.lastReplyAt
        ? slotOrProp(slots.lastReplyAt, undefined).length > 0
        : Boolean(props.lastReplyAt)
      return h(
        'button',
        {
          type: 'button',
          onClick: (event: MouseEvent) => props.onOpen?.(event),
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.link,
            props.className,
          ),
        },
        [
          h(
            'span',
            { class: cm.fontWeight('semibold') },
            t(
              'thread.replies',
              { count: props.replyCount },
              {
                count: props.replyCount,
                defaultValue: '{{count}} replies',
                defaultValue_one: '{{count}} reply',
              },
            ),
          ),
          ...(showLastReply
            ? [h('span', {}, ['· ', ...slotOrProp(slots.lastReplyAt, props.lastReplyAt)])]
            : []),
        ],
      )
    }
  },
})
