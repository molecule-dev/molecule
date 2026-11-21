// @vitest-environment jsdom
/**
 * Unit tests for the Angular `SpreadsheetGrid` — a port of
 * `@molecule/app-spreadsheet-grid-react/src/__tests__/SpreadsheetGrid.test.tsx`:
 * the same test names and the same assertions, mounted through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'

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

/** What the grid's harness starts from. */
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
 * The harness: a grid whose `cells` and `selection` the harness owns, so a
 * test can drive it through user actions (the React suite's `Harness`).
 */
class GridHost {
  /** The grid's starting props. */
  options: GridOptions = {}

  /** The grid's cell data. */
  readonly cells = signal<CellMap>(new Map())

  /** The grid's selection. */
  readonly selection = signal<SpreadsheetSelection>({ r1: 0, c1: 0, r2: 0, c2: 0 })

  /** Records the commit, then applies it to the harness's cell map. */
  readonly onCellChange = (ref: string, value: string | number | boolean | null): void => {
    this.options.spy?.(ref, value)
    const next = new Map(this.cells())
    if (value === null) next.delete(ref)
    else next.set(ref, value)
    this.cells.set(next)
  }

  /** Applies the new selection. */
  readonly onSelectionChange = (next: SpreadsheetSelection): void => {
    this.selection.set(next)
  }
}

/**
 * The harness component, built once: `Component()(type)` rather than a
 * decorator, because a decorated class cannot be transformed inside this
 * package's `__tests__` directory.
 */
const GridHarness = Component({
  selector: 'mol-grid',
  standalone: true,
  imports: [SpreadsheetGrid],
  changeDetection: ChangeDetectionStrategy.Default,
  // prettier-ignore
  template: `<div mol-spreadsheet-grid [rows]="options.rows ?? 5" [columns]="options.columns ?? 5" [cells]="cells()" [selection]="selection()" [onCellChange]="onCellChange" [onSelectionChange]="onSelectionChange" [frozenRows]="options.frozenRows" [frozenCols]="options.frozenCols" [viewportWidth]="400" [viewportHeight]="200" [cellWidth]="80" [cellHeight]="24"></div>`,
})(GridHost)

/** A mounted grid: its DOM, its application, and a teardown. */
interface Mounted {
  /** The host element whose children the component produced. */
  readonly root: HTMLElement
  /** The application, for an explicit change-detection pass. */
  readonly appRef: ApplicationRef
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts the grid inside a harness that owns `cells` + `selection`.
 *
 * @param options - The grid's starting props.
 * @returns The mounted grid.
 */
async function mountGrid(options: GridOptions = {}): Promise<Mounted> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<GridHost> = createComponent(GridHarness, {
    environmentInjector: appRef.injector,
  })
  const instance = ref.instance
  instance.options = options
  instance.cells.set(new Map(options.initialCells ?? new Map()))
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    root,
    appRef,
    destroy: async () => {
      appRef.destroy()
      root.remove()
    },
  }
}

/**
 * Dispatches one event and runs a change-detection pass.
 *
 * @param grid - The mounted grid.
 * @param element - The element to dispatch on.
 * @param event - The event.
 */
function fire(grid: Mounted, element: Element, event: Event): void {
  element.dispatchEvent(event)
  grid.appRef.tick()
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
  it('renders the grid with role=grid and column/row counts', async () => {
    const grid = await mountGrid({ rows: 10, columns: 6 })
    mounted.push(grid)
    const element = grid.root.querySelector('[role="grid"]')
    expect(element).not.toBeNull()
    expect(element?.getAttribute('aria-rowcount')).toBe('10')
    expect(element?.getAttribute('aria-colcount')).toBe('6')
  })

  it('renders column letters and row numbers in headers', async () => {
    const grid = await mountGrid({ rows: 3, columns: 3 })
    mounted.push(grid)
    const headers = grid.root.querySelectorAll('[role="columnheader"]')
    const labels = Array.from(headers).map((header) => header.textContent?.trim())
    expect(labels).toContain('A')
    expect(labels).toContain('B')
    expect(labels).toContain('C')
  })

  it('renders cell values from the cells map', async () => {
    const cells: CellMap = new Map<string, string | number>([
      ['A1', 'apple'],
      ['B2', 42],
    ])
    const grid = await mountGrid({ rows: 3, columns: 3, initialCells: cells })
    mounted.push(grid)
    expect(grid.root.textContent).toContain('apple')
    expect(grid.root.textContent).toContain('42')
  })
})

