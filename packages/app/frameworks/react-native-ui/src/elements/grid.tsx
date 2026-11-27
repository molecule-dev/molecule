/**
 * CSS grid on a device, which has no grid layout: a grid's children are placed in its tracks as
 * the web's auto-placement does, each row a flex row whose items stretch to its height.
 *
 * @module
 */

import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from 'react'
import { type LayoutChangeEvent, Text as NativeText, useWindowDimensions, View } from 'react-native'

import type { NativeClassSplit, NativeGridClasses, WebStyle } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** The width a grid gives the element it places in a cell, which that element applies. */
const GridCell = createContext<{ width: number } | null>(null)

/**
 * The style the grid cell around an element gives it: its width, when a grid placed it.
 *
 * @returns The style, or `undefined` outside a grid cell.
 */
export function useGridCell(): { width: number } | undefined {
  return useContext(GridCell) ?? undefined
}

/**
 * Ends the cell an element sits in for its children: a grid places only its own children.
 *
 * @param props - The children.
 * @returns The children outside any cell.
 */
export function NoGridCell({ children }: { children?: ReactNode }): ReactElement {
  return <GridCell.Provider value={null}>{children}</GridCell.Provider>
}

/** One track of a track list: a fixed size in pixels, a share of the free space, or a percentage. */
type Track = { px: number } | { fr: number } | { percent: number }

/**
 * A track list's tracks (`repeat(3, minmax(0, 1fr))`, `1fr 2fr`, `200px 1fr`). `auto` and
 * `minmax(…, 1fr)` share the free space as `1fr` does: a device cannot size a track to its content.
 *
 * @param list - The CSS track list.
 * @returns The tracks, or `null` when the list is empty.
 */
export function parseTracks(list: string): Track[] | null {
  const tokens: string[] = []
  let depth = 0
  let start = 0
  const text = list.trim()
  for (let i = 0; i <= text.length; i++) {
    const char = text[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if ((char === undefined || /\s/.test(char)) && depth === 0) {
      if (i > start) tokens.push(text.slice(start, i))
      start = i + 1
    }
  }
  const tracks: Track[] = []
  for (const token of tokens) {
    const repeat = /^repeat\(\s*(\d+)\s*,\s*(.+)\)$/.exec(token)
    if (repeat?.[1] && repeat[2]) {
      const inner = parseTracks(repeat[2]) ?? []
      for (let n = 0; n < Number(repeat[1]); n++) tracks.push(...inner)
      continue
    }
    const minmax = /^minmax\(\s*[^,]+,\s*(.+)\)$/.exec(token)
    const size = (minmax?.[1] ?? token).trim()
    const fr = /^(\d+(?:\.\d+)?)fr$/.exec(size)
    const px = /^(\d+(?:\.\d+)?)px$/.exec(size)
    const percent = /^(\d+(?:\.\d+)?)%$/.exec(size)
    if (fr?.[1]) tracks.push({ fr: Number(fr[1]) })
    else if (px?.[1]) tracks.push({ px: Number(px[1]) })
    else if (percent?.[1]) tracks.push({ percent: Number(percent[1]) })
    else tracks.push({ fr: 1 })
  }
  return tracks.length > 0 ? tracks : null
}

/**
 * The widths of a grid's columns in a container this wide, as CSS grid sizes them: fixed and
 * percentage tracks first, then the free space shared by `fr`.
 *
 * @param tracks - The tracks.
 * @param width - The container's content width.
 * @param gap - The gap between columns.
 * @returns Each column's width.
 */
export function trackWidths(tracks: readonly Track[], width: number, gap: number): number[] {
  const fixed = tracks.map((track) =>
    'px' in track ? track.px : 'percent' in track ? (width * track.percent) / 100 : 0,
  )
  const fr = tracks.reduce((sum, track) => sum + ('fr' in track ? track.fr : 0), 0)
  const free = Math.max(
    0,
    width - fixed.reduce((sum, size) => sum + size, 0) - gap * (tracks.length - 1),
  )
  return tracks.map((track, i) =>
    'fr' in track && fr > 0 ? (free * track.fr) / fr : (fixed[i] ?? 0),
  )
}

/**
 * The heights of a grid's explicit rows when its own height is unset, as CSS grid sizes them: a
 * fixed track keeps its size, and the flexible ones share one unit, the largest of their content
 * heights over their `fr` (equal `1fr` rows are all as tall as the tallest). A percentage of an
 * unset height is its content's height, as `auto` is.
 *
 * @param tracks - The explicit row tracks.
 * @param natural - Each explicit row's content height (`0` for a row with no item).
 * @returns Each explicit row's height, or `undefined` for a row its content sizes.
 */
export function rowHeights(
  tracks: readonly Track[],
  natural: readonly number[],
): Array<number | undefined> {
  let unit = 0
  tracks.forEach((track, i) => {
    if ('fr' in track && track.fr > 0) unit = Math.max(unit, (natural[i] ?? 0) / track.fr)
  })
  return tracks.map((track) =>
    'px' in track ? track.px : 'fr' in track ? unit * track.fr : undefined,
  )
}

/**
 * The value of a breakpoint-keyed grid entry at a window width: the entry of the widest
 * breakpoint the window reaches, as the web's min-width media queries apply.
 *
 * @param values - The values by breakpoint variant (`''` at the base size).
 * @param windowWidth - The window's width.
 * @returns The value, or `undefined` when none applies.
 */
export function atBreakpoint<T>(
  values: Readonly<Record<string, T>>,
  windowWidth: number,
): T | undefined {
  const breakpoints = getClassMap().nativeBreakpoints ?? {}
  let best: T | undefined = values['']
  let bestWidth = -1
  for (const [name, value] of Object.entries(values)) {
    if (name === '') continue
    const from = breakpoints[name]
    if (from !== undefined && windowWidth >= from && from > bestWidth) {
      best = value
      bestWidth = from
    }
  }
  return best
}

/** A pixel length from a web style value (`6`, `'11px'`), or `undefined`. */
const pixelsOf = (value: unknown): number | undefined =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value)
      ? Number.parseFloat(value)
      : undefined

