/**
 * PageHeader component — consistent page title area with breadcrumbs and actions.
 *
 * @module
 */

import { type Component, For, type JSX, Show, splitProps } from 'solid-js'

import type { PageHeaderProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the PageHeader component.
 *
 * A page title with optional breadcrumb trail, description, and action
 * buttons for a consistent page heading area.
 *
 * @param props - The component props.
 * @returns The rendered page header JSX.
 */
export const PageHeader: Component<PageHeaderProps> = (props) => {
  const [local] = splitProps(props, [
    'title',
    'description',
    'actions',
    'breadcrumbs',
    'className',
    'style',
    'testId',
    'automationId',
  ])

  const cm = getClassMap()

  return (
    <div
      class={cm.cn(cm.pageHeader, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      data-mol-id={local.automationId}
    >
      <Show when={local.breadcrumbs && local.breadcrumbs.length > 0}>
        <nav class={cm.pageHeaderBreadcrumbs} aria-label="Breadcrumb">
          <For each={local.breadcrumbs}>
            {(crumb: { href?: string; label: unknown }, index: () => number) => (
              <>
                <Show when={index() > 0}>
                  <span class={cm.pageHeaderBreadcrumbSeparator} aria-hidden="true">
                    /
                  </span>
                </Show>
                <Show
                  when={crumb.href}
                  fallback={
                    <span class={cm.pageHeaderBreadcrumbItem}>{crumb.label as JSX.Element}</span>
                  }
                >
                  <a href={crumb.href} class={cm.pageHeaderBreadcrumbItem}>
                    {crumb.label as JSX.Element}
                  </a>
                </Show>
              </>
            )}
          </For>
        </nav>
      </Show>
      <div class={cm.flex({ justify: 'between', align: 'center' })}>
        <div>
          <h1 class={cm.pageHeaderTitle}>{local.title as JSX.Element}</h1>
          <Show when={local.description}>
            <p class={cm.pageHeaderDescription}>{local.description as JSX.Element}</p>
          </Show>
        </div>
        <Show when={local.actions}>
          <div class={cm.pageHeaderActions}>{local.actions as JSX.Element}</div>
        </Show>
      </div>
    </div>
  )
}
