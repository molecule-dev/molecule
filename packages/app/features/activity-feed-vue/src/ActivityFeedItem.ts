/**
 * Vue single activity row: avatar (or icon) + actor / verb / target ·
 * timestamp, plus an optional body.
 *
 * Vue counterpart of `@molecule/app-activity-feed-react`'s `ActivityFeedItem` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-vue'

import type { ActivityFeedItemData } from './types.js'

/**
 * One entry in an activity feed.
 *
 * Shape: `[avatar|icon] [actor verb target · timestamp] [body]`. The leading
 * column renders the item's `icon` when supplied, otherwise an `<Avatar>` for
 * `avatarSrc`, otherwise nothing — React's `icon ?? (avatarSrc ? … : null)`.
 *
 * @param props - Component props (see {@link ActivityFeedItemProps}).
 * @returns The activity row component.
 */
export const ActivityFeedItem = defineComponent({
  name: 'ActivityFeedItem',
  props: {
    item: { type: Object as PropType<ActivityFeedItemData>, required: true },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode => {
      const { item } = props
      const leading =
        item.icon != null
          ? [item.icon]
          : item.avatarSrc
            ? [h(Avatar, { src: item.avatarSrc, size: 'sm' })]
            : []

      return h(
        'article',
        { class: cm.cn(cm.flex({ align: 'start', gap: 'sm' }), props.className) },
        [
          h('div', { class: cm.shrink0 }, leading),
          h('div', { class: cm.cn(cm.flex1, cm.stack(1 as const)) }, [
            h('div', { class: cm.cn(cm.textSize('sm')) }, [
              h('span', { class: cm.fontWeight('semibold') }, [item.actor]),
              ' ',
              item.verb,
              ' ',
              item.target ? h('span', { class: cm.fontWeight('medium') }, [item.target]) : null,
              h('span', { class: cm.cn(cm.sp('ml', 2), cm.textSize('xs')) }, [
                ' · ',
                item.timestamp,
              ]),
            ]),
            item.body ? h('div', { class: cm.textSize('sm') }, [item.body]) : null,
          ]),
        ],
      )
    }
  },
})
