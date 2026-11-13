/**
 * EmptyState component — shown when a list or section has no data.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { EmptyStateProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the EmptyState component.
 *
 * Displays a centered placeholder with an optional icon, title, description,
 * and a primary action when a list or section has no content.
 *
 * @param props - The component props.
 * @returns The rendered empty-state JSX.
 */
export const EmptyState: Component<EmptyStateProps> = (props) => {
  const [local] = splitProps(props, [
    'icon',
    'title',
    'description',
    'action',
    'className',
    'style',
    'testId',
    'automationId',
  ])

  const cm = getClassMap()

  return (
    <div
      class={cm.cn(cm.emptyState, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      data-mol-id={local.automationId}
    >
      <Show when={local.icon}>
        <div class={cm.emptyStateIcon}>{local.icon as JSX.Element}</div>
      </Show>
      <h3 class={cm.emptyStateTitle}>{local.title}</h3>
      <Show when={local.description}>
        <p class={cm.emptyStateDescription}>{local.description}</p>
      </Show>
      <Show when={local.action}>
        <div class={cm.emptyStateAction}>{local.action as JSX.Element}</div>
      </Show>
    </div>
  )
}
