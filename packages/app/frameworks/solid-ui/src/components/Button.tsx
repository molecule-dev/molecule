/**
 * Button component.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Spinner } from './Spinner.jsx'

/**
 * Renders the Button component.
 * @param props - The component props.
 * @returns The rendered button JSX.
 */
export const Button: Component<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'variant',
    'color',
    'size',
    'loading',
    'loadingText',
    'fullWidth',
    'leftIcon',
    'rightIcon',
    'className',
    'style',
    'testId',
    'disabled',
    'type',
    'onClick',
  ])

  const cm = getClassMap()

  const classes = (): string =>
    cm.cn(
      cm.button({
        variant: local.variant,
        color: local.color,
        size: local.size,
        fullWidth: local.fullWidth,
      }),
      local.className,
    )

  return (
    <button
      type={local.type || 'button'}
      class={classes()}
      style={local.style}
      data-testid={local.testId}
      disabled={local.disabled || local.loading}
      onClick={local.onClick as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>}
      aria-busy={local.loading}
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <Show when={local.loading}>
        <Spinner size="sm" className={cm.buttonSpinner} />
      </Show>
      <Show when={!local.loading && !!local.leftIcon}>
        <span class={cm.buttonIconLeft}>{local.leftIcon as JSX.Element}</span>
      </Show>
      {local.loading && local.loadingText
        ? local.loadingText
        : (local.children as JSX.Element)}
      <Show when={!local.loading && !!local.rightIcon}>
        <span class={cm.buttonIconRight}>{local.rightIcon as JSX.Element}</span>
      </Show>
    </button>
  )
}
