// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SpreadsheetGrid` — a port of
 * `@molecule/app-spreadsheet-grid-react/src/__tests__/SpreadsheetGrid.test.tsx`:
 * the same test names and the same assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

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

vi.mock('@molecule/app-clipboard', () => ({ copyTextWithFallback: vi.fn(async () => true) }))

beforeEach(() => {
  vi.mocked(copyTextWithFallback).mockReset()
  vi.mocked(copyTextWithFallback).mockResolvedValue(true)
})

beforeAll(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** What one mounted grid's harness may start with. */
interface GridOptions {
  /** Optional starting cell map. */
  initialCells?: CellMap
  /** Optional frozen-row count. */
  frozenRows?: number
  /** Optional frozen-col count. */
  frozenCols?: number
  /** Total rows (default 5). */
  rows?: number
  /** Total columns (default 5). */
  columns?: number
  /** Records every committed edit. */
  spy?: (ref: string, value: unknown) => void
}

/**
 * A wrapper that owns `cells` + `selection`, so tests can drive the grid
 * through user actions.
 *
 * @param options - The grid's starting props.
 * @returns The harness component.
 */
const harness =
  (options: GridOptions): (() => JSX.Element) =>
  () => {
    const [cells, setCells] = createSignal<CellMap>(new Map(options.initialCells ?? new Map()))
    const [selection, setSelection] = createSignal<SpreadsheetSelection>({
      r1: 0,
      c1: 0,
      r2: 0,
      c2: 0,
    })
    return (
      <SpreadsheetGrid
        rows={options.rows ?? 5}
        columns={options.columns ?? 5}
        cells={cells()}
        onCellChange={(ref, value) => {
          options.spy?.(ref, value)
          const next = new Map(cells())
          if (value === null) next.delete(ref)
          else next.set(ref, value)
          setCells(next)
        }}
        selection={selection()}
        onSelectionChange={(next) => setSelection(next)}
        frozenRows={options.frozenRows}
        frozenCols={options.frozenCols}
        viewportWidth={400}
        viewportHeight={200}
        cellWidth={80}
        cellHeight={24}
      />
    )
  }

/**
 * Mounts the grid and returns its container.
 *
 * @param options - The grid's starting props.
 * @returns The mount container.
 */
function mountGrid(options: GridOptions = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(harness(options), container))
  return container
}

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

describe('<SpreadsheetGrid> rendering', () => {
  it('renders the grid with role=grid and column/row counts', () => {
    const container = mountGrid({ rows: 10, columns: 6 })
    const grid = container.querySelector('[role="grid"]')
    expect(grid).not.toBeNull()
    expect(grid?.getAttribute('aria-rowcount')).toBe('10')
    expect(grid?.getAttribute('aria-colcount')).toBe('6')
  })

  it('renders column letters and row numbers in headers', () => {
    const container = mountGrid({ rows: 3, columns: 3 })
    const headers = container.querySelectorAll('[role="columnheader"]')
    const labels = Array.from(headers).map((header) => header.textContent?.trim())
    expect(labels).toContain('A')
    expect(labels).toContain('B')
    expect(labels).toContain('C')
  })

  it('renders cell values from the cells map', () => {
    const cells: CellMap = new Map<string, string | number>([
      ['A1', 'apple'],
      ['B2', 42],
    ])
    const container = mountGrid({ rows: 3, columns: 3, initialCells: cells })
    expect(container.textContent).toContain('apple')
    expect(container.textContent).toContain('42')
  })
})

