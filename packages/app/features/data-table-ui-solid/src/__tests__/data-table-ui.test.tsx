// @vitest-environment jsdom
/**
 * Unit tests for the Solid data-table UI primitives — a port of
 * `@molecule/app-data-table-ui-react/src/__tests__/data-table-ui.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid
 * in jsdom and asserted on the markup each component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.textCenter`).
// `cn(...)` joins tokens, calling any function-valued args first — the same mock
// the React package's own tests use.
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

const { DataTableCard } = await import('../DataTableCard.jsx')
const { RowWithActions } = await import('../RowWithActions.jsx')
const { TableEmpty } = await import('../TableEmpty.jsx')
const { TableFooter } = await import('../TableFooter.jsx')
const { TableToolbar } = await import('../TableToolbar.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders one view with Solid's browser renderer and returns its markup. */
function renderMarkup(view: () => JSX.Element): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

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
    const markup = renderMarkup(() => (
      <DataTableCard
        title="My Table"
        titleAction={<a data-action="" />}
        columns={columns}
        rows={rows}
        rowKey={rowKey}
      />
    ))
    expect(markup).toContain('My Table')
    expect(markup).toContain('data-action=""')
  })

  it('omits the header row when neither title nor titleAction is given', () => {
    const markup = renderMarkup(() => (
      <DataTableCard columns={columns} rows={rows} rowKey={rowKey} />
    ))
    expect(markup).not.toContain('<h3')
  })

  it('renders every column header', () => {
    const markup = renderMarkup(() => (
      <DataTableCard columns={columns} rows={rows} rowKey={rowKey} />
    ))
    expect(markup).toContain('Name')
    expect(markup).toContain('ID')
  })

  it('renders each row via the column cell renderers', () => {
    const markup = renderMarkup(() => (
      <DataTableCard columns={columns} rows={rows} rowKey={rowKey} />
    ))
    expect(markup).toContain('cell-alpha')
    expect(markup).toContain('cell-beta')
    expect(markup).toContain('id-1')
    expect(markup).toContain('id-2')
  })

  it('renders 5 aria-hidden skeleton rows when loading', () => {
    const markup = renderMarkup(() => (
      <DataTableCard columns={columns} rows={rows} rowKey={rowKey} loading />
    ))
    expect(markup.split('aria-hidden="true"').length - 1).toBe(5)
    expect(markup).not.toContain('cell-alpha')
  })

  it('renders the emptyMessage in a single spanning cell when rows is empty', () => {
    const markup = renderMarkup(() => (
      <DataTableCard
        columns={columns}
        rows={[]}
        rowKey={rowKey}
        emptyMessage={<span data-empty="">Nothing here</span>}
      />
    ))
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing here')
    expect(markup).toContain(`colspan="${columns.length}"`)
  })

  it('marks rows clickable only when onRowClick is supplied', () => {
    const clickable = renderMarkup(() => (
      <DataTableCard columns={columns} rows={rows} rowKey={rowKey} onRowClick={() => {}} />
    ))
    expect(clickable).toContain('cursorPointer')
    const plain = renderMarkup(() => (
      <DataTableCard columns={columns} rows={rows} rowKey={rowKey} />
    ))
    expect(plain).not.toContain('cursorPointer')
  })

  it('sets data-mol-id and forwards className on the outer section', () => {
    const markup = renderMarkup(() => (
      <DataTableCard
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        dataMolId="tbl-x"
        className="card-cls"
      />
    ))
    expect(markup).toContain('data-mol-id="tbl-x"')
    expect(markup).toContain('card-cls')
  })
})

describe('RowWithActions', () => {
  it('renders the supplied row cells', () => {
    const markup = renderMarkup(() => (
      <RowWithActions>
        <td data-cell="">x</td>
      </RowWithActions>
    ))
    expect(markup).toContain('data-cell=""')
  })

  it('renders a trailing actions cell when actions is supplied', () => {
    const markup = renderMarkup(() => (
      <RowWithActions actions={<button data-act="" />}>
        <td>x</td>
      </RowWithActions>
    ))
    expect(markup).toContain('data-act=""')
  })

  it('omits the actions cell when actions is not supplied', () => {
    const markup = renderMarkup(() => (
      <RowWithActions>
        <td>x</td>
      </RowWithActions>
    ))
    expect(markup).not.toContain('data-act')
  })

  it('sets aria-selected when selected is true', () => {
    const markup = renderMarkup(() => (
      <RowWithActions selected>
        <td>x</td>
      </RowWithActions>
    ))
    expect(markup).toContain('aria-selected="true"')
  })

  it('marks the row clickable only when onClick is supplied', () => {
    const clickable = renderMarkup(() => (
      <RowWithActions onClick={() => {}}>
        <td>x</td>
      </RowWithActions>
    ))
    expect(clickable).toContain('cursorPointer')
    const plain = renderMarkup(() => (
      <RowWithActions>
        <td>x</td>
      </RowWithActions>
    ))
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className onto the <tr>', () => {
    const markup = renderMarkup(() => (
      <RowWithActions className="row-cls">
        <td>x</td>
      </RowWithActions>
    ))
    expect(markup).toContain('row-cls')
  })
})

describe('TableEmpty', () => {
  it('renders its children', () => {
    const markup = renderMarkup(() => (
      <TableEmpty colSpan={3}>
        <span data-e="">empty</span>
      </TableEmpty>
    ))
    expect(markup).toContain('data-e=""')
    expect(markup).toContain('empty')
  })

  it('applies the given colSpan to the cell', () => {
    const markup = renderMarkup(() => <TableEmpty colSpan={4} />)
    expect(markup).toContain('colspan="4"')
  })

  it('forwards className onto the cell', () => {
    const markup = renderMarkup(() => <TableEmpty colSpan={2} className="empty-cls" />)
    expect(markup).toContain('empty-cls')
  })
})

describe('TableFooter', () => {
  it('renders the left and right slots', () => {
    const markup = renderMarkup(() => (
      <TableFooter left={<span data-left="" />} right={<span data-right="" />} />
    ))
    expect(markup).toContain('data-left=""')
    expect(markup).toContain('data-right=""')
  })

  it('forwards className', () => {
    const markup = renderMarkup(() => <TableFooter className="foot-cls" />)
    expect(markup).toContain('foot-cls')
  })
})

describe('TableToolbar', () => {
  it('renders the left, right, and below slots', () => {
    const markup = renderMarkup(() => (
      <TableToolbar
        left={<span data-left="" />}
        right={<span data-right="" />}
        below={<div data-below="" />}
      />
    ))
    expect(markup).toContain('data-left=""')
    expect(markup).toContain('data-right=""')
    expect(markup).toContain('data-below=""')
  })

  it('forwards className', () => {
    const markup = renderMarkup(() => <TableToolbar className="tb-cls" />)
    expect(markup).toContain('tb-cls')
  })
})
