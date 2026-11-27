/**
 * TableBox: the table's scope, row groups and flex rows on native.
 *
 * @module
 */

import { isValidElement, type ReactElement, useContext, useEffect, useState } from 'react'
import {
  type LayoutChangeEvent,
  Pressable as NativePressable,
  View,
  type ViewStyle,
} from 'react-native'

import type { TableBoxProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  ElementScope,
  flatten,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { isPressable, pressProps } from './press.js'
import { useNativeRef } from './ref.js'
import { HorizontalViewport } from './ScrollArea.js'
import { nativeStyle } from './style.js'
import {
  cellSpan,
  fixedLength,
  TableColumn,
  TableLayout,
  TableRowPosition,
  useTableLayout,
  widthIn,
} from './table.js'
import type { ElementNode, ElementRefProps } from './types.js'

type Props = TableBoxProps<ElementNode> & ElementRefProps

/**
 * Renders a native table, row group or row. A row measures its cells once before
 * applying the column widths shared by the whole table.
 *
 * @param props - The table part's props and ref.
 * @returns The table part.
 */
export function TableBox(props: Props): ReactElement {
  if (props.as === 'table') return <TableRoot {...props} />
  if (props.as === 'tr') return <TableRow {...props} />
  return (
    <TablePart {...props}>
      {flatten(props.children)
        .filter(isValidElement)
        .map((row, index, rows) => (
          <TableRowPosition.Provider
            key={row.key}
            value={{ first: index === 0, last: index === rows.length - 1 }}
          >
            {row}
          </TableRowPosition.Provider>
        ))}
    </TablePart>
  )
}

/** Measures the table's container and publishes one set of column widths to its rows. */
function TableRoot(props: Props): ReactElement {
  const viewport = useContext(HorizontalViewport)
  const [measured, setMeasured] = useState<number>()
  const paint = nativeStyle(props.style, props.webStyle)
  const explicitWidth = fixedLength(paint?.width)
  const available = viewport
    ? (widthIn(explicitWidth, viewport.width) ?? viewport.width)
    : (measured ?? widthIn(explicitWidth, undefined))
  const layout = useTableLayout(available)
  const measuring = layout.widths === undefined
  const total = layout.widths?.reduce((sum, width) => sum + width, 0) ?? 0
  const scrollPaint: ViewStyle | undefined = viewport
    ? {
        flexShrink: 0,
        width: measuring ? 'auto' : Math.max(available ?? 0, total),
      }
    : undefined
  return (
    <TableLayout.Provider value={layout}>
      <TableRowPosition.Provider value={undefined}>
        <TablePart
          {...props}
          measuring={measuring}
          extraStyle={scrollPaint}
          onLayout={viewport ? undefined : (event) => setMeasured(event.nativeEvent.layout.width)}
        />
      </TableRowPosition.Provider>
    </TableLayout.Provider>
  )
}

/** Assigns a starting column to each cell, advancing past its colspan. */
function TableRow(props: Props): ReactElement {
  const inside = useContext(TableLayout) !== null
  useEffect(() => {
    if (!inside && typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('TableBox as="tr" requires a TableBox as="table" ancestor.')
    }
  }, [inside])
  let column = 0
  return (
    <TablePart {...props}>
      {flatten(props.children).map((child) => {
        if (!isValidElement<{ colSpan?: number }>(child)) return null
        const start = column
        column += cellSpan(child.props.colSpan)
        return (
          <TableColumn.Provider key={child.key} value={start}>
            {child}
          </TableColumn.Provider>
        )
      })}
    </TablePart>
  )
}

/** A flex row whose cells stretch to its tallest cell. */
const ROW: ViewStyle = { flexDirection: 'row', alignItems: 'stretch' }

/** Draws the table part with its inherited classes and optional press handlers. */
function TablePart({
  extraStyle,
  measuring,
  onLayout,
  ...props
}: Props & {
  extraStyle?: ViewStyle
  measuring?: boolean
  onLayout?: (event: LayoutChangeEvent) => void
}): ReactElement {
  const { as, className, style, webStyle, ref, children } = props
  const position = useContext(TableRowPosition)
  const split = splitClasses(
    useTagClasses(className, as, position),
    useInheritedText(),
    dataAttributes(props),
  )
  const nativeRef = useNativeRef<View>(ref)
  const hostStyle = [
    nativeStyle(style, webStyle),
    useGridCell(),
    as === 'tr' && ROW,
    extraStyle,
    measuring && { opacity: 0 },
  ]
  const Host = isPressable(props) ? NativePressable : View
  return (
    <ElementScope split={split}>
      <Host
        {...nativeAccessibility({ ...props, 'aria-hidden': measuring || props['aria-hidden'] }, as)}
        {...pressProps(props)}
        ref={nativeRef}
        onLayout={onLayout}
        pointerEvents={measuring ? 'none' : undefined}
        className={split.view || undefined}
        style={hostStyle}
      >
        {children}
      </Host>
    </ElementScope>
  )
}
