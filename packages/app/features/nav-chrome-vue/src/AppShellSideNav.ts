/**
 * Vue vertical side navigation shell.
 *
 * Vue counterpart of `@molecule/app-nav-chrome-react`'s `AppShellSideNav` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { nodeList, slotOrProp } from './internal.js'
import type { NavGroup, NavItem } from './types.js'

/**
 * Vertical side nav shell. Pass either `items` for a flat list or `groups`
 * for a sectioned layout ("Main / Teams / Settings"). Header and footer
 * slots remain fixed while the middle scrolls.
 *
 * @param props - Component props (see {@link AppShellSideNavProps}).
 * @returns The side navigation component.
 */
export const AppShellSideNav = defineComponent({
  name: 'AppShellSideNav',
  props: {
    items: Array as PropType<NavItem[]>,
    groups: Array as PropType<NavGroup[]>,
    activeId: String,
    onItemClick: Function as PropType<(item: NavItem) => void>,
    header: null,
    footer: null,
    className: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()

    /** Renders a single nav item as a button with icon, label, and optional badge. */
    const renderItem = (it: NavItem): VNode =>
      h(
        'button',
        {
          key: it.id,
          type: 'button',
          onClick: () => props.onItemClick?.(it),
          disabled: !!it.disabled,
          'aria-current': it.id === props.activeId ? 'page' : undefined,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            it.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          ),
        },
        [
          h('span', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...nodeList(it.icon),
            h('span', [it.label]),
          ]),
          ...nodeList(it.badge),
        ],
      )

    /** The footer slot, wrapped in React's `mt-auto` div; omitted when absent. */
    const renderFooter = (): VNodeChild[] => {
      // An empty footer list renders nothing, as React's slot() treats it.
      const nodes = toChildArray(slots.footer ? slots.footer() : props.footer)
      return nodes.length > 0 ? [h('div', { class: mountClass() }, nodes)] : []
    }

    /**
     * React's `cm.sp('mt', 'auto')`. The spacing scale type omits `'auto'`,
     * but the bonded map renders the literal Tailwind class for it.
     * @returns The class string.
     */
    const mountClass = (): string => cm.cn(cm.sp('mt', 'auto' as never))

    return (): VNode =>
      h('aside', { class: cm.cn(cm.stack(4), props.className) }, [
        ...slotOrProp(slots.header, props.header),
        h(
          'nav',
          {
            'aria-label': t('navChrome.aria.sidebar', undefined, { defaultValue: 'Sidebar' }),
            class: cm.stack(4),
          },
          [
            ...(props.items ?? []).map(renderItem),
            ...(props.groups ?? []).map((g: NavGroup) =>
              h('section', { key: g.id, class: cm.stack(1) }, [
                ...(g.heading
                  ? [
                      h(
                        'h3',
                        {
                          class: cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            cm.sp('px', 3),
                          ),
                        },
                        nodeList(g.heading),
                      ),
                    ]
                  : []),
                ...g.items.map(renderItem),
              ]),
            ),
          ],
        ),
        ...renderFooter(),
      ])
  },
})