describe('<SpreadsheetGrid> editing', () => {
  it('starts editing on double-click and commits on Enter', async () => {
    const spy = vi.fn()
    const grid = await mountGrid({ spy })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')
    expect(a1).not.toBeNull()
    fire(grid, a1!, new MouseEvent('dblclick', { bubbles: true }))
    const input = grid.root.querySelector(
      '[data-mol-id="spreadsheet-grid-editor-A1"]',
    ) as HTMLInputElement | null
    expect(input).not.toBeNull()
    input!.value = '17'
    fire(grid, input!, new Event('input', { bubbles: true }))
    fire(grid, input!, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(spy).toHaveBeenCalledWith('A1', 17)
  })

  it('cancels edit on Escape and does not commit', async () => {
    const spy = vi.fn()
    const grid = await mountGrid({ spy })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    fire(grid, a1, new MouseEvent('dblclick', { bubbles: true }))
    const input = grid.root.querySelector(
      '[data-mol-id="spreadsheet-grid-editor-A1"]',
    ) as HTMLInputElement
    input.value = 'discarded'
    fire(grid, input, new Event('input', { bubbles: true }))
    fire(grid, input, new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('<SpreadsheetGrid> selection', () => {
  it('selects a single cell on mousedown', async () => {
    const grid = await mountGrid()
    mounted.push(grid)
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fire(grid, b2, new MouseEvent('mousedown', { bubbles: true }))
    expect(b2.getAttribute('aria-selected')).toBe('true')
  })

  it('extends selection on Shift+click', async () => {
    const grid = await mountGrid({ rows: 4, columns: 4 })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    fire(grid, a1, new MouseEvent('mousedown', { bubbles: true }))
    const c3 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-C3"]')!
    fire(grid, c3, new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    // After shift+click, B2 should be in the selection rectangle.
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    expect(b2.getAttribute('aria-selected')).toBe('true')
  })

  it('extends selection on mouse drag', async () => {
    const grid = await mountGrid({ rows: 4, columns: 4 })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    fire(grid, a1, new MouseEvent('mousedown', { bubbles: true }))
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    // buttons === 1 means primary mouse held down
    fire(grid, b2, new MouseEvent('mouseenter', { bubbles: false, buttons: 1 }))
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
    const grid = await mountGrid({ rows: 4, columns: 4, initialCells: cells })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fire(grid, a1, new MouseEvent('mousedown', { bubbles: true }))
    fire(grid, b2, new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    const element = grid.root.querySelector('[role="grid"]')!
    fire(grid, element, new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }))
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
    const grid = await mountGrid({ rows: 4, columns: 4, initialCells: cells, spy })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fire(grid, a1, new MouseEvent('mousedown', { bubbles: true }))
    fire(grid, b2, new MouseEvent('mousedown', { bubbles: true, shiftKey: true }))
    const element = grid.root.querySelector('[role="grid"]')!
    const before = element.innerHTML
    fire(grid, element, new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true }))
    await vi.waitFor(() => {
      expect(vi.mocked(copyTextWithFallback)).toHaveBeenCalledWith('a\tb\nc\td')
    })
    expect(element.innerHTML).toBe(before)
    expect(spy).not.toHaveBeenCalled()
  })

  it('paste event writes pasted TSV into cells starting at the anchor', async () => {
    const spy = vi.fn()
    const grid = await mountGrid({ rows: 4, columns: 4, spy })
    mounted.push(grid)
    // Select B2.
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    fire(grid, b2, new MouseEvent('mousedown', { bubbles: true }))
    const element = grid.root.querySelector('[role="grid"]')!
    // Build a synthetic paste event with a 2x2 TSV payload.
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text/plain' ? '10\t20\n30\t40' : '') },
    })
    fire(grid, element, event)
    // 4 cell writes starting at B2.
    expect(spy).toHaveBeenCalledWith('B2', 10)
    expect(spy).toHaveBeenCalledWith('C2', 20)
    expect(spy).toHaveBeenCalledWith('B3', 30)
    expect(spy).toHaveBeenCalledWith('C3', 40)
  })
})

describe('<SpreadsheetGrid> virtualization', () => {
  it('only renders cells inside the viewport (not all 1000 rows)', async () => {
    const grid = await mountGrid({ rows: 1000, columns: 50 })
    mounted.push(grid)
    const cellEls = grid.root.querySelectorAll('[data-mol-id^="spreadsheet-grid-cell-"]')
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
  it('renders frozen rows and columns when configured', async () => {
    const cells: CellMap = new Map<string, string>([
      ['A1', 'frozen'],
      ['B2', 'scroll'],
    ])
    const grid = await mountGrid({
      rows: 20,
      columns: 10,
      frozenRows: 1,
      frozenCols: 1,
      initialCells: cells,
    })
    mounted.push(grid)
    // Frozen A1 should be present.
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')
    expect(a1).not.toBeNull()
    expect(grid.root.textContent).toContain('frozen')
  })

  it('renders without errors when frozenRows = frozenCols = 0', async () => {
    const grid = await mountGrid({ rows: 3, columns: 3 })
    mounted.push(grid)
    expect(grid.root.querySelector('[role="grid"]')).not.toBeNull()
  })
})

describe('<SpreadsheetGrid> keyboard focus (a11y)', () => {
  it('makes cells focusable: the selection anchor is in the tab order, the rest stay programmatically focusable', async () => {
    const grid = await mountGrid({ rows: 3, columns: 3 })
    mounted.push(grid)
    const cellEls = grid.root.querySelectorAll('[role="gridcell"]')
    expect(cellEls.length).toBeGreaterThan(1)
    // Exactly one cell — the anchor (A1 by default) — carries tabIndex={0};
    // every other cell is focusable via tabIndex={-1} (roving tabindex).
    for (const cell of cellEls) {
      expect(cell.getAttribute('tabindex')).not.toBeNull()
      if (cell === cellEls[0]) expect(cell.getAttribute('tabindex')).toBe('0')
      else expect(cell.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('moves the roving tabindex when the selection anchor moves', async () => {
    const grid = await mountGrid({ rows: 3, columns: 3 })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    const b2 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-B2"]')!
    expect(a1.getAttribute('tabindex')).toBe('0')
    fire(grid, b2, new MouseEvent('mousedown', { bubbles: true }))
    expect(b2.getAttribute('tabindex')).toBe('0')
    expect(a1.getAttribute('tabindex')).toBe('-1')
  })

  it('keeps the container keyboard paths working from a focused cell', async () => {
    const grid = await mountGrid({ rows: 3, columns: 3 })
    mounted.push(grid)
    const a1 = grid.root.querySelector('[data-mol-id="spreadsheet-grid-cell-A1"]')!
    expect(a1.getAttribute('tabindex')).toBe('0')
    // Enter on the focused cell bubbles to the grid container and opens the
    // in-cell editor for the selected cell.
    fire(grid, a1, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(grid.root.querySelector('[data-mol-id="spreadsheet-grid-editor-A1"]')).not.toBeNull()
  })
})
