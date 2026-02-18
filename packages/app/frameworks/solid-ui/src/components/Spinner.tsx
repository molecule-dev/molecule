/**
 * Spinner component.
 *
 * @module
 */

import { type Component, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders the Spinner component.
 * @param props - The component props.
 * @returns The rendered spinner JSX.
 */
export const Spinner: Component<SpinnerProps> = (props) => {
  const [local] = splitProps(props, [
    'size',
    'color',
    'label',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const classes = (): string => cm.cn(cm.spinner({ size: local.size }), local.className)

  const colorStyle = (): Record<string, string> | undefined => {
    if (
      local.color &&
      typeof local.color === 'string' &&
      !['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(local.color)
    ) {
      return { 'border-color': local.color, 'border-top-color': 'transparent' }
    }
    return undefined
  }

  return (
    <div
      role="status"
      aria-label={local.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
      class={classes()}
      style={{ ...local.style, ...colorStyle() }}
      data-testid={local.testId}
    >
      <Show when={local.label}>
        <span class={cm.srOnly}>{local.label}</span>
      </Show>
    </div>
  )
}
