// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  type CellMap,
  cellRef,
  columnLetter,
  computeVisibleRange,
  formatCellValue,
  isInSelection,
  normalizeSelection,
  parseClipboardTsv,
  serializeSelectionTsv,
  SpreadsheetGrid,
  type SpreadsheetSelection,
} from '../index.js'

vi.mock('@molecule/app-clipboard', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  copyTextWithFallback: vi.fn(async () => true),
}))

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `useTranslation()` resolves.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  vi.mocked(copyTextWithFallback).mockReset()
  vi.mocked(copyTextWithFallback).mockResolvedValue(true)
})

afterEach(() => {
  cleanup()
})

describe('utilities', () => {
  it('columnLetter maps 0-indexed columns to A1 letters', () => {
    expect(columnLetter(0)).toBe('A')
    expect(columnLetter(1)).toBe('B')
    expect(columnLetter(25)).toBe('Z')
    expect(columnLetter(26)).toBe('AA')
    expect(columnLetter(27)).toBe('AB')
    expect(columnLetter(701)).toBe('ZZ')
    expect(columnLetter(702)).toBe('AAA')
  })

  it('cellRef builds A1 refs from row + col', () => {
    expect(cellRef(0, 0)).toBe('A1')
    expect(cellRef(2, 1)).toBe('B3')
    expect(cellRef(99, 25)).toBe('Z100')
  })

  it('formatCellValue stringifies common types', () => {
    expect(formatCellValue(null)).toBe('')
    expect(formatCellValue(undefined)).toBe('')
    expect(formatCellValue('hi')).toBe('hi')
    expect(formatCellValue(42)).toBe('42')
    expect(formatCellValue(true)).toBe('TRUE')
    expect(formatCellValue(false)).toBe('FALSE')
  })

  it('normalizeSelection orders anchors top-left → bottom-right', () => {
    expect(normalizeSelection({ r1: 5, c1: 7, r2: 1, c2: 2 })).toEqual({
      r1: 1,
      c1: 2,
      r2: 5,
      c2: 7,
    })
  })

  it('isInSelection inclusively tests rectangular ranges', () => {
    const sel: SpreadsheetSelection = { r1: 1, c1: 1, r2: 3, c2: 3 }
    expect(isInSelection(sel, 0, 0)).toBe(false)
    expect(isInSelection(sel, 1, 1)).toBe(true)
    expect(isInSelection(sel, 3, 3)).toBe(true)
    expect(isInSelection(sel, 4, 4)).toBe(false)
  })

  it('serializeSelectionTsv emits TSV with empty cells preserved', () => {
    const cells: CellMap = new Map<string, string | number | boolean | null>([
      ['A1', 1],
      ['B1', 2],
      ['A2', 'hello'],
    ])
    const tsv = serializeSelectionTsv(cells, { r1: 0, c1: 0, r2: 1, c2: 1 })
    expect(tsv).toBe('1\t2\nhello\t')
  })

  it('parseClipboardTsv parses TSV back to a 2D array', () => {
    expect(parseClipboardTsv('1\t2\n3\t4')).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
    expect(parseClipboardTsv('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('computeVisibleRange windows indices with overscan', () => {
    // 100 rows, 28px each, viewport 100px, scroll 0 → ~0-5 with default overscan 2.
    const [start, end] = computeVisibleRange(0, 100, 28, 100)
    expect(start).toBe(0)
    expect(end).toBeLessThanOrEqual(7)

    const [s2, e2] = computeVisibleRange(280, 100, 28, 100)
    expect(s2).toBeGreaterThan(0)
    expect(e2).toBeGreaterThan(s2)

    expect(computeVisibleRange(0, 100, 28, 0)).toEqual([0, -1])
  })
})

/**
 * Convenience wrapper component that owns `cells` + `selection` so tests
 * can drive the grid through user actions.
 *
 * @param props - Component props.
 * @param props.initialCells - Optional starting cell map.
 * @param props.frozenRows - Optional frozen-row count.
 * @param props.frozenCols - Optional frozen-col count.
 * @param props.rows - Total rows (default 5).
 * @param props.columns - Total columns (default 5).
 * @returns The wrapper element.
 */
function Harness(props: {
  initialCells?: CellMap
  frozenRows?: number
  frozenCols?: number
  rows?: number
  columns?: number
  onCellChangeSpy?: (ref: string, value: unknown) => void
}): React.ReactElement {
  const [cells, setCells] = useState<CellMap>(props.initialCells ?? new Map())
  const [selection, setSelection] = useState<SpreadsheetSelection>({ r1: 0, c1: 0, r2: 0, c2: 0 })
  return (
    <SpreadsheetGrid
      rows={props.rows ?? 5}
      columns={props.columns ?? 5}
      cells={cells}
      onCellChange={(ref, value) => {
        props.onCellChangeSpy?.(ref, value)
        setCells((prev) => {
          const next = new Map(prev)
          if (value === null) next.delete(ref)
          else next.set(ref, value)
          return next
        })
      }}
      selection={selection}
      onSelectionChange={setSelection}
      frozenRows={props.frozenRows}
      frozenCols={props.frozenCols}
      viewportWidth={400}
      viewportHeight={200}
      cellWidth={80}
      cellHeight={24}
    />
  )
}

describe('<SpreadsheetGrid> rendering', () => {
  it('renders the grid with role=grid and column/row counts', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={10} columns={6} />
      </Wrap>,
    )
    const grid = container.querySelector('[role="grid"]')
    expect(grid).not.toBeNull()
    expect(grid?.getAttribute('aria-rowcount')).toBe('10')
    expect(grid?.getAttribute('aria-colcount')).toBe('6')
  })

  it('renders column letters and row numbers in headers', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={3} columns={3} />
      </Wrap>,
    )
    const headers = container.querySelectorAll('[role="columnheader"]')
    const labels = Array.from(headers).map((h) => h.textContent)
    expect(labels).toContain('A')
    expect(labels).toContain('B')
    expect(labels).toContain('C')
  })

  it('renders cell values from the cells map', () => {
    const cells: CellMap = new Map<string, string | number | boolean | null>([
      ['A1', 'apple'],
      ['B2', 42],
    ])
    const { container } = render(
      <Wrap>
        <Harness rows={3} columns={3} initialCells={cells} />
      </Wrap>,
    )
    expect(container.textContent).toContain('apple')
    expect(container.textContent).toContain('42')
  })
})

