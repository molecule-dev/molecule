/**
 * Card component.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'

import type { CardProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

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
export const Card: Component<CardProps & { 'data-mol-id'?: string }> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'variant',
    'interactive',
    'padding',
    'className',
    'style',
    'testId',
    'onClick',
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

  const passthrough = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest as Record<string, unknown>)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) out[k] = v
    }
    return out
  }

  return (
    <div
      class={cardClasses()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      onClick={local.onClick as JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>}
      role={local.interactive ? 'button' : undefined}
      tabIndex={local.interactive ? 0 : undefined}
      {...passthrough()}
    >
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Renders the CardHeader component.
 * @param props - The div attributes to spread onto the header.
 * @returns The rendered card header JSX.
 */
export const CardHeader: Component<
  { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.cardHeader, local.className)} style={toStyleProps(local.style)} {...rest}>
      {local.children}
    </div>
  )
}

/**
 * Renders the CardTitle component.
 * @param props - The heading attributes to spread onto the title.
 * @returns The rendered card title JSX.
 */
export const CardTitle: Component<
  { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLHeadingElement>
> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <h3 class={cm.cn(cm.cardTitle, local.className)} style={toStyleProps(local.style)} {...rest}>
      {local.children}
    </h3>
  )
}

/**
 * Renders the CardDescription component.
 * @param props - The paragraph attributes to spread onto the description.
 * @returns The rendered card description JSX.
 */
export const CardDescription: Component<
  { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLParagraphElement>
> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <p
      class={cm.cn(cm.cardDescription, local.className)}
      style={toStyleProps(local.style)}
      {...rest}
    >
      {local.children}
    </p>
  )
}

/**
 * Renders the CardContent component.
 * @param props - The div attributes to spread onto the content.
 * @returns The rendered card content JSX.
 */
export const CardContent: Component<
  { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.cardContent, local.className)} style={toStyleProps(local.style)} {...rest}>
      {local.children}
    </div>
  )
}

/**
 * Renders the CardFooter component.
 * @param props - The div attributes to spread onto the footer.
 * @returns The rendered card footer JSX.
 */
export const CardFooter: Component<
  { children?: JSX.Element; className?: string } & JSX.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [local, rest] = splitProps(props, ['children', 'className', 'style'])
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.cardFooter, local.className)} style={toStyleProps(local.style)} {...rest}>
      {local.children}
    </div>
  )
}
