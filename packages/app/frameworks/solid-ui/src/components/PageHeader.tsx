/**
 * PageHeader component — consistent page title area with breadcrumbs and actions.
 *
 * @module
 */

import { type Component, Index, Show, splitProps } from 'solid-js'

import { PresentWhileNode, useTranslation, type WithNodes } from '@molecule/app-solid'
import { Link } from '@molecule/app-solid/link'
import type { PageHeaderProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps, type WithRef } from '../utilities/dom.js'

/**
 * Renders the PageHeader component.
 *
 * A page title with optional breadcrumb trail, description, and action
 * buttons for a consistent page heading area.
 *
 * @param props - The component props.
 * @returns The rendered page header JSX.
 */
export const PageHeader: Component<
  WithRef<WithNodes<PageHeaderProps, 'actions'>, HTMLDivElement>
> = (props) => {
  const [local] = splitProps(props, [
    'title',
    'description',
    'actions',
    'breadcrumbs',
    'className',
    'style',
    'testId',
    'automationId',
    'ref',
  ])

  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <div
      ref={(el) => {
        if (typeof local.ref === 'function') local.ref(el)
      }}
      class={cm.cn(cm.pageHeader, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      data-mol-id={local.automationId}
    >
      <Show when={local.breadcrumbs && local.breadcrumbs.length > 0}>
        <nav
          class={cm.pageHeaderBreadcrumbs}
          aria-label={t('ui.pageHeader.breadcrumbs', undefined, { defaultValue: 'Breadcrumb' })}
        >
          {/* React keys the breadcrumbs `key={index}` (`<React.Fragment
              key={index}>`), so `<Index>` — a position's node survives and its
              content updates, exactly the index-key behavior. */}
          <Index each={local.breadcrumbs}>
            {(crumb, index) => (
              <>
                <Show when={index > 0}>
                  <span class={cm.pageHeaderBreadcrumbSeparator} aria-hidden="true">
                    /
                  </span>
                </Show>
                <Show
                  when={crumb().href}
                  fallback={<span class={cm.pageHeaderBreadcrumbItem}>{crumb().label}</span>}
                >
                  {(href) => (
                    <Link to={href()} class={cm.pageHeaderBreadcrumbItem}>
                      {crumb().label}
                    </Link>
                  )}
                </Show>
              </>
            )}
          </Index>
        </nav>
      </Show>
      <div class={cm.flex({ justify: 'between', align: 'center' })}>
        <div>
          <h1 class={cm.pageHeaderTitle}>{local.title}</h1>
          <Show when={local.description}>
            <p class={cm.pageHeaderDescription}>{local.description}</p>
          </Show>
        </div>
        {/* React's `slot(actions)`: actions that render nothing add no actions block. */}
        <PresentWhileNode node={local.actions}>
          {(actions) => <div class={cm.pageHeaderActions}>{actions()}</div>}
        </PresentWhileNode>
      </div>
    </div>
  )
}
