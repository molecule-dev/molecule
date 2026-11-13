/**
 * Spinner component.
 *
 * @module
 */

import { type Component, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

/**
 * Renders the Spinner component.
 *
 * Extracts data-* and aria-* props from the rest spread so callers can
 * pass `data-mol-id`, custom `aria-*` overrides, etc. without forking.
 *
 * @param props - The component props.
 * @returns The rendered spinner JSX.
 */
export const Spinner: Component<SpinnerProps & { 'data-mol-id'?: string }> = (props) => {
  const [local, rest] = splitProps(props, [
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
      return { borderColor: local.color, borderTopColor: 'transparent' }
    }
    return undefined
  }

  const passthrough = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest as Record<string, unknown>)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) out[k] = v
    }
    return out
  }

  return (
    <div
      role="status"
      aria-label={local.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
      class={classes()}
      style={toStyleProps({ ...local.style, ...colorStyle() })}
      data-testid={local.testId}
      {...passthrough()}
    >
      <Show when={local.label}>
        <span class={cm.srOnly}>{local.label}</span>
      </Show>
    </div>
  )
}
