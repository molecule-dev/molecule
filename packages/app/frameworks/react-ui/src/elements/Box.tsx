/**
 * Box: a container element.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { BoxProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import { reportBareText } from './textChildren.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * A container: renders exactly its `as` tag (`<Box as="ul">` is a `<ul>`) with the props given.
 * On React Native it is a `View`. Text goes in a {@link Text}.
 *
 * @param props - See {@link BoxProps}.
 * @returns The element.
 */
export function Box({
  as,
  style,
  webStyle,
  children,
  ref,
  ...props
}: BoxProps<ElementNode> & ElementRefProps): ReactElement {
  reportBareText('Box', as, children)
  return createElement(
    as,
    { ...props, ref: useElementRef(ref), style: webElementStyle(style, webStyle) },
    children,
  )
}
