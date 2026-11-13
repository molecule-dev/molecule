/**
 * PageShell component — authenticated page wrapper with sidebar and top bar.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { PageShellProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the PageShell component.
 *
 * The top-level layout for authenticated pages with an optional
 * collapsible sidebar, a top bar, and a scrollable main content area.
 *
 * @param props - The component props.
 * @returns The rendered page shell JSX.
 */
export const PageShell: Component<PageShellProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'sidebar',
    'topbar',
    'sidebarCollapsed',
    'onSidebarToggle',
    'className',
    'style',
    'testId',
    'automationId',
  ])

  const cm = getClassMap()

  /**
   * Forwards the toggle's click to `onSidebarToggle`. The core type declares
   * no parameters, but the reference wires it as the click handler, so it
   * receives the event.
   *
   * @param event - The sidebar toggle's click event.
   */
  const handleSidebarToggle = (event: MouseEvent): void => {
    const onSidebarToggle = local.onSidebarToggle as (event: MouseEvent) => void
    onSidebarToggle(event)
  }

  return (
    <div
      class={cm.cn(cm.pageShell, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      data-mol-id={local.automationId}
    >
      <Show when={local.sidebar}>
        <aside
          class={cm.cn(cm.pageShellSidebar, local.sidebarCollapsed && cm.pageShellSidebarCollapsed)}
        >
          <Show when={local.onSidebarToggle}>
            <button
              type="button"
              class={cm.pageShellSidebarToggle}
              onClick={handleSidebarToggle}
              aria-label={
                local.sidebarCollapsed
                  ? t('ui.pageShell.expandSidebar', undefined, { defaultValue: 'Expand sidebar' })
                  : t('ui.pageShell.collapseSidebar', undefined, {
                      defaultValue: 'Collapse sidebar',
                    })
              }
            >
              {local.sidebarCollapsed ? '▶' : '◀'}
            </button>
          </Show>
          {local.sidebar as JSX.Element}
        </aside>
      </Show>
      <div class={cm.flex1}>
        <Show when={local.topbar}>
          <header class={cm.pageShellTopbar}>{local.topbar as JSX.Element}</header>
        </Show>
        <main class={cm.pageShellContent}>{local.children as JSX.Element}</main>
      </div>
    </div>
  )
}
