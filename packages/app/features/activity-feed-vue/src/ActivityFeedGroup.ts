/**
 * Vue date-grouped activity section: a heading followed by a stack of rows.
 *
 * Vue counterpart of `@molecule/app-activity-feed-react`'s `ActivityFeedGroup` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from './ActivityFeedItem.js'
import type { ActivityFeedItemData } from './types.js'

/**
 * The heading's children: the `heading` slot wins over the prop, and an
 * absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children React renders for `heading`.
 */
const slotChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Date-grouped activity section — a heading followed by a stack of items.
 * Compose multiple groups together for an organized "Today / Yesterday / Last
 * week" feed.
 *
 * @param props - Component props (see {@link ActivityFeedGroupProps}).
 * @returns The activity group component.
 */
export const ActivityFeedGroup = defineComponent({
  name: 'ActivityFeedGroup',
  props: {
    heading: null,
    items: { type: Array as PropType<ActivityFeedItemData[]>, required: true },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h('section', { class: cm.cn(cm.stack(3), props.className) }, [
        h(
          'h3',
          { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
          slotChildren(slots.heading, props.heading),
        ),
        h(
          'div',
          { class: cm.stack(4) },
          props.items.map((item) => h(ActivityFeedItem, { key: item.id, item })),
        ),
      ])
  },
})