describe('<SpreadsheetGrid> editing', () => {
  it('starts editing on double-click and commits on Enter', () => {
    const spy = vi.fn()
    const container = mountGrid({ spy })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')
    expect(a1).not.toBeNull()
    a1!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = container.querySelector(
      '[data-mol-id="spreadsheet-grid-editor-A1"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    input!.value = '17'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(spy).toHaveBeenCalledWith('A1', 17)
  })

  it('cancels edit on Escape and does not commit', () => {
    const spy = vi.fn()
    const container = mountGrid({ spy })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    a1.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = container.querySelector(
      '[data-mol-id="spreadsheet-grid-editor-A1"]',
    ) as HTMLInputElement
    input.value = 'discarded'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('<SpreadsheetGrid> selection', () => {
  it('selects a single cell on mousedown', () => {
    const container = mountGrid()
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    b2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(b2.getAttribute('aria-selected')).toBe('true')
  })

  it('extends selection on Shift+click', () => {
    const container = mountGrid({ rows: 4, columns: 4 })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    a1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    const c3 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-C3"]')!
    c3.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    // After shift+click, B2 should be in the selection rectangle.
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    expect(b2.getAttribute('aria-selected')).toBe('true')
  })

  it('extends selection on mouse drag', () => {
    const container = mountGrid({ rows: 4, columns: 4 })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    a1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    // buttons === 1 means primary mouse held down
    b2.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, buttons: 1 }))
    expect(b2.getAttribute('aria-selected')).toBe('true')
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
    const container = mountGrid({ rows: 4, columns: 4, initialCells: cells })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    a1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    b2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    const grid = container.querySelector('[role="grid"]')!
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }))
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
    const spy = vi.fn()
    const container = mountGrid({ rows: 4, columns: 4, initialCells: cells, spy })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    a1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    b2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    const grid = container.querySelector('[role="grid"]')!
    const before = grid.innerHTML
    grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true }))
    await vi.waitFor(() => {
      expect(vi.mocked(copyTextWithFallback)).toHaveBeenCalledWith('a\tb\nc\td')
    })
    expect(grid.innerHTML).toBe(before)
    expect(spy).not.toHaveBeenCalled()
  })

  it('paste event writes pasted TSV into cells starting at the anchor', () => {
    const spy = vi.fn()
    const container = mountGrid({ rows: 4, columns: 4, spy })
    // Select B2.
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    b2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    const grid = container.querySelector('[role="grid"]')!
    // Build a synthetic paste event with a 2x2 TSV payload.
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text/plain' ? '10\t20\n30\t40' : '') },
    })
    grid.dispatchEvent(event)
    // 4 cell writes starting at B2.
    expect(spy).toHaveBeenCalledWith('B2', 10)
    expect(spy).toHaveBeenCalledWith('C2', 20)
    expect(spy).toHaveBeenCalledWith('B3', 30)
    expect(spy).toHaveBeenCalledWith('C3', 40)
  })
})

describe('<SpreadsheetGrid> virtualization', () => {
  it('only renders cells inside the viewport (not all 1000 rows)', () => {
    const container = mountGrid({ rows: 1000, columns: 50 })
    const cellEls = container.querySelectorAll('[data-mol-id^="spreadsheet-grid-cell-"]')
    // Far below the upper bound for a 400×200 viewport with 80×24 cells +
    // overscan 2 — rough upper bound ≈ (5+4) cols × (8+4) rows ≈ ~108.
    expect(cellEls.length).toBeLessThan(300)
    // Last rendered cell should NOT be in row 1000 (Z1000 etc.).
    const refs = Array.from(cellEls).map((el) =>
      el.getAttribute('data-mol-id')!.replace('spreadsheet-grid-cell-', ''),
    )
    expect(refs.some((ref) => /\d{3,}$/.test(ref))).toBe(false)
  })
})

describe('<SpreadsheetGrid> frozen rows / columns', () => {
  it('renders frozen rows and columns when configured', () => {
    const cells: CellMap = new Map<string, string>([
      ['A1', 'frozen'],
      ['B2', 'scroll'],
    ])
    const container = mountGrid({
      rows: 20,
      columns: 10,
      frozenRows: 1,
      frozenCols: 1,
      initialCells: cells,
    })
    // Frozen A1 should be present.
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')
    expect(a1).not.toBeNull()
    expect(container.textContent).toContain('frozen')
  })

  it('renders without errors when frozenRows = frozenCols = 0', () => {
    const container = mountGrid({ rows: 3, columns: 3 })
    expect(container.querySelector('[role="grid"]')).not.toBeNull()
  })
})

describe('<SpreadsheetGrid> keyboard focus (a11y)', () => {
  it('makes cells focusable: the selection anchor is in the tab order, the rest stay programmatically focusable', () => {
    const container = mountGrid({ rows: 3, columns: 3 })
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
    const container = mountGrid({ rows: 3, columns: 3 })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    expect(a1.getAttribute('tabindex')).toBe('0')
    b2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(b2.getAttribute('tabindex')).toBe('0')
    expect(a1.getAttribute('tabindex')).toBe('-1')
  })

  it('keeps the container keyboard paths working from a focused cell', () => {
    const container = mountGrid({ rows: 3, columns: 3 })
    const a1 = container.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    expect(a1.getAttribute('tabindex')).toBe('0')
    // Enter on the focused cell bubbles to the grid container and opens the
    // in-cell editor for the selected cell.
    a1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(container.querySelector('[data-mol-id="spreadsheet-grid-editor-A1"]')).not.toBeNull()
  })
})
