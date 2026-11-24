/**
 * Pressable: an element the user activates.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { PressableProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Something the user activates: renders exactly its `as` tag (`<Pressable as="button"
 * type="button">`) with its handlers. On React Native it is a `Pressable`; `onClick` fires on press
 * and a string child is drawn in a `Text`.
 *
 * @param props - See {@link PressableProps}.
 * @returns The element.
 */
export function Pressable({
  as,
  style,
  webStyle,
  children,
  ref,
  ...props
}: PressableProps<ElementNode> & ElementRefProps): ReactElement {
  return createElement(
    as,
    { ...props, ref: useElementRef(ref), style: webElementStyle(style, webStyle) },
    children,
  )
}
