/**
 * ScrollArea: a container that scrolls.
 *
 * @module
 */

import { createElement, forwardRef, type ReactElement } from 'react'

import type { ElementHandle, ScrollAreaProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode } from './types.js'

/**
 * A scrolling container: renders exactly its `as` tag. Its web scrolling comes from its ClassMap
 * classes (`cm.overflowYAuto`); on React Native it is a `ScrollView` in `direction`.
 *
 * @param props - See {@link ScrollAreaProps}.
 * @param ref - The scroll frame rendered by `as`.
 * @returns The element.
 */
export const ScrollArea = forwardRef<ElementHandle, ScrollAreaProps<ElementNode>>(
  function ScrollArea(
    { as, direction: _direction, style, webStyle, children, ...props },
    ref,
  ): ReactElement {
    return createElement(
      as,
      { ...props, ref: useElementRef(ref), style: webElementStyle(style, webStyle) },
      children,
    )
  },
)
