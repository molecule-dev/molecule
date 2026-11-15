/**
 * Vue vertical notification feed: typed icon + title + body + relative time
 * with optional unread border-l accent and optional per-row link.
 *
 * Vue counterpart of `@molecule/app-notification-feed-react`'s
 * `NotificationFeed` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link } from '@molecule/app-vue'

import { fmtRelativeShort } from './fmtRelativeShort.js'
import type { FeedItem } from './types.js'

/**
 * Vertical notification feed: typed icon + title + body + relative time,
 * with an optional unread left-border accent and an optional per-row link.
 *
 * Apps build their own typed-icon mapping (notif.type → icon name) and pass
 * the resolved icon string in. Keeps this package free of per-app type unions.
 *
 * A row with an `href` renders the binding's `<Link>` (react-router's
 * `<Link to>` contract) around the row card; a row without one renders the
 * card in place, exactly as React does.
 *
 * @param props - Component props (see {@link NotificationFeedProps}).
 * @returns The notification feed component.
 */
export const NotificationFeed = defineComponent({
  name: 'NotificationFeed',
  props: {
    items: { type: Array as PropType<ReadonlyArray<FeedItem>>, required: true },
    ariaLabel: String,
    className: String,
    dataMolId: String,
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * One row's card: icon tile, headline, relative time and body.
     *
     * @param item - The row data.
     * @returns The card element.
     */
    const card = (item: FeedItem): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.card(),
            cm.sp('p', 4),
            cm.flex({ align: 'start', gap: 'md' }),
            item.unread ? cm.notificationFeedUnreadAccent : '',
          ),
        },
        [
          h(
            'div',
            {
              class: cm.cn(
                cm.shrink0,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.roundedFull,
                cm.textPrimary,
                cm.notificationFeedIconTile,
              ),
            },
            [h('span', { class: cm.iconGlyphFont, 'aria-hidden': 'true' }, [item.icon])],
          ),
          h('div', { class: cm.cn(cm.flex1, cm.minW(0)) }, [
            h('div', { class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }) }, [
              h('h2', { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) }, [
                item.title,
              ]),
              h(
                'span',
                {
                  class: cm.cn(cm.textSize('xs'), cm.textMuted, cm.notificationFeedTimestamp),
                },
                [fmtRelativeShort(item.createdAt)],
              ),
            ]),
            h('p', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, [item.body]),
          ]),
        ],
      )

    return (): VNode =>
      h(
        'ul',
        {
          class: cm.cn(cm.notificationFeedList, props.className),
          'aria-label': props.ariaLabel,
          'data-mol-id': props.dataMolId,
        },
        props.items.map((item) =>
          h('li', { key: item.id }, [
            item.href
              ? h(Link, { to: item.href, class: cm.displayBlock }, { default: () => [card(item)] })
              : card(item),
          ]),
        ),
      )
  },
})