describe('<SpreadsheetGrid> editing', () => {
  it('starts editing on double-click and commits on Enter', () => {
    const onCellChange = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onCellChangeSpy={onCellChange} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')
    expect(a1).not.toBeNull()
    fireEvent.doubleClick(a1!)
    const input = container.querySelector(
      '[data-mol-id="spreadsheet-grid-editor-A1"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    fireEvent.change(input!, { target: { value: '17' } })
    fireEvent.keyDown(input!, { key: 'Enter' })
    expect(onCellChange).toHaveBeenCalledWith('A1', 17)
  })

  it('cancels edit on Escape and does not commit', () => {
    const onCellChange = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onCellChangeSpy={onCellChange} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    fireEvent.doubleClick(a1)
    const input = container.querySelector(
      '[data-mol-id="spreadsheet-grid-editor-A1"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onCellChange).not.toHaveBeenCalled()
  })
})

describe('<SpreadsheetGrid> selection', () => {
  it('selects a single cell on mousedown', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fireEvent.mouseDown(b2)
    expect(b2.getAttribute('aria-selected')).toBe('true')
  })

  it('extends selection on Shift+click', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={4} columns={4} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    fireEvent.mouseDown(a1)
    const c3 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-C3"]')!
    fireEvent.mouseDown(c3, { shiftKey: true })
    // After shift+click, B2 should be in the selection rectangle.
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    expect(b2.getAttribute('aria-selected')).toBe('true')
  })

  it('extends selection on mouse drag', () => {
    const { getByRole } = render(
      <Wrap>
        <Harness rows={30} columns={20} frozenRows={1} frozenCols={1} />
      </Wrap>,
    )
    const grid = getByRole('grid')
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 400, 200))
    const scroll = grid.querySelector<HTMLElement>('[data-mol-id="spreadsheet-grid-scroll"]')
    if (!scroll) throw new Error('Missing scroll viewport')
    scroll.scrollLeft = 192
    scroll.scrollTop = 56
    fireEvent.scroll(scroll)
    const cell = (ref: string) => grid.querySelector(`[data-mol-id="spreadsheet-grid-cell-${ref}"]`)
    const a1 = cell('A1')
    if (!a1) throw new Error('Missing frozen A1')
    const contact = { pointerId: 7, pointerType: 'mouse', isPrimary: true }
    fireEvent.pointerDown(a1, { ...contact, clientX: 70, clientY: 55 })
    // x=150 and y=60 within the grid are just past both frozen cells.
    fireEvent.pointerMove(window, { ...contact, clientX: 160, clientY: 80 })
    expect(a1.getAttribute('aria-selected')).toBe('true')
    expect(cell('B2')?.getAttribute('aria-selected')).toBe('true')
    expect(cell('D4')?.getAttribute('aria-selected')).toBe('true')
    fireEvent.pointerUp(window, { ...contact, clientX: 160, clientY: 80 })
    fireEvent.pointerMove(window, { ...contact, clientX: 260, clientY: 108 })
    expect(cell('E5')?.getAttribute('aria-selected')).toBeNull()
    expect(getByRole('columnheader', { name: 'A' }).style.left).toBe('0px')
    const scrollingHeader = getByRole('columnheader', { name: 'D' }).parentElement
    expect(scrollingHeader?.style.left).toBe('80px')
    expect(scrollingHeader?.style.overflow).toBe('hidden')
  })
})

