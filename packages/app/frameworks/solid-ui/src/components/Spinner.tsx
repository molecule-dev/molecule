/**
 * Spinner component.
 *
 * @module
 */

import { Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Spinner component.
 *
 * Extracts data-* and aria-* props from the rest spread so callers can
 * pass `data-mol-id`, custom `aria-*` overrides, etc. without forking.
 *
 * @param props - The component props.
 * @returns The rendered spinner JSX.
 */
export const Spinner = withDisplayName<
  WithRef<SpinnerProps & { 'data-mol-id'?: string }, HTMLDivElement>
>((props) => {
  const [local, rest] = splitProps(props, [
    'size',
    'color',
    'label',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
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

  return (
    <div
      role="status"
      aria-label={local.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
      class={classes()}
      style={toStyleProps({ ...local.style, ...colorStyle() })}
      data-testid={local.testId}
      {...reactDomProps(rest)}
    >
      <Show when={local.label}>
        <span class={cm.srOnly}>{local.label}</span>
      </Show>
    </div>
  )
}, 'Spinner')