/** The alignment of a grid's items as the native row's `alignItems`. */
const ALIGN = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  baseline: 'baseline',
} as const

/**
 * The span of a grid child, with inline CSS taking precedence over its responsive classes.
 *
 * @param child - The child.
 * @param split - Splits a class string.
 * @param windowWidth - The window's width.
 * @param columns - The grid's column count.
 * @returns The columns it covers.
 */
function spanOf(
  child: ReactNode,
  split: (className: string | undefined) => NativeClassSplit,
  windowWidth: number,
  columns: number,
): number {
  if (!isValidElement<{ className?: unknown; webStyle?: WebStyle }>(child)) return 1
  const className = typeof child.props.className === 'string' ? child.props.className : undefined
  const gridColumn = child.props.webStyle?.gridColumn
  const inline =
    typeof gridColumn === 'string'
      ? /^span\s+([1-9]\d*)(?:\s*\/\s*(?:span\s+[1-9]\d*|auto))?$/i.exec(gridColumn.trim())?.[1]
      : undefined
  const span =
    inline === undefined ? atBreakpoint(split(className).span ?? {}, windowWidth) : Number(inline)
  return span === 'full' ? columns : Math.max(1, Math.min(columns, span ?? 1))
}

/**
 * A grid container's native layout: the style its view takes (a column of rows, the row gap) and
 * its children placed in rows of cells.
 *
 * @param props - The grid's classes (`grid`), its web style (a track list, gaps), its text classes
 *   (for a bare string among its children), a splitter for its children's classes, and the children.
 * @returns The layout's view style and its rows (the first measures the content width).
 */
