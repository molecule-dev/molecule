/**
 * Card component.
 *
 * @module
 */

import { type JSX, splitProps } from 'solid-js'

import type { CardProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Renders the Card component.
 * @param props - The component props.
 * @returns The rendered card JSX.
 */
export const Card = withDisplayName<
  WithRef<CardProps & { 'data-mol-id'?: string }, HTMLDivElement>
>((props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'variant',
    'interactive',
    'padding',
    'className',
    'style',
    'testId',
    'onClick',
    'onKeyDown',
    'disabled',
  ])

  const cm = getClassMap()
  const cmVariant = (): 'default' | 'elevated' | 'outline' | 'ghost' =>
    variantMap[local.variant || 'elevated'] || 'default'

  const cardClasses = (): string =>
    cm.cn(
      cm.card({ variant: cmVariant() }),
      (local.padding ?? 'md') === 'none' ? '' : cm.cardPadding(local.padding ?? 'md'),
      local.interactive && cm.cardInteractive,
      local.className,
    )

  // An interactive card is announced as a button and sits in the tab order, so
  // Enter and Space activate it the way they activate a native button: by
  // clicking it, which runs `onClick` with a real click event. Keys pressed in a
  // control inside the card belong to that control. The caller's `onKeyDown` runs
  // first; its preventDefault() cancels the activation, as it does on a native button.
  // A disabled card, like a disabled button, never calls onClick: an interactive one is
  // announced as disabled and leaves the tab order.
  const handleKeyDown = (event: KeyboardEvent & { currentTarget: HTMLDivElement }): void => {
    local.onKeyDown?.(event)
    if (event.defaultPrevented || !local.interactive || local.disabled) return
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.currentTarget.click()
  }

  return (
    <div
      class={cardClasses()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      role={local.interactive ? 'button' : undefined}
      tabIndex={local.interactive ? (local.disabled ? -1 : 0) : undefined}
      aria-disabled={local.interactive && local.disabled ? true : undefined}
      // Every other declared prop (id, title, aria-*, data-*, the DOM event handlers) reaches
      // the div, as React's rest spread does; a caller's role or tabIndex replaces the default.
      {...reactDomProps(rest)}
      onClick={local.disabled ? undefined : local.onClick}
      onKeyDown={handleKeyDown}
    >
      {local.children as JSX.Element}
    </div>
  )
}, 'Card')

/**
 * Renders the CardHeader component.
 * @param props - The div attributes to spread onto the header.
 * @returns The rendered card header JSX.
 */
export const CardHeader = withDisplayName<
  WithRef<
    { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >
>((props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(cm.cardHeader, local.className)}
      style={toStyleProps(local.style)}
      {...reactDomProps(rest)}
    >
      {local.children}
    </div>
  )
}, 'CardHeader')

/**
 * Renders the CardTitle component.
 * @param props - The heading attributes to spread onto the title.
 * @returns The rendered card title JSX.
 */
export const CardTitle = withDisplayName<
  WithRef<
    { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLHeadingElement>,
    HTMLHeadingElement
  >
>((props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <h3
      class={cm.cn(cm.cardTitle, local.className)}
      style={toStyleProps(local.style)}
      {...reactDomProps(rest)}
    >
      {local.children}
    </h3>
  )
}, 'CardTitle')

/**
 * Renders the CardDescription component.
 * @param props - The paragraph attributes to spread onto the description.
 * @returns The rendered card description JSX.
 */
export const CardDescription = withDisplayName<
  WithRef<
    { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLParagraphElement>,
    HTMLParagraphElement
  >
>((props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <p
      class={cm.cn(cm.cardDescription, local.className)}
      style={toStyleProps(local.style)}
      {...reactDomProps(rest)}
    >
      {local.children}
    </p>
  )
}, 'CardDescription')

/**
 * Renders the CardContent component.
 * @param props - The div attributes to spread onto the content.
 * @returns The rendered card content JSX.
 */
export const CardContent = withDisplayName<
  WithRef<
    { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >
>((props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(cm.cardContent, local.className)}
      style={toStyleProps(local.style)}
      {...reactDomProps(rest)}
    >
      {local.children}
    </div>
  )
}, 'CardContent')

/**
 * Renders the CardFooter component.
 * @param props - The div attributes to spread onto the footer.
 * @returns The rendered card footer JSX.
 */
export const CardFooter = withDisplayName<
  WithRef<
    { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >
>((props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(cm.cardFooter, local.className)}
      style={toStyleProps(local.style)}
      {...reactDomProps(rest)}
    >
      {local.children}
    </div>
  )
}, 'CardFooter')
