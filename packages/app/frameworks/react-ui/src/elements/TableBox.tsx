/**
 * TableBox: table, row group and row elements.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { TableBoxProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Renders the requested table, row group or row tag with no wrapper.
 *
 * @param props - The table part's props and ref.
 * @returns The table part.
 */
export function TableBox({
  as,
  children,
  style,
  webStyle,
  ref,
  ...props
}: TableBoxProps<ElementNode> & ElementRefProps): ReactElement {
  return createElement(
    as,
    {
      ...props,
      ref: useElementRef(ref),
      style: webElementStyle(style, webStyle),
    },
    children,
  )
}
