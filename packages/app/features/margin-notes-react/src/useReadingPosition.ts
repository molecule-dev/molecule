/**
 * Measurements for the gutter and the reading line of the phone panel.
 *
 * @module
 */

import { type RefObject, useCallback, useRef, useState } from 'react'

import type { ElementHandle, ElementViewport } from '@molecule/app-ui'
import {
  measureElement,
  observeElementViewport,
  useElementLayoutEffect,
} from '@molecule/app-ui-react/elements'

import type { MarginNotesRow } from './types.js'

/** The reading line is this fraction down the visible prose viewport. */
const READING_LINE = 0.35

interface ReadingPosition {
  rootRef: RefObject<ElementHandle | null>
  rowRefs: RefObject<Map<string, ElementHandle>>
  blockRefs: RefObject<Map<string, ElementHandle>>
  deviceHeight: number | undefined
  readingRow: string | null
  noteOffsets: ReadonlyMap<string, number>
  onScroll: () => void
}

/**
 * Registers each document's own boxes and samples them in the renderer's window coordinates.
 *
 * @param rows - The ordered rows of this document.
 * @param hasNotes - Whether there are notes to measure or follow.
 * @returns Registered refs, viewport information and the notes' alignment.
 */
export function useReadingPosition(rows: MarginNotesRow[], hasNotes: boolean): ReadingPosition {
  const firstWithNotes = rows.find((row) => row.noteIds.length > 0)?.id ?? null
  const [readingRow, setReadingRow] = useState(firstWithNotes)
  const [noteOffsets, setNoteOffsets] = useState(new Map<string, number>())
  const [deviceHeight, setDeviceHeight] = useState<number>()
  const viewportRef = useRef<ElementViewport>(undefined)
  const rootRef = useRef<ElementHandle>(null)
  const rowRefs = useRef(new Map<string, ElementHandle>())
  const blockRefs = useRef(new Map<string, ElementHandle>())
  const readingSample = useRef(0)

  const onScroll = useCallback((): void => {
    const viewport = viewportRef.current
    if (!hasNotes || !viewport) return
    const sample = ++readingSample.current
    const boxes = rows.flatMap((row) => {
      if (row.noteIds.length === 0) return []
      const box = rowRefs.current.get(row.id)
      return box ? [{ id: row.id, box }] : []
    })
    const read = (line: number): void => {
      const tops = new Map<string, number>()
      let pending = boxes.length
      const finish = (): void => {
        if (sample !== readingSample.current) return
        let current = firstWithNotes
        for (const { id } of boxes) {
          const top = tops.get(id)
          if (top === undefined || top > line) break
          current = id
        }
        setReadingRow(current)
      }
      if (pending === 0) finish()
      for (const { id, box } of boxes) {
        measureElement(box, ({ y }) => {
          tops.set(id, y)
          if (--pending === 0) finish()
        })
      }
    }
    if (viewport.scrollOwner === 'document') read(viewport.height * READING_LINE)
    else if (rootRef.current) {
      // The reading line stays put as the notes bar takes more or less space.
      measureElement(rootRef.current, ({ y, height }) => {
        if (sample === readingSample.current) read(y + height * READING_LINE)
      })
    }
  }, [firstWithNotes, hasNotes, rows])

  const alignGutter = useCallback((): void => {
    const offsets = new Map<string, number>()
    for (const row of rows) {
      if (row.notes.length === 0) continue
      const frame = rowRefs.current.get(row.id)
      const block = blockRefs.current.get(row.blocks[0].id)
      if (!frame || !block) continue
      measureElement(frame, (rowBox) => {
        measureElement(
          block,
          (blockBox) => {
            const offset = Math.max(0, Math.round(blockBox.y - rowBox.y))
            if (offset) offsets.set(row.id, offset)
          },
          'content-start',
        )
      })
    }
    setNoteOffsets((previous) =>
      previous.size === offsets.size &&
      [...offsets].every(([id, offset]) => previous.get(id) === offset)
        ? previous
        : offsets,
    )
  }, [rows])

  useElementLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const stop = observeElementViewport(root, (next, resized) => {
      viewportRef.current = next
      if (resized) {
        setDeviceHeight(next.scrollOwner === 'element' ? next.height : undefined)
        // A device lays the block and gutter out at the same row start. On web a
        // heading can sit below that start because its top margin collapses.
        if (hasNotes && next.scrollOwner === 'document') alignGutter()
      }
      onScroll()
    })
    return () => {
      readingSample.current++
      stop()
    }
  }, [alignGutter, hasNotes, onScroll])

  useElementLayoutEffect(() => {
    if (deviceHeight !== undefined) onScroll()
  }, [deviceHeight, onScroll])

  return { rootRef, rowRefs, blockRefs, deviceHeight, readingRow, noteOffsets, onScroll }
}
