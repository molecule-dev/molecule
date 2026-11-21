// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TransactionsTable` — the port of
 * `@molecule/app-transactions-table-react/src/__tests__/` (the package smoke
 * test keeps React's name): the same behavioral assertions, rendered with Vue
 * in jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `transactionsTableShell`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React package's tests use.
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

import { createApp, defineComponent, h } from 'vue'

import { TransactionsTable } from '../TransactionsTable.js'
import type { TransactionRowData, TransactionsTableProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Two rows: one expense, one income. */
const rows: TransactionRowData[] = [
  {
    id: 't1',
    date: '2026-03-01T00:00:00',
    description: 'Groceries',
    categoryKey: 'Groceries',
    categoryLabel: 'Groceries',
    account: 'Checking',
    amount: -54.2,
  },
  {
    id: 't2',
    date: '2026-03-02T00:00:00',
    description: 'Salary',
    categoryKey: 'income',
    categoryLabel: 'Income',
    account: 'Savings',
    amount: 2450,
  },
]

/** Renders a {@link TransactionsTable} and returns the markup it produced. */
const render = (props: TransactionsTableProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TransactionsTable, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('TransactionsTable', () => {
  it('renders the five columns with their default labels', () => {
    const markup = render({ transactions: rows })
    expect(markup.match(/<th /g)).toHaveLength(5)
    expect(markup.match(/transactionsTableHeaderCell/g)).toHaveLength(5)
    for (const label of ['Date', 'Description', 'Category', 'Account', 'Amount'])
      expect(markup).toContain(label)
  })

  it('renders the date, description, category, account and signed amount of each row', () => {
    const markup = render({ transactions: rows })
    expect(markup).toContain('Mar 1, 2026')
    expect(markup).toContain('Groceries')
    expect(markup).toContain('Checking')
    expect(markup).toContain('-$54.20')
    expect(markup).toContain('+$2,450.00')
  })

  it('marks every row with its agent id', () => {
    expect(
      render({ transactions: rows }).match(/data-mol-id="transactions-table-row"/g),
    ).toHaveLength(2)
  })

  it('renders six skeleton rows while loading', () => {
    const markup = render({ transactions: rows, loading: true })
    expect(markup).toContain('data-mol-id="transactions-table-loading"')
    expect(markup.match(/aria-hidden="true"/g)).toHaveLength(6)
    expect(markup).not.toContain('Groceries')
  })

  it('renders the error state and calls onRetry from its button', () => {
    const onRetry = vi.fn()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: () => h(TransactionsTable, { transactions: [], error: 'Boom', onRetry }),
      }),
    )
    app.mount(host)
    expect(host.innerHTML).toContain('role="alert"')
    expect(host.innerHTML).toContain('Boom')
    const button = host.querySelector('button')
    expect(button?.textContent).toBe('Try again')
    button?.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
    app.unmount()
    host.remove()
  })

  it('omits the retry button without onRetry', () => {
    expect(render({ transactions: [], error: 'Boom' })).not.toContain('<button')
  })

  it('renders the empty state only when there are no rows', () => {
    const markup = render({ transactions: [], emptyState: 'Nothing here' })
    expect(markup).toContain('data-mol-id="transactions-table-empty"')
    expect(markup).toContain('Nothing here')
    expect(render({ transactions: rows, emptyState: 'Nothing here' })).not.toContain(
      'transactions-table-empty',
    )
  })

  it('calls onRowClick with the clicked row and marks rows clickable', () => {
    const onRowClick = vi.fn()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({ render: () => h(TransactionsTable, { transactions: rows, onRowClick }) }),
    )
    app.mount(host)
    const trs = host.querySelectorAll('tr[data-mol-id="transactions-table-row"]')
    expect(trs[0]?.getAttribute('class')).toContain('cursorPointer')
    ;(trs[0] as HTMLElement).click()
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
    app.unmount()
    host.remove()
  })

  it('leaves rows inert without onRowClick', () => {
    const markup = render({ transactions: rows })
    expect(markup).not.toContain('cursorPointer')
  })

  it('uses the category style for a matching key and the neutral style otherwise', () => {
    const markup = render({
      transactions: rows,
      categoryStyles: { groceries: { bg: '#d1fae5', color: '#059669', icon: 'cart' } },
    })
    expect(markup).toContain('cart')
    expect(markup).toContain('receipt')
  })

  it('forwards className to the outer shell', () => {
    expect(render({ transactions: rows, className: 'tx-class' })).toContain('tx-class')
  })

  it('renders a footer after the table', () => {
    const markup = render({ transactions: rows, footer: h('nav', 'Page 1') })
    expect(markup).toContain('<nav>Page 1</nav>')
  })
})
