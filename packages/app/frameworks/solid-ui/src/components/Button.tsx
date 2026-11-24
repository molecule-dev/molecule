/**
 * Button component.
 *
 * @module
 */

import { Show, splitProps } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ButtonProps } from '../types.js'
import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'
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
export const Button = withDisplayName<WithRef<ButtonProps, HTMLButtonElement>>((props) => {
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
      onClick={local.onClick}
      {...reactDomProps(rest)}
    >
      <Show when={local.loading}>
        <Spinner size="sm" className={cm.buttonIconLeft} />
      </Show>
      {/* React's `!loading && slot(leftIcon)`: no icon while loading, and none that renders nothing. */}
      <Show when={!local.loading}>
        <PresentWhileNode node={local.leftIcon}>
          {(icon) => <span class={cm.buttonIconLeft}>{icon()}</span>}
        </PresentWhileNode>
      </Show>
      {local.loading && local.loadingText ? local.loadingText : local.children}
      <Show when={!local.loading}>
        <PresentWhileNode node={local.rightIcon}>
          {(icon) => <span class={cm.buttonIconRight}>{icon()}</span>}
        </PresentWhileNode>
      </Show>
    </button>
  )
}, 'Button')
