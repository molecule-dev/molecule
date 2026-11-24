/**
 * PageShell component — authenticated page wrapper with sidebar and top bar.
 *
 * @module
 */

import { type Component, Show, splitProps } from 'solid-js'

import { PresentWhileNode, useTranslation, type WithNodes } from '@molecule/app-solid'
import type { PageShellProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps, type WithRef } from '../utilities/dom.js'

/**
 * Renders the PageShell component.
 *
 * The top-level layout for authenticated pages with an optional
 * collapsible sidebar, a top bar, and a scrollable main content area.
 *
 * @param props - The component props.
 * @returns The rendered page shell JSX.
 */
export const PageShell: Component<
  WithRef<WithNodes<PageShellProps, 'children' | 'sidebar' | 'topbar'>, HTMLDivElement>
> = (props) => {
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
    'ref',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()

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
      ref={(el) => {
        if (typeof local.ref === 'function') local.ref(el)
      }}
      class={cm.cn(cm.pageShell, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      data-mol-id={local.automationId}
    >
      {/* React's `slot(...)`: a sidebar or topbar that renders nothing adds no element. */}
      <PresentWhileNode node={local.sidebar}>
        {(sidebar) => (
          <aside
            class={cm.cn(
              cm.pageShellSidebar,
              local.sidebarCollapsed && cm.pageShellSidebarCollapsed,
            )}
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
            {sidebar()}
          </aside>
        )}
      </PresentWhileNode>
      <div class={cm.flex1}>
        <PresentWhileNode node={local.topbar}>
          {(topbar) => <header class={cm.pageShellTopbar}>{topbar()}</header>}
        </PresentWhileNode>
        <main class={cm.pageShellContent}>{local.children}</main>
      </div>
    </div>
  )
}
