/**
 * EmptyState component — shown when a list or section has no data.
 *
 * @module
 */

import { type Component, Show, splitProps } from 'solid-js'

import { PresentWhileNode, type WithNodes } from '@molecule/app-solid'
import type { EmptyStateProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps, type WithRef } from '../utilities/dom.js'

/**
 * Renders the EmptyState component.
 *
 * Displays a centered placeholder with an optional icon, title, description,
 * and a primary action when a list or section has no content.
 *
 * @param props - The component props.
 * @returns The rendered empty-state JSX.
 */
export const EmptyState: Component<
  WithRef<WithNodes<EmptyStateProps, 'icon' | 'action'>, HTMLDivElement>
> = (props) => {
  const [local] = splitProps(props, [
    'icon',
    'title',
    'description',
    'action',
    'className',
    'style',
    'testId',
    'automationId',
    'ref',
  ])

  const cm = getClassMap()

  // React's `slot(...)`: an icon or action that renders nothing adds no element.
  return (
    <div
      ref={(el) => {
        if (typeof local.ref === 'function') local.ref(el)
      }}
      class={cm.cn(cm.emptyState, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      data-mol-id={local.automationId}
    >
      <PresentWhileNode node={local.icon}>
        {(icon) => <div class={cm.emptyStateIcon}>{icon()}</div>}
      </PresentWhileNode>
      <h3 class={cm.emptyStateTitle}>{local.title}</h3>
      <Show when={local.description}>
        <p class={cm.emptyStateDescription}>{local.description}</p>
      </Show>
      <PresentWhileNode node={local.action}>
        {(action) => <div class={cm.emptyStateAction}>{action()}</div>}
      </PresentWhileNode>
    </div>
  )
}
