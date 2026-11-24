/**
 * Vue flat activity feed: a stack of activity rows with an optional empty state
 * and footer.
 *
 * Vue counterpart of `@molecule/app-activity-feed-react`'s `ActivityFeed` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, Fragment, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray } from '@molecule/app-vue'

import { ActivityFeedItem } from './ActivityFeedItem.js'
import type { ActivityFeedItemData } from './types.js'

/**
 * The empty state's children: the `emptyState` slot wins over the prop, and an
 * absent pair contributes nothing — an empty slot or prop renders nothing, so
 * React renders the feed wrapper instead.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children React renders for `emptyState`.
 */
const slotChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  const nodes: VNodeChild[] = slot ? slot() : prop != null ? [prop] : []
  return toChildArray(nodes).length > 0 ? nodes : []
}

/**
 * Simple activity feed — renders each item via `<ActivityFeedItem>` and stacks
 * them. With no items and an empty state, React renders the empty state alone;
 * for date-grouped feeds use `<ActivityFeedGroup>`.
 *
 * @param props - Component props (see {@link ActivityFeedProps}).
 * @returns The activity feed component.
 */
export const ActivityFeed = defineComponent({
  name: 'ActivityFeed',
  props: {
    items: { type: Array as PropType<ActivityFeedItemData[]>, required: true },
    emptyState: null,
    footer: null,
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const empty = slotChildren(slots.emptyState, props.emptyState)
      if (props.items.length === 0 && empty.length > 0) return h(Fragment, empty)
      return h('div', { class: cm.cn(cm.stack(4), props.className) }, [
        ...props.items.map((item) => h(ActivityFeedItem, { key: item.id, item })),
        ...slotChildren(slots.footer, props.footer),
      ])
    }
  },
})
