/**
 * Separator component.
 *
 * @module
 */

import { splitProps } from 'solid-js'

import type { SeparatorProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { withDisplayName } from './displayName.js'

/**
 * Renders the Separator component.
 * @param props - The component props.
 * @returns The rendered separator JSX.
 */
export const Separator = withDisplayName<WithRef<SeparatorProps, HTMLDivElement>>((props) => {
  const [local, rest] = splitProps(props, [
    'orientation',
    'decorative',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const orientation = (): 'horizontal' | 'vertical' => local.orientation ?? 'horizontal'

  const separatorClasses = (): string =>
    cm.cn(cm.separator({ orientation: orientation() }), local.className)

  return (
    <div
      role={(local.decorative ?? true) ? 'none' : 'separator'}
      aria-orientation={(local.decorative ?? true) ? undefined : orientation()}
      class={separatorClasses()}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
      {...reactDomProps(rest)}
    />
  )
}, 'Separator')
