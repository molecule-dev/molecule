/**
 * Vue PageShell UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { t } from '@molecule/app-i18n'
import type { PageShellProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'

/**
 * Vue PageShell UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s PageShell: the top-level layout
 * for authenticated pages, with an optional collapsible sidebar (and its
 * toggle button), an optional top bar, and a scrollable main content area
 * (the default slot). `sidebar` and `topbar` are node-valued, so they arrive
 * as VNode props or same-named slots.
 *
 * `onSidebarToggle` is kept as a declared function prop (not an emit) so its
 * PRESENCE decides whether the toggle button renders, exactly like React's
 * `onSidebarToggle ? … : null` check; a template's `@sidebar-toggle` compiles
 * to the same `onSidebarToggle` prop key.
 */
export const PageShell = defineComponent({
  name: 'MPageShell',
  inheritAttrs: false,
  props: {
    sidebar: null,
    topbar: null,
    sidebarCollapsed: {
      type: Boolean,
      default: false,
    },
    onSidebarToggle: {
      // React types this `() => void` but binds it as `onClick={onSidebarToggle}`,
      // so the handler receives the DOM click event (the parity kit records it).
      type: Function as PropType<((event: MouseEvent) => void) | undefined>,
      default: undefined,
    },
    className: String,
    style: [String, Object] as PropType<PageShellProps['style']>,
    testId: String,
    automationId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () => {
      const sidebar = props.sidebar ?? slots.sidebar?.()
      const topbar = props.topbar ?? slots.topbar?.()

      const children: VNodeChild[] = []
      if (sidebar) {
        const asideChildren: VNodeChild[] = []
        if (props.onSidebarToggle) {
          asideChildren.push(
            h(
              'button',
              {
                type: 'button',
                class: cm.pageShellSidebarToggle,
                onClick: (event: MouseEvent) => props.onSidebarToggle?.(event),
                'aria-label': props.sidebarCollapsed
                  ? t('ui.pageShell.expandSidebar', undefined, { defaultValue: 'Expand sidebar' })
                  : t('ui.pageShell.collapseSidebar', undefined, {
                      defaultValue: 'Collapse sidebar',
                    }),
              },
              props.sidebarCollapsed ? '▶' : '◀',
            ),
          )
        }
        asideChildren.push(sidebar)
        children.push(
          h(
            'aside',
            {
              class: cm.cn(
                cm.pageShellSidebar,
                props.sidebarCollapsed && cm.pageShellSidebarCollapsed,
              ),
            },
            asideChildren,
          ),
        )
      }

      const mainArea: VNodeChild[] = []
      if (topbar) mainArea.push(h('header', { class: cm.pageShellTopbar }, [topbar]))
      mainArea.push(h('main', { class: cm.pageShellContent }, slots.default?.()))
      children.push(h('div', { class: cm.flex1 }, mainArea))

      return h(
        'div',
        {
          class: cm.cn(cm.pageShell, ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          'data-mol-id': props.automationId,
        },
        children,
      )
    }
  },
})
