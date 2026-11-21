/**
 * Vue earned-badges shelf.
 *
 * Vue counterpart of `@molecule/app-reputation-badge-react`'s `BadgeShelf` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { Badge } from './types.js'

/**
 * Horizontal row of small badge icons earned by a user — used alongside
 * `<ReputationBadge>` to surface community achievements on profile headers,
 * post bylines, and detail pages.
 *
 * Each icon shows its name in a native `title` tooltip for low-friction
 * accessibility. Clicking a badge invokes `onClick(badge)`; clicking the
 * trailing `+N` chip invokes `onClick(null)` so the host page can expand a
 * full list.
 *
 * @param props - Component props (see `BadgeShelfProps`).
 * @returns The rendered shelf, or `null` if no badges are supplied.
 */
export const BadgeShelf = defineComponent({
  name: 'BadgeShelf',
  props: {
    badges: {
      type: Array as PropType<Badge[]>,
      required: true,
    },
    limit: Number,
    onClick: {
      type: Function as PropType<((badge: Badge | null) => void) | undefined>,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * One badge's icon: its image when `iconSrc` is set, its glyph (or the `*`
     * fallback) otherwise.
     *
     * @param badge - The badge to render.
     * @returns The icon node.
     */
    const icon = (badge: Badge): VNodeChild =>
      badge.iconSrc
        ? h('img', {
            src: badge.iconSrc,
            alt: '',
            class: cm.cn(cm.shrink0),
            style: { width: '24px', height: '24px' },
            'data-mol-id': 'badge-shelf-icon-img',
          })
        : h(
            'span',
            { 'aria-hidden': 'true', 'data-mol-id': 'badge-shelf-icon-glyph' },
            badge.icon ?? '*',
          )

    return (): VNode | null => {
      if (!props.badges || props.badges.length === 0) return null

      const limit = props.limit ?? 5
      const visible = props.badges.slice(0, limit)
      const overflow = Math.max(0, props.badges.length - visible.length)
      const interactive = typeof props.onClick === 'function'

      /**
       * The badge's native tooltip: its name, plus its description when set.
       *
       * @param badge - The badge.
       * @returns The tooltip text.
       */
      const tooltip = (badge: Badge): string =>
        badge.description ? `${badge.name} — ${badge.description}` : badge.name

      const overflowLabel = t(
        'badgeShelf.overflow.aria',
        { count: overflow },
        { defaultValue: 'Show {{count}} more badges' },
      )

      return h(
        'ul',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className),
          'data-mol-id': 'badge-shelf',
          'aria-label': t(
            'badgeShelf.aria',
            { count: props.badges.length },
            { defaultValue: '{{count}} badges earned' },
          ),
        },
        [
          ...visible.map((badge) =>
            h(
              'li',
              {
                key: badge.id,
                class: cm.cn(cm.flex({ align: 'center', justify: 'center' })),
                'data-mol-id': 'badge-shelf-item',
                'data-badge-id': badge.id,
              },
              [
                interactive
                  ? h(
                      'button',
                      {
                        type: 'button',
                        class: cm.cn(
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.roundedFull,
                        ),
                        onClick: () => props.onClick?.(badge),
                        title: tooltip(badge),
                        'aria-label': badge.name,
                        'data-mol-id': 'badge-shelf-button',
                      },
                      [icon(badge)],
                    )
                  : h('span', { title: tooltip(badge), 'aria-label': badge.name, role: 'img' }, [
                      icon(badge),
                    ]),
              ],
            ),
          ),
          ...(overflow > 0
            ? [
                h(
                  'li',
                  {
                    class: cm.cn(cm.flex({ align: 'center', justify: 'center' })),
                    'data-mol-id': 'badge-shelf-overflow',
                  },
                  [
                    interactive
                      ? h(
                          'button',
                          {
                            type: 'button',
                            class: cm.cn(
                              cm.flex({ align: 'center', justify: 'center' }),
                              cm.roundedFull,
                              cm.textSize('xs'),
                              cm.fontWeight('semibold'),
                            ),
                            onClick: () => props.onClick?.(null),
                            'aria-label': overflowLabel,
                            'data-mol-id': 'badge-shelf-overflow-button',
                          },
                          [`+${overflow}`],
                        )
                      : h(
                          'span',
                          {
                            class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
                            'aria-label': overflowLabel,
                          },
                          [`+${overflow}`],
                        ),
                  ],
                ),
              ]
            : []),
        ],
      )
    }
  },
})
