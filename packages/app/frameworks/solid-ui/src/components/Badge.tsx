/**
 * Badge component.
 *
 * @module
 */

import { type JSX, splitProps } from 'solid-js'

import type { BadgeProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Badge component.
 * @param props - The component props.
 * @returns The rendered badge JSX.
 */
export const Badge = withDisplayName<WithRef<BadgeProps, HTMLSpanElement>>((props) => {
  const [local, rest] = splitProps(props, [
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
      cm.badge({ variant: local.color ?? 'primary', size: local.size }),
      !(local.rounded ?? true) && cm.badgeSquare,
      local.className,
    )

  return (
    <span
      class={badgeClasses()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      {...reactDomProps(rest)}
    >
      {local.children as JSX.Element}
    </span>
  )
}, 'Badge')
