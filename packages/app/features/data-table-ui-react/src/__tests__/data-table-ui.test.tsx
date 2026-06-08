import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.textCenter`).
// `cn(...)` joins tokens, calling any function-valued args first.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { DataTableCard } = await import('../DataTableCard.js')
const { RowWithActions } = await import('../RowWithActions.js')
const { TableEmpty } = await import('../TableEmpty.js')
const { TableFooter } = await import('../TableFooter.js')
const { TableToolbar } = await import('../TableToolbar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

interface Row {
  id: string
  name: string
}

const columns = [
  { key: 'name', header: 'Name', cell: (r: Row) => `cell-${r.name}` },
  { key: 'id', header: 'ID', cell: (r: Row) => `id-${r.id}` },
]
const rows: Row[] = [
  { id: '1', name: 'alpha' },
  { id: '2', name: 'beta' },
]
const rowKey = (r: Row): string => r.id

describe('DataTableCard', () => {
  it('renders the title and titleAction in the header row', () => {
    const markup = html(
      createElement(DataTableCard<Row>, {
        title: 'My Table',
        titleAction: createElement('a', { 'data-action': '' }, 'View all'),
        columns,
        rows,
        rowKey,
      }),
    )
    expect(markup).toContain('My Table')
    expect(markup).toContain('data-action=""')
  })

  it('omits the header row when neither title nor titleAction is given', () => {
    const markup = html(createElement(DataTableCard<Row>, { columns, rows, rowKey }))
    expect(markup).not.toContain('<h3')
  })

  it('renders every column header', () => {
    const markup = html(createElement(DataTableCard<Row>, { columns, rows, rowKey }))
    expect(markup).toContain('Name')
    expect(markup).toContain('ID')
  })

  it('renders each row via the column cell renderers', () => {
    const markup = html(createElement(DataTableCard<Row>, { columns, rows, rowKey }))
    expect(markup).toContain('cell-alpha')
    expect(markup).toContain('cell-beta')
    expect(markup).toContain('id-1')
    expect(markup).toContain('id-2')
  })

  it('renders 5 aria-hidden skeleton rows when loading', () => {
    const markup = html(createElement(DataTableCard<Row>, { columns, rows, rowKey, loading: true }))
    expect(markup.split('aria-hidden="true"').length - 1).toBe(5)
    expect(markup).not.toContain('cell-alpha')
  })

  it('renders the emptyMessage in a single spanning cell when rows is empty', () => {
    const markup = html(
      createElement(DataTableCard<Row>, {
        columns,
        rows: [],
        rowKey,
        emptyMessage: createElement('span', { 'data-empty': '' }, 'Nothing here'),
      }),
    )
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing here')
    expect(markup).toContain(`colSpan="${columns.length}"`)
  })

  it('marks rows clickable only when onRowClick is supplied', () => {
    const clickable = html(
      createElement(DataTableCard<Row>, { columns, rows, rowKey, onRowClick: () => {} }),
    )
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(DataTableCard<Row>, { columns, rows, rowKey }))
    expect(plain).not.toContain('cursorPointer')
  })

  it('sets data-mol-id and forwards className on the outer section', () => {
    const markup = html(
      createElement(DataTableCard<Row>, {
        columns,
        rows,
        rowKey,
        dataMolId: 'tbl-x',
        className: 'card-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="tbl-x"')
    expect(markup).toContain('card-cls')
  })
})

describe('RowWithActions', () => {
  it('renders the supplied row cells', () => {
    const markup = html(
      createElement(RowWithActions, {
        children: createElement('td', { 'data-cell': '' }, 'x'),
      }),
    )
    expect(markup).toContain('data-cell=""')
  })

  it('renders a trailing actions cell when actions is supplied', () => {
    const markup = html(
      createElement(RowWithActions, {
        children: createElement('td', null, 'x'),
        actions: createElement('button', { 'data-act': '' }),
      }),
    )
    expect(markup).toContain('data-act=""')
  })

  it('omits the actions cell when actions is not supplied', () => {
    const markup = html(createElement(RowWithActions, { children: createElement('td', null, 'x') }))
    expect(markup).not.toContain('data-act')
  })

  it('sets aria-selected when selected is true', () => {
    const markup = html(
      createElement(RowWithActions, {
        children: createElement('td', null, 'x'),
        selected: true,
      }),
    )
    expect(markup).toContain('aria-selected="true"')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = html(
      createElement(RowWithActions, {
        children: createElement('td', null, 'x'),
        onClick: () => {},
      }),
    )
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(RowWithActions, { children: createElement('td', null, 'x') }))
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className onto the <tr>', () => {
    const markup = html(
      createElement(RowWithActions, {
        children: createElement('td', null, 'x'),
        className: 'row-cls',
      }),
    )
    expect(markup).toContain('row-cls')
  })
})

describe('TableEmpty', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(TableEmpty, {
        colSpan: 3,
        children: createElement('span', { 'data-e': '' }, 'empty'),
      }),
    )
    expect(markup).toContain('data-e=""')
    expect(markup).toContain('empty')
  })

  it('applies the given colSpan to the cell', () => {
    const markup = html(createElement(TableEmpty, { colSpan: 4, children: null }))
    expect(markup).toContain('colSpan="4"')
  })

  it('forwards className onto the cell', () => {
    const markup = html(
      createElement(TableEmpty, { colSpan: 2, children: null, className: 'empty-cls' }),
    )
    expect(markup).toContain('empty-cls')
  })
})

describe('TableFooter', () => {
  it('renders the left and right slots', () => {
    const markup = html(
      createElement(TableFooter, {
        left: createElement('span', { 'data-left': '' }),
        right: createElement('span', { 'data-right': '' }),
      }),
    )
    expect(markup).toContain('data-left=""')
    expect(markup).toContain('data-right=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(TableFooter, { className: 'foot-cls' }))
    expect(markup).toContain('foot-cls')
  })
})

describe('TableToolbar', () => {
  it('renders the left, right, and below slots', () => {
    const markup = html(
      createElement(TableToolbar, {
        left: createElement('span', { 'data-left': '' }),
        right: createElement('span', { 'data-right': '' }),
        below: createElement('div', { 'data-below': '' }),
      }),
    )
    expect(markup).toContain('data-left=""')
    expect(markup).toContain('data-right=""')
    expect(markup).toContain('data-below=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(TableToolbar, { className: 'tb-cls' }))
    expect(markup).toContain('tb-cls')
  })
})
