/**
 * TableCell: a native cell that shares its column widths with the table.
 *
 * @module
 */

import {
  type ReactElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { Pressable as NativePressable, View, type ViewStyle } from 'react-native'

import type { TableCellProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import {
  dataAttributes,
  ElementScope,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { isPressable, pressProps } from './press.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import { cellSpan, fixedLength, needsNaturalWidth, TableColumn, TableLayout } from './table.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Lays out the cell at the sum of its spanned column widths, with its header or cell role.
 *
 * @param props - The cell's props and ref.
 * @returns The table cell.
 */
export function TableCell(props: TableCellProps<ElementNode> & ElementRefProps): ReactElement {
  const { as, className, colSpan, style, webStyle, children, ref, scope } = props
  const table = useContext(TableLayout)
  const start = useContext(TableColumn)
  const id = useId()
  const classes = useTagClasses(className, as)
  const split = splitClasses(classes, useInheritedText(), dataAttributes(props))
  const paint = nativeStyle(style, webStyle)
  const fixed = fixedLength(paint?.width)
  const span = cellSpan(colSpan)
  // Keep each measurement tied to the content and styles that determine its natural width.
  const textClasses = split.text
  const track = useMemo(
    () =>
      start === undefined
        ? undefined
        : {
            column: start,
            span,
            fixed,
            content: { classes, children, style, webStyle, textClasses },
          },
    [start, span, fixed, classes, children, style, webStyle, textClasses],
  )
  const register = table?.register
  const measure = table?.measure
  useLayoutEffect(() => track && register?.(id, track), [id, register, track])
  const width =
    start === undefined
      ? undefined
      : table?.widths?.slice(start, start + span).reduce((sum, value) => sum + value, 0)
  const measuring =
    width === undefined && track !== undefined && needsNaturalWidth(track) && measure !== undefined
  const report = useCallback(
    (natural: number): void => {
      if (track) measure?.(id, track, natural)
    },
    [id, measure, track],
  )
  const view = useRef<View>(null)
  const forward = useNativeRef<View>(ref)
  const setNode = useCallback(
    (node: View | null): void => {
      view.current = node
      forward?.(node)
    },
    [forward],
  )
  useLayoutEffect(() => {
    if (!measuring) return
    // A remeasurement that happens to retain the same width can omit onLayout.
    const frame = requestAnimationFrame(() =>
      view.current?.measure?.((_x, _y, next) => report(next)),
    )
    return () => cancelAnimationFrame(frame)
  }, [measuring, report])
  const columnStyle: ViewStyle | undefined =
    table && track ? { flexShrink: 0, width: width ?? 'auto' } : undefined
  const middle: ViewStyle | undefined =
    split.verticalAlign === 'middle' ? { justifyContent: 'center' } : undefined
  const Host = isPressable(props) ? NativePressable : View
  return (
    <ElementScope split={split}>
      <Host
        {...nativeAccessibility(
          { ...props, role: props.role ?? (scope === 'row' ? 'rowheader' : undefined) },
          as,
        )}
        {...pressProps(props)}
        ref={setNode}
        className={split.view || undefined}
        style={[paint, columnStyle, middle]}
        onLayout={measuring ? (event) => report(event.nativeEvent.layout.width) : undefined}
        collapsable={!measuring}
      >
        {layoutChildren(children, split)}
      </Host>
    </ElementScope>
  )
}