describe('<SpreadsheetGrid> clipboard', () => {
  it('serializes selection to TSV via serializeSelectionTsv', () => {
    const cells: CellMap = new Map<string, string | number | boolean | null>([
      ['A1', 'a'],
      ['B1', 'b'],
      ['A2', 'c'],
      ['B2', 'd'],
    ])
    expect(serializeSelectionTsv(cells, { r1: 0, c1: 0, r2: 1, c2: 1 })).toBe('a\tb\nc\td')
  })

  it('copies the selection as TSV when Ctrl+C is pressed', async () => {
    const cells: CellMap = new Map<string, string | number | boolean | null>([
      ['A1', 'a'],
      ['B1', 'b'],
      ['A2', 'c'],
      ['B2', 'd'],
    ])
    const { container } = render(
      <Wrap>
        <Harness rows={4} columns={4} initialCells={cells} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fireEvent.mouseDown(a1)
    fireEvent.mouseDown(b2, { shiftKey: true })
    const grid = container.querySelector('[role="grid"]')!
    fireEvent.keyDown(grid, { key: 'c', ctrlKey: true })
    await vi.waitFor(() => {
      expect(vi.mocked(copyTextWithFallback)).toHaveBeenCalledWith('a\tb\nc\td')
    })
  })

  it('leaves the grid unchanged when the copy reports failure', async () => {
    vi.mocked(copyTextWithFallback).mockResolvedValue(false)
    const cells: CellMap = new Map<string, string | number | boolean | null>([
      ['A1', 'a'],
      ['B1', 'b'],
      ['A2', 'c'],
      ['B2', 'd'],
    ])
    const onCellChange = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness rows={4} columns={4} initialCells={cells} onCellChangeSpy={onCellChange} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fireEvent.mouseDown(a1)
    fireEvent.mouseDown(b2, { shiftKey: true })
    const grid = container.querySelector('[role="grid"]')!
    const before = grid.innerHTML
    fireEvent.keyDown(grid, { key: 'c', metaKey: true })
    await vi.waitFor(() => {
      expect(vi.mocked(copyTextWithFallback)).toHaveBeenCalledWith('a\tb\nc\td')
    })
    expect(grid.innerHTML).toBe(before)
    expect(onCellChange).not.toHaveBeenCalled()
  })

  it('paste event writes pasted TSV into cells starting at the anchor', () => {
    const onCellChange = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onCellChangeSpy={onCellChange} rows={4} columns={4} />
      </Wrap>,
    )
    // Select B2.
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fireEvent.mouseDown(b2)
    const grid = container.querySelector('[role="grid"]')!
    // Build a synthetic ClipboardEvent with a 2x2 TSV payload.
    const clipboardData = {
      getData: (type: string) => (type === 'text/plain' ? '10\t20\n30\t40' : ''),
    }
    fireEvent.paste(grid, { clipboardData })
    // 4 cell writes starting at B2.
    expect(onCellChange).toHaveBeenCalledWith('B2', 10)
    expect(onCellChange).toHaveBeenCalledWith('C2', 20)
    expect(onCellChange).toHaveBeenCalledWith('B3', 30)
    expect(onCellChange).toHaveBeenCalledWith('C3', 40)
  })
})

