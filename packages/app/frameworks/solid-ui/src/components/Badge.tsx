/**
 * Badge component.
 *
 * @module
 */

import { type Component, type JSX, splitProps } from 'solid-js'

import type { BadgeProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders the Badge component.
 * @param props - The component props.
 * @returns The rendered badge JSX.
 */
export const Badge: Component<BadgeProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'color',
    'variant',
    'size',
    'rounded',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()

  const badgeClasses = (): string =>
    cm.cn(
      cm.badge({ variant: local.color, size: local.size }),
      !(local.rounded ?? true) && cm.badgeSquare,
      local.className,
    )

  return (
    <span class={badgeClasses()} style={local.style} data-testid={local.testId}>
      {local.children as JSX.Element}
    </span>
  )
}
