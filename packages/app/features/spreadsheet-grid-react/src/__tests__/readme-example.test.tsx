// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type CellMap, SpreadsheetGrid, type SpreadsheetSelection } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered spreadsheet.
 */
function BudgetSheet(): React.JSX.Element {
  const [cells, setCells] = useState<CellMap>(
    () =>
      new Map<string, string | number>([
        ['A1', 'Item'],
        ['B1', 'Cost'],
        ['A2', 'Rent'],
        ['B2', 1200],
      ]),
  )
  const [selection, setSelection] = useState<SpreadsheetSelection>({ r1: 0, c1: 0, r2: 0, c2: 0 })
  return (
    <SpreadsheetGrid
      rows={100}
      columns={10}
      cells={cells}
      onCellChange={(ref, value) => {
        setCells((prev) => {
          const next = new Map(prev)
          if (value === null) next.delete(ref)
          else next.set(ref, value)
          return next
        })
      }}
      selection={selection}
      onSelectionChange={setSelection}
      frozenRows={1}
      frozenCols={1}
    />
  )
}

/**
 * Renders the example inside the i18n provider the grid requires.
 *
 * @returns The testing-library render result.
 */
function renderSheet(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <BudgetSheet />
    </I18nProvider>,
  )
}

/**
 * Finds a rendered cell by its A1 ref.
 *
 * @param container - The render container.
 * @param ref - A1 reference.
 * @returns The cell element.
 */
function cell(container: HTMLElement, ref: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-mol-id="spreadsheet-grid-cell-${ref}"]`)
  if (!el) throw new Error(`cell ${ref} not rendered`)
  return el
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the seeded cells in a 100x10 grid', () => {
    const { container, getByRole } = renderSheet()
    const grid = getByRole('grid', { name: 'Spreadsheet' })
    expect(grid.getAttribute('aria-rowcount')).toBe('100')
    expect(grid.getAttribute('aria-colcount')).toBe('10')
    expect(cell(container, 'A2').textContent).toBe('Rent')
    expect(cell(container, 'B2').textContent).toBe('1200')
  })

  it('stores an edit in the parent state (numbers coerced) and clears on empty', () => {
    const { container, getByLabelText } = renderSheet()
    fireEvent.doubleClick(cell(container, 'B3'))
    const editor = getByLabelText('Edit cell B3')
    fireEvent.change(editor, { target: { value: '45' } })
    fireEvent.keyDown(editor, { key: 'Enter' })
    expect(cell(container, 'B3').textContent).toBe('45')

    fireEvent.doubleClick(cell(container, 'B2'))
    const editor2 = getByLabelText('Edit cell B2')
    fireEvent.change(editor2, { target: { value: '' } })
    fireEvent.keyDown(editor2, { key: 'Enter' })
    expect(cell(container, 'B2').textContent).toBe('')
  })

  it('selects a cell on mousedown', () => {
    const { container } = renderSheet()
    fireEvent.mouseDown(cell(container, 'C4'))
    expect(cell(container, 'C4').getAttribute('aria-selected')).toBe('true')
    expect(cell(container, 'A1').getAttribute('aria-selected')).toBeNull()
  })
})
