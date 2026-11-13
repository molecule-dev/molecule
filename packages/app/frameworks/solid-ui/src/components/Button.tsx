/**
 * Button component.
 *
 * @module
 */

import { type Component, type JSX, Show, splitProps } from 'solid-js'

import type { ButtonProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { Spinner } from './Spinner.jsx'

/**
 * Renders the Button component.
 *
 * While `loading` is true, the native button is disabled and marked busy.
 * Drive it from the request's pending state so an unavailable interaction is
 * visible and the next click is accepted after the request settles. Loading
 * does not queue clicks; an app that must preserve every intent needs its own
 * serial action queue.
 *
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

  // React's prop defaults are applied BEFORE `cm.button` (the ClassMap treats
  // an explicit `color` differently from an omitted one), so mirror them here.
  const classes = (): string =>
    cm.cn(
      cm.button({
        variant: local.variant ?? 'solid',
        color: local.color ?? 'primary',
        size: local.size ?? 'md',
        fullWidth: local.fullWidth ?? false,
      }),
      local.className,
    )

  return (
    <button
      type={local.type || 'button'}
      class={classes()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      aria-busy={local.loading ? 'true' : 'false'}
      disabled={local.disabled || local.loading}
      onClick={local.onClick as JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>}
      {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      <Show when={local.loading}>
        <Spinner size="sm" className={cm.buttonIconLeft} />
      </Show>
      <Show when={!local.loading && !!local.leftIcon}>
        <span class={cm.buttonIconLeft}>{local.leftIcon as JSX.Element}</span>
      </Show>
      {local.loading && local.loadingText ? local.loadingText : (local.children as JSX.Element)}
      <Show when={!local.loading && !!local.rightIcon}>
        <span class={cm.buttonIconRight}>{local.rightIcon as JSX.Element}</span>
      </Show>
    </button>
  )
}
