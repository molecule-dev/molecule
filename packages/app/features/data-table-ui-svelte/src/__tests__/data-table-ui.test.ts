// @vitest-environment jsdom
/**
 * Unit tests for the Svelte data-table UI primitives — a port of
 * `@molecule/app-data-table-ui-react/src/__tests__/data-table-ui.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Svelte 5
 * in jsdom and asserted on the markup each component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.textCenter`).
// `cn(...)` joins tokens, calling any function-valued args first — the same mock
// the React package's own tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import DataTableCard from '../DataTableCard.svelte'
import RowWithActions from '../RowWithActions.svelte'
import TableEmpty from '../TableEmpty.svelte'
import TableFooter from '../TableFooter.svelte'
import TableToolbar from '../TableToolbar.svelte'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering fixed markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** A cell snippet: the row it is handed, rendered by `render`. */
const cell = <Row>(render: (row: Row) => string): Snippet<[Row]> =>
  createRawSnippet<[Row]>((row) => ({ render: () => render(row()) }))

/** Renders one component with the given props and returns the markup it produced. */
const render = (component: unknown, props: Record<string, unknown> = {}): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component as never, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(instance)
  target.remove()
  return markup
}

interface Row {
  id: string
  name: string
}

const columns = [
  { key: 'name', header: 'Name', cell: cell<Row>((r) => `cell-${r.name}`) },
  { key: 'id', header: 'ID', cell: cell<Row>((r) => `id-${r.id}`) },
]
const rows: Row[] = [
  { id: '1', name: 'alpha' },
  { id: '2', name: 'beta' },
]
const rowKey = (r: Row): string => r.id

describe('DataTableCard', () => {
  it('renders the title and titleAction in the header row', () => {
    const markup = render(DataTableCard, {
      title: 'My Table',
      titleAction: raw('<a data-action=""></a>'),
      columns,
      rows,
      rowKey,
    })
    expect(markup).toContain('My Table')
    expect(markup).toContain('data-action=""')
  })

  it('omits the header row when neither title nor titleAction is given', () => {
    const markup = render(DataTableCard, { columns, rows, rowKey })
    expect(markup).not.toContain('<h3')
  })

  it('renders every column header', () => {
    const markup = render(DataTableCard, { columns, rows, rowKey })
    expect(markup).toContain('Name')
    expect(markup).toContain('ID')
  })

  it('renders each row via the column cell renderers', () => {
    const markup = render(DataTableCard, { columns, rows, rowKey })
    expect(markup).toContain('cell-alpha')
    expect(markup).toContain('cell-beta')
    expect(markup).toContain('id-1')
    expect(markup).toContain('id-2')
  })

  it('renders 5 aria-hidden skeleton rows when loading', () => {
    const markup = render(DataTableCard, { columns, rows, rowKey, loading: true })
    expect(markup.split('aria-hidden="true"').length - 1).toBe(5)
    expect(markup).not.toContain('cell-alpha')
  })

  it('renders the emptyMessage in a single spanning cell when rows is empty', () => {
    const markup = render(DataTableCard, {
      columns,
      rows: [],
      rowKey,
      emptyMessage: raw('<span data-empty="">Nothing here</span>'),
    })
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing here')
    expect(markup).toContain(`colspan="${columns.length}"`)
  })

  it('marks rows clickable only when onRowClick is supplied', () => {
    const clickable = render(DataTableCard, { columns, rows, rowKey, onRowClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render(DataTableCard, { columns, rows, rowKey })
    expect(plain).not.toContain('cursorPointer')
  })

  it('sets data-mol-id and forwards className on the outer section', () => {
    const markup = render(DataTableCard, {
      columns,
      rows,
      rowKey,
      dataMolId: 'tbl-x',
      className: 'card-cls',
    })
    expect(markup).toContain('data-mol-id="tbl-x"')
    expect(markup).toContain('card-cls')
  })
})

describe('RowWithActions', () => {
  it('renders the supplied row cells', () => {
    const markup = render(RowWithActions, { children: raw('<td data-cell="">x</td>') })
    expect(markup).toContain('data-cell=""')
  })

  it('renders a trailing actions cell when actions is supplied', () => {
    const markup = render(RowWithActions, {
      children: raw('<td>x</td>'),
      actions: raw('<button data-act=""></button>'),
    })
    expect(markup).toContain('data-act=""')
  })

  it('omits the actions cell when actions is not supplied', () => {
    const markup = render(RowWithActions, { children: raw('<td>x</td>') })
    expect(markup).not.toContain('data-act')
  })

  it('sets aria-selected when selected is true', () => {
    const markup = render(RowWithActions, { children: raw('<td>x</td>'), selected: true })
    expect(markup).toContain('aria-selected="true"')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = render(RowWithActions, { children: raw('<td>x</td>'), onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render(RowWithActions, { children: raw('<td>x</td>') })
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className onto the <tr>', () => {
    const markup = render(RowWithActions, { children: raw('<td>x</td>'), className: 'row-cls' })
    expect(markup).toContain('row-cls')
  })
})

describe('TableEmpty', () => {
  it('renders its children', () => {
    const markup = render(TableEmpty, {
      colSpan: 3,
      children: raw('<span data-e="">empty</span>'),
    })
    expect(markup).toContain('data-e=""')
    expect(markup).toContain('empty')
  })

  it('applies the given colSpan to the cell', () => {
    const markup = render(TableEmpty, { colSpan: 4 })
    expect(markup).toContain('colspan="4"')
  })

  it('forwards className onto the cell', () => {
    const markup = render(TableEmpty, { colSpan: 2, className: 'empty-cls' })
    expect(markup).toContain('empty-cls')
  })
})

describe('TableFooter', () => {
  it('renders the left and right slots', () => {
    const markup = render(TableFooter, {
      left: raw('<span data-left=""></span>'),
      right: raw('<span data-right=""></span>'),
    })
    expect(markup).toContain('data-left=""')
    expect(markup).toContain('data-right=""')
  })

  it('forwards className', () => {
    const markup = render(TableFooter, { className: 'foot-cls' })
    expect(markup).toContain('foot-cls')
  })
})

describe('TableToolbar', () => {
  it('renders the left, right, and below slots', () => {
    const markup = render(TableToolbar, {
      left: raw('<span data-left=""></span>'),
      right: raw('<span data-right=""></span>'),
      below: raw('<div data-below=""></div>'),
    })
    expect(markup).toContain('data-left=""')
    expect(markup).toContain('data-right=""')
    expect(markup).toContain('data-below=""')
  })

  it('forwards className', () => {
    const markup = render(TableToolbar, { className: 'tb-cls' })
    expect(markup).toContain('tb-cls')
  })
})
