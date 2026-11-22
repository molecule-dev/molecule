/**
 * Sidebar tab switcher — toggles between file explorer and search panel.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `SidebarTabs` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. A real tablist wraps the two `role="tab"`
 * buttons; the tab's content is the default slot.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { Icon } from './Icon.js'

/**
 * Properties for the sidebar tab switcher — React's own contract.
 */
export interface SidebarTabsProps {
  /** Currently active sidebar tab. */
  activeTab: 'files' | 'search'
  /** Called when the user switches tabs. */
  onTabChange: (tab: 'files' | 'search') => void
  /** Tab content rendered below the tab buttons (the default slot). */
  children?: VNodeChild
  className?: string
}

/**
 * Sidebar tab strip with file explorer and search icons.
 *
 * @param props - See {@link SidebarTabsProps}.
 * @returns The sidebar tabs element.
 */
export const SidebarTabs = defineComponent({
  name: 'SidebarTabs',
  inheritAttrs: false,
  props: {
    /** Currently active sidebar tab. */
    activeTab: {
      type: String as PropType<SidebarTabsProps['activeTab']>,
      required: true,
    },
    /** Called when the user switches tabs. */
    onTabChange: {
      type: Function as PropType<SidebarTabsProps['onTabChange']>,
      required: true,
    },
    /** Extra classes for the root. */
    className: { type: String, required: false, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNodeChild => {
      const filesActive = props.activeTab === 'files'
      const searchActive = props.activeTab === 'search'
      return h(
        'div',
        {
          class: cm.cn(cm.h('full'), cm.borderR, props.className),
          style: { display: 'flex', flexDirection: 'column' },
        },
        [
          // A real tablist, like the editor's TabBar — the two `role="tab"`
          // buttons below need one to be valid.
          h(
            'div',
            {
              role: 'tablist',
              'aria-label': t('ide.sidebar.tabs', undefined, { defaultValue: 'Sidebar' }),
              class: cm.cn(
                cm.flex({ direction: 'row', align: 'center' }),
                cm.shrink0,
                cm.surfaceSecondary,
                cm.borderB,
              ),
            },
            [
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'sidebar-tab-files',
                  role: 'tab',
                  'aria-selected': filesActive ? 'true' : 'false',
                  onClick: (): void => props.onTabChange('files'),
                  title: t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' }),
                  'aria-label': t('ide.sidebar.files', undefined, { defaultValue: 'Explorer' }),
                  style: {
                    userSelect: 'none',
                    height: '32px',
                    flex: '1',
                    justifyContent: 'center',
                  },
                  class: cm.cn(
                    cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.textSize('sm'),
                    cm.shrink0,
                    cm.cursorPointer,
                    // Icon-only standalone control → the full 44px coarse floor, from
                    // the ClassMap rather than a hand-computed height (min-height beats
                    // the 32px compact height on touch, exactly as before).
                    cm.touchTarget,
                    cm.borderR,
                    filesActive && cm.surface,
                    filesActive && cm.borderBPrimary,
                  ),
                },
                [
                  h(Icon, {
                    name: 'folder',
                    size: 16,
                    'aria-hidden': 'true',
                    style: { opacity: filesActive ? 1 : 0.6 },
                  }),
                ],
              ),
              h(
                'button',
                {
                  type: 'button',
                  'data-mol-id': 'sidebar-tab-search',
                  role: 'tab',
                  'aria-selected': searchActive ? 'true' : 'false',
                  onClick: (): void => props.onTabChange('search'),
                  title: t('ide.sidebar.search', undefined, { defaultValue: 'Search' }),
                  'aria-label': t('ide.sidebar.search', undefined, { defaultValue: 'Search' }),
                  style: {
                    userSelect: 'none',
                    height: '32px',
                    flex: '1',
                    justifyContent: 'center',
                  },
                  class: cm.cn(
                    cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.textSize('sm'),
                    cm.shrink0,
                    cm.cursorPointer,
                    // Same 44px coarse floor as its sibling — one tab strip, one rule.
                    cm.touchTarget,
                    searchActive && cm.surface,
                    searchActive && cm.borderBPrimary,
                  ),
                },
                [
                  h(Icon, {
                    name: 'search',
                    size: 16,
                    'aria-hidden': 'true',
                    style: { opacity: searchActive ? 1 : 0.6 },
                  }),
                ],
              ),
            ],
          ),
          h('div', { style: { flex: '1', minHeight: '0px', overflow: 'auto' } }, [
            slots.default?.(),
          ]),
        ],
      )
    }
  },
})
