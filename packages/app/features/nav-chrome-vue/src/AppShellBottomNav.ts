/**
 * Vue mobile bottom tab bar.
 *
 * Vue counterpart of `@molecule/app-nav-chrome-react`'s `AppShellBottomNav` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { nodeList } from './internal.js'
import type { NavItem } from './types.js'

/**
 * Mobile/tablet bottom tab bar — typically 3–5 primary nav destinations.
 * Each item shows icon + short label. On desktop layouts this is usually
 * hidden via parent-level responsive chrome.
 *
 * @param props - Component props (see {@link AppShellBottomNavProps}).
 * @returns The bottom navigation component.
 */
export const AppShellBottomNav = defineComponent({
  name: 'AppShellBottomNav',
  props: {
    items: { type: Array as PropType<NavItem[]>, required: true },
    activeId: String,
    onItemClick: Function as PropType<(item: NavItem) => void>,
    className: String,
  },
  setup(props) {
    const { t } = useTranslation()
    const cm = getClassMap()

    /** One tab button, matching React's button exactly. */
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
            cm.flex1,
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
            cm.sp('py', 2),
            cm.textSize('xs'),
            it.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          ),
        },
        [...nodeList(it.icon), h('span', [it.label])],
      )

    return (): VNode =>
      h(
        'nav',
        {
          'aria-label': t('navChrome.aria.bottom', undefined, { defaultValue: 'Bottom' }),
          class: cm.cn(cm.flex({ align: 'stretch' }), props.className),
        },
        props.items.map(renderItem),
      )
  },
})
