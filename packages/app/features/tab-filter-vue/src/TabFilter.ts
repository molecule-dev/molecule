/**
 * Vue tab-style filter with inline count badges.
 *
 * Vue counterpart of `@molecule/app-tab-filter-react`'s `TabFilter` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { TabFilterTab } from './types.js'

/**
 * Horizontal pill-style tab row used as a segmented filter.
 *
 * Different from a plain tabs row in surfacing inline count badges per tab
 * and scrolling horizontally on overflow. `defaultTab` stays reachable when
 * `tabs` holds only the path/query-selected filter, and a duplicate id
 * appears once (using the default tab's definition). Each enabled tab calls
 * `onChange` with its own id; `disabled` tabs are non-interactive.
 *
 * @param props - Component props (see {@link TabFilterProps}).
 * @returns The tab filter component.
 */
export const TabFilter = defineComponent({
  name: 'TabFilter',
  props: {
    tabs: { type: Array as PropType<TabFilterTab[]>, required: true },
    defaultTab: { type: Object as PropType<TabFilterTab>, default: undefined },
    activeId: { type: String, required: true },
    onChange: { type: Function as PropType<(id: string) => void>, required: true },
    scrollable: { type: Boolean, default: true },
    filled: { type: Boolean, default: true },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * The tabs to render: the default tab first (its definition wins for a
     * duplicate id), then every other tab in the order given.
     * @returns The visible tabs.
     */
    const visibleTabs = (): TabFilterTab[] =>
      props.defaultTab
        ? [props.defaultTab, ...props.tabs.filter((tab) => tab.id !== props.defaultTab!.id)]
        : props.tabs

    return (): VNode =>
      h(
        'div',
        {
          role: 'tablist',
          class: cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className),
          style: props.scrollable ? { overflowX: 'auto', whiteSpace: 'nowrap' } : undefined,
        },
        visibleTabs().map((tab) => {
          const active = tab.id === props.activeId
          return h(
            'button',
            {
              key: tab.id,
              type: 'button',
              role: 'tab',
              'aria-selected': active,
              'data-state': active ? 'active' : 'inactive',
              'data-mol-id': `tab-filter-${tab.id}`,
              disabled: tab.disabled,
              onClick: () => props.onChange(tab.id),
              class: cm.cn(
                cm.tabsTrigger({
                  variant: props.filled ? 'solid-rounded' : 'soft-rounded',
                  size: 'md',
                }),
                active ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                cm.touchTargetCompact,
              ),
            },
            [
              h('span', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
                tab.icon,
                h('span', {}, [tab.label]),
                tab.count !== undefined
                  ? h(
                      'span',
                      { class: cm.cn(cm.textSize('xs'), cm.fontWeight('medium')) },
                      `(${tab.count.toLocaleString()})`,
                    )
                  : null,
              ]),
            ],
          )
        }),
      )
  },
})
