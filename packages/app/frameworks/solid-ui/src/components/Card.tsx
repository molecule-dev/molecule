/**
 * Card component.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'

import type { CardProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
export const Card: Component<CardProps> = (props) => {
  const [local] = splitProps(props, [
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
      cm.cardPadding(local.padding ?? 'md'),
      local.interactive && cm.cardInteractive,
      local.className,
    )

  return (
    <div
      class={cardClasses()}
      style={local.style}
      data-testid={local.testId}
      onClick={local.onClick as JSX.EventHandlerUnion<HTMLDivElement, MouseEvent>}
      role={local.interactive ? 'button' : undefined}
      tabIndex={local.interactive ? 0 : undefined}
    >
      {local.children as JSX.Element}
    </div>
  )
}

/**
 * Renders the CardHeader component.
 * @param props - The component props.
 * @returns The rendered card header JSX.
 */
export const CardHeader: Component<{ children?: JSX.Element; class?: string }> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.cardHeader, props.class)}>{props.children}</div>
}

/**
 * Renders the CardTitle component.
 * @param props - The component props.
 * @returns The rendered card title JSX.
 */
export const CardTitle: Component<{ children?: JSX.Element; class?: string }> = (props) => {
  const cm = getClassMap()
  return <h3 class={cm.cn(cm.cardTitle, props.class)}>{props.children}</h3>
}

/**
 * Card description component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const CardDescription: Component<{ children?: JSX.Element; class?: string }> = (props) => {
  const cm = getClassMap()
  return <p class={cm.cn(cm.cardDescription, props.class)}>{props.children}</p>
}

/**
 * Card content component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const CardContent: Component<{ children?: JSX.Element; class?: string }> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.cardContent, props.class)}>{props.children}</div>
}

/**
 * Card footer component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const CardFooter: Component<{ children?: JSX.Element; class?: string }> = (props) => {
  const cm = getClassMap()
  return <div class={cm.cn(cm.cardFooter, props.class)}>{props.children}</div>
}