export function useGridLayout({
  grid,
  webStyle,
  text,
  split,
  children,
}: {
  grid: NativeGridClasses
  webStyle: WebStyle | undefined
  text: string
  split: (className: string | undefined) => NativeClassSplit
  children: ReactNode
}): {
  style: { flexDirection: 'column'; alignItems: 'stretch'; rowGap: number; columnGap: 0 }
  rows: ReactNode
} {
  const { width: windowWidth } = useWindowDimensions()
  const [width, setWidth] = useState<number | null>(null)
  // Content heights of the explicit rows, for the children they were measured with: a new set of
  // children is measured again before its flexible rows are evened out.
  const [measured, setMeasured] = useState<{ children: ReactNode; heights: number[] } | null>(null)
  const pending = useRef<number[]>([])
  const template = webStyle?.gridTemplateColumns
  const columnsValue = atBreakpoint(grid.columns, windowWidth) ?? 1
  const tracks = (typeof template === 'string' ? parseTracks(template) : null) ??
    (typeof columnsValue === 'string'
      ? parseTracks(columnsValue)
      : Array.from({ length: Math.max(1, columnsValue) }, () => ({ fr: 1 }))) ?? [{ fr: 1 }]
  const gap = pixelsOf(webStyle?.gap)
  const columnGap =
    pixelsOf(webStyle?.columnGap) ?? gap ?? atBreakpoint(grid.columnGap, windowWidth) ?? 0
  const rowGap = pixelsOf(webStyle?.rowGap) ?? gap ?? atBreakpoint(grid.rowGap, windowWidth) ?? 0
  const align = atBreakpoint(grid.alignItems, windowWidth)
  const rowTemplate = webStyle?.gridTemplateRows
  const rowsValue = atBreakpoint(grid.rows ?? {}, windowWidth)
  const rowTracks =
    (typeof rowTemplate === 'string' ? parseTracks(rowTemplate) : null) ??
    (typeof rowsValue === 'string'
      ? parseTracks(rowsValue)
      : Array.from({ length: rowsValue ?? 0 }, () => ({ fr: 1 }))) ??
    []
  const flexible = rowTracks.some((track) => 'fr' in track)
  const widths = width === null ? null : trackWidths(tracks, width, columnGap)
  const items = flattenFragments(children).filter(
    (child) => child !== null && child !== undefined && typeof child !== 'boolean' && child !== '',
  )
  const rows: ReactNode[][] = []
  let column = tracks.length
  for (const child of items) {
    const span = spanOf(child, split, windowWidth, tracks.length)
    if (column + span > tracks.length) {
      rows.push([])
      column = 0
    }
    const cellWidth =
      widths === null
        ? undefined
        : widths.slice(column, column + span).reduce((sum, w) => sum + w, 0) +
          columnGap * (span - 1)
    const key =
      isValidElement(child) && child.key !== null ? child.key : `cell-${rows.length}-${column}`
    const cell =
      typeof child === 'string' || typeof child === 'number' ? (
        <NativeText
          className={text || undefined}
          style={cellWidth === undefined ? undefined : { width: cellWidth }}
        >
          {child}
        </NativeText>
      ) : (
        child
      )
    rows.at(-1)?.push(
      <GridCell.Provider key={key} value={cellWidth === undefined ? null : { width: cellWidth }}>
        {cell}
      </GridCell.Provider>,
    )
    column += span
  }
  // Explicit rows exist, with their gaps, though no item fills them.
  while (rows.length < rowTracks.length) rows.push([])
  const natural = measured !== null && measured.children === children ? measured.heights : null
  const heights = natural
    ? rowHeights(rowTracks, natural)
    : rowTracks.map((track) => ('px' in track ? track.px : undefined))
  const measure =
    (i: number) =>
    (event: LayoutChangeEvent): void => {
      if (natural || !flexible || i >= rowTracks.length) return
      pending.current[i] = event.nativeEvent.layout.height
      const done = rowTracks.every((_track, r) => pending.current[r] !== undefined)
      if (done) {
        setMeasured({ children, heights: rowTracks.map((_track, r) => pending.current[r] ?? 0) })
        pending.current = []
      }
    }
  // Every row fills the content box (padding and borders already left out), so the first one's
  // width is what the tracks share.
  const onLayout = (event: LayoutChangeEvent): void => {
    const next = event.nativeEvent.layout.width
    if (next !== width) setWidth(next)
  }
  return {
    style: { flexDirection: 'column', alignItems: 'stretch', rowGap, columnGap: 0 },
    rows: rows.map((row, i) => {
      const height = heights[i]
      return (
        <View
          key={`row-${i}`}
          onLayout={(event) => {
            if (i === 0) onLayout(event)
            measure(i)(event)
          }}
          style={{
            flexDirection: 'row',
            columnGap,
            alignItems: align ? ALIGN[align] : 'stretch',
            ...(height === undefined ? {} : { height }),
          }}
        >
          {row}
        </View>
      )
    }),
  }
}

/**
 * Children with fragments opened: a fragment adds no grid item.
 *
 * @param children - The children.
 * @returns The children.
 */
function flattenFragments(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flattenFragments(child.props.children)
      : [child],
  )
}
