/**
 * Text: an element that holds text.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { TextProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Text: renders exactly its `as` tag (`<Text as="h2">` is an `<h2>`). On React Native it is a
 * `Text`, a heading for `h1`–`h6`. Text styles (`cm.textMuted`, a font size) belong on this
 * element: native text does not inherit them from a container.
 * The `lang` prop sets the language of this text run on the rendered element.
 *
 * @param props - See {@link TextProps}.
 * @returns The element.
 */
export function Text({
  as,
  children,
  ref,
  ...props
}: TextProps<ElementNode> & ElementRefProps): ReactElement {
  return createElement(as, { ...webElementAttributes(props), ref: useElementRef(ref) }, children)
}
