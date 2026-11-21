/**
 * Vue controlled settings side-nav.
 *
 * Vue counterpart of `@molecule/app-settings-container-react`'s
 * `SettingsSidebar` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { hasNode, nodeValue } from './nodes.js'
import type { SettingsSidebarItem, SettingsSidebarProps } from './types.js'

/**
 * Vertical side-nav for Settings pages. Controlled — the caller owns
 * `activeId`; every item calls `onSelect` with its id.
 *
 * The nav region's accessible name resolves through `t()` with the
 * `settingsContainer.aria.settings` key, so it follows the active locale;
 * `ariaLabel` overrides it.
 *
 * @param props - Component props (see {@link SettingsSidebarProps}).
 * @returns The settings sidebar component.
 */
export const SettingsSidebar = defineComponent({
  name: 'SettingsSidebar',
  props: {
    items: {
      type: Array as PropType<SettingsSidebarProps['items']>,
      default: () => [],
    },
    activeId: String as PropType<SettingsSidebarProps['activeId']>,
    onSelect: Function as PropType<SettingsSidebarProps['onSelect']>,
    // Node-valued prop: declared with `null` (any runtime type, no validation
    // — a VNode, a string, or `null` to omit).
    footer: null,
    ariaLabel: { type: String, default: undefined },
    className: String as PropType<SettingsSidebarProps['className']>,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /** One nav item's button (React's per-item classes and `aria-current`). */
    const item = (entry: SettingsSidebarItem): VNode => {
      const active = entry.id === props.activeId
      return h(
        'button',
        {
          // React keys each row by the item's `id`; Vue's `key` keeps the same
          // DOM nodes across an equal or re-ordered array.
          key: entry.id,
          type: 'button',
          onClick: () => props.onSelect?.(entry.id),
          'aria-current': active ? 'page' : undefined,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            active ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          ),
        },
        [entry.icon, h('span', null, [entry.label])],
      )
    }

    return (): VNode =>
      h(
        'nav',
        {
          class: cm.cn(cm.stack(1 as const), props.className),
          'aria-label':
            props.ariaLabel ??
            t('settingsContainer.aria.settings', undefined, { defaultValue: 'Settings' }),
        },
        [
          ...props.items.map(item),
          ...(hasNode(props.footer, slots.footer)
            ? [h('div', { class: cm.sp('mt', 4) }, nodeValue(props.footer, slots.footer))]
            : []),
        ] as VNodeChild[],
      )
  },
})
