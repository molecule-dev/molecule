// @vitest-environment jsdom
/**
 * The web tree of Table: a table element with the React kit's rows, cells, empty state, sort and
 * row press.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type TableColumn } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Table } from '../index.web.js'

vi.mock('react-native', () => import('react-native-web'))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: (name: string) => ({ viewBox: '0 0 16 16', paths: [{ d: `path of ${name}` }] }),
}))

/**
 * The one element a selector matches.
 *
 * @param root - Where to search.
 * @param selector - The selector.
 * @returns The element.
 */
function one<E extends Element>(root: ParentNode, selector: string): E {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

const data = [
  { id: '1', name: 'Alice', role: 'Engineer' },
  { id: '2', name: 'Bob', role: 'Designer' },
]
const columns: TableColumn<(typeof data)[number]>[] = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role', align: 'right' },
]

beforeAll(() => setClassMap(classMap))
beforeEach(() => setProvider(createSimpleI18nProvider()))
afterEach(cleanup)

describe('Table on React Native Web', () => {
  it('renders a table element with the ClassMap classes on each part', () => {
    const { container } = render(
      <Table data={data} columns={columns} bordered striped testId="people" className="extra" />,
    )
    const table = one<HTMLTableElement>(container, 'div > table')
    expect(table.className).toBe(classMap.cn(classMap.table, classMap.tableBordered, 'extra'))
    expect(table.getAttribute('data-testid')).toBe('people')
    expect(table.parentElement?.className).toBe(classMap.tableWrapper)
    expect(one<HTMLElement>(table, 'thead').className).toBe(classMap.tableHeader)
    expect(one<HTMLElement>(table, 'thead > tr').className).toBe(classMap.tableRow)
    const heads = [...table.querySelectorAll('th')]
    expect(heads[0]?.className).toBe(classMap.tableHead)
    expect(heads[0]?.firstElementChild?.className).toBe(classMap.tableSortWrapper)
    expect(heads[1]?.className).toBe(classMap.cn(classMap.tableHead, classMap.textRight))
    expect(one<HTMLElement>(table, 'tbody').className).toBe(classMap.tableBody)
    const rows = [...table.querySelectorAll('tbody > tr')]
    expect(rows[0]?.className).toBe(classMap.cn(classMap.tableRow, classMap.tableRowHoverable))
    expect(rows[1]?.className).toBe(
      classMap.cn(classMap.tableRow, classMap.tableRowStriped, classMap.tableRowHoverable),
    )
    const cells = [...(rows[0]?.querySelectorAll('td') ?? [])]
    expect(cells.map((cell) => cell.textContent)).toEqual(['Alice', 'Engineer'])
    expect(cells[0]?.className).toBe(classMap.tableCell)
    expect(cells[1]?.className).toBe(classMap.cn(classMap.tableCell, classMap.textRight))
  })

  it('reports the row the user clicks, with its position', () => {
    const onRowClick = vi.fn()
    const { container } = render(<Table data={data} columns={columns} onRowClick={onRowClick} />)
    const row = one<HTMLElement>(container, 'tbody > tr:nth-child(2)')
    expect(row.className).toContain(classMap.tableRowClickable)
    fireEvent.click(row)
    expect(onRowClick).toHaveBeenCalledExactlyOnceWith(data[1], 1)
  })

  it('shows the empty state across every column when there is no data', () => {
    const { container, rerender } = render(<Table data={[]} columns={columns} />)
    const cell = one<HTMLTableCellElement>(container, 'tbody > tr > td')
    expect(cell.colSpan).toBe(2)
    expect(cell.className).toBe(classMap.tableEmptyCell)
    expect(cell.textContent).toBe('No data available')
    rerender(<Table data={[]} columns={columns} emptyContent="Nothing here" />)
    expect(one<HTMLElement>(container, 'tbody > tr > td').textContent).toBe('Nothing here')
  })

  it('sorts from the header and names the sort for assistive technology', () => {
    const onSort = vi.fn()
    const sortable = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'role', header: 'Role' },
    ]
    const { container, rerender } = render(<Table data={data} columns={sortable} onSort={onSort} />)
    const head = one<HTMLElement>(container, 'th')
    expect(head.getAttribute('aria-sort')).toBe('none')
    expect(head.className).toContain(classMap.tableHeadSortable)
    fireEvent.click(head)
    expect(onSort).toHaveBeenCalledExactlyOnceWith('name', 'asc')

    rerender(
      <Table
        data={data}
        columns={sortable}
        onSort={onSort}
        sort={{ key: 'name', direction: 'asc' }}
      />,
    )
    expect(one<HTMLElement>(container, 'th').getAttribute('aria-sort')).toBe('ascending')
    const icon = one<HTMLElement>(container, 'th > div > span')
    expect(icon.className).toBe(classMap.tableSortIcon)
    expect(icon.querySelector('svg')?.getAttribute('class')).toBe(classMap.iconSm)
    expect(icon.querySelector('path')?.getAttribute('d')).toBe('path of chevron-up')
    fireEvent.click(one<HTMLElement>(container, 'th'))
    expect(onSort).toHaveBeenLastCalledWith('name', 'desc')

    expect(one<HTMLElement>(container, 'th:nth-child(2)').getAttribute('aria-sort')).toBeNull()
  })

  it('covers the table with the loading status while it loads', () => {
    const { container } = render(<Table data={data} columns={columns} loading />)
    const overlay = one<HTMLElement>(container, ':scope > div > div')
    expect(overlay.className).toBe(classMap.tableLoadingOverlay)
    const status = one<HTMLElement>(overlay, '[role="status"]')
    expect(status.className).toBe(classMap.spinner({ size: 'lg' }))
    expect(status.getAttribute('aria-label')).toBe('Loading')
  })
})
