/**
 * TableCell: a table data or header cell.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { TableCellProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Renders the requested data or header cell with its span, scope and handlers.
 *
 * @param props - The cell's props and ref.
 * @returns The table cell.
 */
export function TableCell({
  as,
  children,
  style,
  webStyle,
  ref,
  ...props
}: TableCellProps<ElementNode> & ElementRefProps): ReactElement {
  return createElement(
    as,
    {
      ...props,
      ref: useElementRef<HTMLTableCellElement>(ref),
      style: webElementStyle(style, webStyle),
    },
    children,
  )
}