describe('<SpreadsheetGrid> virtualization', () => {
  it('only renders cells inside the viewport (not all 1000 rows)', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={1000} columns={50} />
      </Wrap>,
    )
    const cellEls = container.querySelectorAll('[data-mol-id^="spreadsheet-grid-cell-"]')
    // Far below the upper bound for a 400×200 viewport with 80×24 cells +
    // overscan 2 — rough upper bound ≈ (5+4) cols × (8+4) rows ≈ ~108.
    expect(cellEls.length).toBeLessThan(300)
    // Last rendered cell should NOT be in row 1000 (Z1000 etc.).
    const refs = Array.from(cellEls).map((el) =>
      el.getAttribute('data-mol-id')!.replace('spreadsheet-grid-cell-', ''),
    )
    expect(refs.some((r) => /\d{3,}$/.test(r))).toBe(false)
  })
})

describe('<SpreadsheetGrid> frozen rows / columns', () => {
  it('renders frozen rows and columns when configured', () => {
    const cells = new Map([
      ['A1', 'frozen'],
      ['B2', 'scroll'],
    ])
    const { container } = render(
      <Wrap>
        <Harness
          rows={20}
          columns={10}
          frozenRows={1}
          frozenCols={1}
          initialCells={cells as CellMap}
        />
      </Wrap>,
    )
    // Frozen A1 should be present.
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')
    expect(a1).not.toBeNull()
    expect(container.textContent).toContain('frozen')
  })

  it('renders without errors when frozenRows = frozenCols = 0', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={3} columns={3} />
      </Wrap>,
    )
    expect(container.querySelector('[role="grid"]')).not.toBeNull()
  })
})

describe('<SpreadsheetGrid> keyboard focus (a11y)', () => {
  it('makes cells focusable: the selection anchor is in the tab order, the rest stay programmatically focusable', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={3} columns={3} />
      </Wrap>,
    )
    const cellEls = container.querySelectorAll('[role="gridcell"]')
    expect(cellEls.length).toBeGreaterThan(1)
    // Exactly one cell — the anchor (A1 by default) — carries tabIndex={0};
    // every other cell is focusable via tabIndex={-1} (roving tabindex).
    for (const cell of cellEls) {
      expect(cell.getAttribute('tabindex')).not.toBeNull()
      if (cell === cellEls[0]) expect(cell.getAttribute('tabindex')).toBe('0')
      else expect(cell.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('moves the roving tabindex when the selection anchor moves', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={3} columns={3} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    expect(a1.getAttribute('tabindex')).toBe('0')
    fireEvent.mouseDown(b2)
    expect(b2.getAttribute('tabindex')).toBe('0')
    expect(a1.getAttribute('tabindex')).toBe('-1')
  })

  it('keeps the container keyboard paths working from a focused cell', () => {
    const { container } = render(
      <Wrap>
        <Harness rows={3} columns={3} />
      </Wrap>,
    )
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    expect(a1.getAttribute('tabindex')).toBe('0')
    // Enter on the focused cell bubbles to the grid container and opens the
    // in-cell editor for the selected cell.
    fireEvent.keyDown(a1, { key: 'Enter' })
    expect(container.querySelector('[data-mol-id="spreadsheet-grid-editor-A1"]')).not.toBeNull()
  })
})
