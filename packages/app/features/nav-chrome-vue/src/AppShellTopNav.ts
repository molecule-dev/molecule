/**
 * Vue top navigation shell.
 *
 * Vue counterpart of `@molecule/app-nav-chrome-react`'s `AppShellTopNav` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { nodeList, slotOrProp } from './internal.js'
import type { NavItem } from './types.js'

/**
 * Top navigation shell — logo on the left, nav items in the centre,
 * app-level actions on the right. Fully slot-driven; apps decide what to
 * render in each position.
 *
 * @param props - Component props (see {@link AppShellTopNavProps}).
 * @returns The top navigation component.
 */
export const AppShellTopNav = defineComponent({
  name: 'AppShellTopNav',
  props: {
    logo: null,
    items: Array as PropType<NavItem[]>,
    activeId: String,
    onItemClick: Function as PropType<(item: NavItem) => void>,
    right: null,
    className: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()

    /** One nav item button, matching React's button exactly. */
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
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('sm'),
            it.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          ),
        },
        [...nodeList(it.icon), h('span', [it.label]), ...nodeList(it.badge)],
      )

    return (): VNode =>
      h(
        'header',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            props.className,
          ),
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'lg' }) }, [
            ...slotOrProp(slots.logo, props.logo),
            props.items && props.items.length > 0
              ? h(
                  'nav',
                  {
                    class: cm.flex({ align: 'center', gap: 'sm' }),
                    'aria-label': t('navChrome.aria.main', undefined, { defaultValue: 'Main' }),
                  },
                  props.items.map(renderItem),
                )
              : null,
          ]),
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...slotOrProp(slots.right, props.right),
          ]),
        ],
      )
  },
})
