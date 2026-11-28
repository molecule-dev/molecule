/**
 * TableCell: a table data or header cell.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { TableCellProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
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
  ref,
  ...props
}: TableCellProps<ElementNode> & ElementRefProps): ReactElement {
  return createElement(
    as,
    { ...webElementAttributes(props), ref: useElementRef<HTMLTableCellElement>(ref) },
    children,
  )
}
