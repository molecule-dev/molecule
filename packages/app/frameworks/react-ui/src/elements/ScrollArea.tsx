/**
 * ScrollArea: a container that scrolls.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { ScrollAreaProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import { reportBareText } from './textChildren.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * A scrolling container: renders exactly its `as` tag. Its web scrolling comes from its ClassMap
 * classes (`cm.overflowYAuto`); on React Native it is a `ScrollView` in `direction`.
 *
 * @param props - See {@link ScrollAreaProps}.
 * @returns The element.
 */
export function ScrollArea({
  as,
  direction: _direction,
  style,
  webStyle,
  children,
  ref,
  ...props
}: ScrollAreaProps<ElementNode> & ElementRefProps): ReactElement {
  reportBareText('ScrollArea', as, children)
  return createElement(
    as,
    { ...props, ref: useElementRef(ref), style: webElementStyle(style, webStyle) },
    children,
  )
}
