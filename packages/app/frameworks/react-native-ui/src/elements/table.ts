/**
 * Column sizes and row positions shared by native table elements.
 *
 * @module
 */

import { createContext, useCallback, useMemo, useState } from 'react'

/** A cell's position and explicitly requested column width. */
export interface CellTrack {
  column: number
  span: number
  fixed?: number | string
}

/** A cell that has registered with a table, with its measured width when it needs one. */
export interface CellMeasure {
  track: CellTrack
  natural?: number
}

/** The colspan limit used by HTML cells. */
export function cellSpan(span: number | undefined): number {
  return span !== undefined && Number.isFinite(span)
    ? Math.min(1000, Math.max(1, Math.floor(span)))
    : 1
}

/** A native layout dimension that fixes a column, or undefined for an automatic width. */
export function fixedLength(width: unknown): number | string | undefined {
  if (typeof width === 'number' && Number.isFinite(width) && width >= 0) return width
  if (typeof width === 'string' && /^\d+(?:\.\d+)?%$/.test(width)) return width
  return undefined
}

/** Resolves a fixed dimension against the table's proposed width. */
export function widthIn(
  width: number | string | undefined,
  available: number | undefined,
): number | undefined {
  if (typeof width === 'number') return width
  return width !== undefined && available !== undefined
    ? (Number.parseFloat(width) * available) / 100
    : undefined
}

/** Whether the table needs to measure the content of this cell before it can lay it out. */
export function needsNaturalWidth(track: CellTrack): boolean {
  return track.span === 1 && track.fixed === undefined
}

/**
 * Resolves a table's column widths from the widest unspanned cells. Fixed columns
 * keep their widths. When there is room, auto columns grow in proportion to their
 * natural widths. A wide table keeps its natural sizes so the scroll area can pan.
 *
 * @param available - The table or viewport width.
 * @param cells - The mounted cells and their measurements.
 * @returns The width of each column from left to right.
 */
export function tableColumnWidths(available: number, cells: readonly CellMeasure[]): number[] {
  const count = cells.reduce((end, { track }) => Math.max(end, track.column + track.span), 0)
  const natural = new Array<number>(count).fill(0)
  const fixed = new Map<number, number>()
  for (const { track, natural: measured } of cells) {
    if (track.span > 1) continue
    const width = widthIn(track.fixed, available)
    if (width !== undefined) {
      fixed.set(track.column, Math.max(fixed.get(track.column) ?? 0, width))
    } else {
      natural[track.column] = Math.max(natural[track.column] ?? 0, measured ?? 0)
    }
  }
  const autoTotal = natural.reduce((sum, width, column) => sum + (fixed.has(column) ? 0 : width), 0)
  const fixedTotal = Array.from(fixed.values()).reduce((sum, width) => sum + width, 0)
  const extra = Math.max(0, available - fixedTotal - autoTotal)
  const autoCount = count - fixed.size
  return natural.map(
    (width, column) =>
      fixed.get(column) ??
      (autoTotal > 0 ? width + (extra * width) / autoTotal : extra / autoCount),
  )
}

interface TableLayoutValue {
  register(id: string, track: CellTrack): () => void
  measure(id: string, track: CellTrack, natural: number): void
  widths: number[] | undefined
}

/** A table's current column widths and the callbacks its cells use to report dimensions. */
export function useTableLayout(available: number | undefined): TableLayoutValue {
  const [cells, setCells] = useState<ReadonlyMap<string, CellMeasure>>(() => new Map())
  const register = useCallback((id: string, track: CellTrack): (() => void) => {
    setCells((previous) => new Map(previous).set(id, { track }))
    return () => {
      setCells((previous) => {
        if (previous.get(id)?.track !== track) return previous
        const next = new Map(previous)
        next.delete(id)
        return next
      })
    }
  }, [])
  const measure = useCallback((id: string, track: CellTrack, natural: number): void => {
    if (!Number.isFinite(natural) || natural < 0) return
    setCells((previous) => {
      const cell = previous.get(id)
      if (!cell || cell.track !== track || cell.natural !== undefined) return previous
      return new Map(previous).set(id, { track, natural })
    })
  }, [])
  const widths = useMemo(() => {
    if (available === undefined) return undefined
    const current = Array.from(cells.values())
    if (current.some(({ track, natural }) => needsNaturalWidth(track) && natural === undefined))
      return undefined
    return tableColumnWidths(available, current)
  }, [available, cells])
  return useMemo(() => ({ register, measure, widths }), [register, measure, widths])
}

/** The shared layout of the nearest table. */
export const TableLayout = createContext<TableLayoutValue | null>(null)

/** The starting column assigned by the nearest row. */
export const TableColumn = createContext<number | undefined>(undefined)

/** A row's position within its own group. */
export const TableRowPosition = createContext<{ first: boolean; last: boolean } | undefined>(
  undefined,
)
