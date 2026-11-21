// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `TransactionsTable` — the port of
 * `@molecule/app-transactions-table-react/src/__tests__/` (the package smoke
 * test keeps React's name): the same behavioral assertions, rendered with a
 * real mount (jsdom) and asserted on the markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

import TransactionsTable from '../TransactionsTable.svelte'
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

/** Mounts a {@link TransactionsTable} and returns the host element and teardown. */
const render = (props: TransactionsTableProps): { host: HTMLElement; dispose: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(TransactionsTable, { target: host, props })
  flushSync()
  return {
    host,
    dispose: () => {
      unmount(instance)
      host.remove()
    },
  }
}

/** The markup of a mounted table, Angular-less (Svelte's comment anchors removed). */
const markup = (props: TransactionsTableProps): string => {
  const { host, dispose } = render(props)
  const html = host.innerHTML.replace(/<!--[^>]*-->/g, '')
  dispose()
  return html
}

describe('TransactionsTable', () => {
  it('renders the five columns with their default labels', () => {
    const html = markup({ transactions: rows })
    expect(html.match(/<th[ >]/g)).toHaveLength(5)
    for (const label of ['Date', 'Description', 'Category', 'Account', 'Amount'])
      expect(html).toContain(label)
  })

  it('renders the date, description, category, account and signed amount of each row', () => {
    const html = markup({ transactions: rows })
    expect(html).toContain('Mar 1, 2026')
    expect(html).toContain('Groceries')
    expect(html).toContain('Checking')
    expect(html).toContain('-$54.20')
    expect(html).toContain('+$2,450.00')
  })

  it('marks every row with its agent id', () => {
    expect(
      markup({ transactions: rows }).match(/data-mol-id="transactions-table-row"/g),
    ).toHaveLength(2)
  })

  it('renders six skeleton rows while loading', () => {
    const html = markup({ transactions: rows, loading: true })
    expect(html).toContain('data-mol-id="transactions-table-loading"')
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(6)
    expect(html).not.toContain('Groceries')
  })

  it('renders the error state and calls onRetry from its button', () => {
    const onRetry = vi.fn()
    const { host, dispose } = render({ transactions: [], error: 'Boom', onRetry })
    expect(host.innerHTML).toContain('role="alert"')
    expect(host.textContent).toContain('Boom')
    const button = host.querySelector('button')
    expect(button?.textContent).toBe('Try again')
    button?.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('omits the retry button without onRetry', () => {
    expect(markup({ transactions: [], error: 'Boom' })).not.toContain('<button')
  })

  it('renders the empty state only when there are no rows', () => {
    expect(markup({ transactions: [], emptyState: 'Nothing here' })).toContain(
      'data-mol-id="transactions-table-empty"',
    )
    expect(markup({ transactions: rows, emptyState: 'Nothing here' })).not.toContain(
      'transactions-table-empty',
    )
  })

  it('calls onRowClick with the clicked row and marks rows clickable', () => {
    const onRowClick = vi.fn()
    const { host, dispose } = render({ transactions: rows, onRowClick })
    const trs = host.querySelectorAll('tr[data-mol-id="transactions-table-row"]')
    expect(trs[0]?.getAttribute('class')).toContain('cursorPointer')
    ;(trs[0] as HTMLElement).click()
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
    dispose()
  })

  it('leaves rows inert without onRowClick', () => {
    expect(markup({ transactions: rows })).not.toContain('cursorPointer')
  })

  it('uses the category style for a matching key and the neutral style otherwise', () => {
    const html = markup({
      transactions: rows,
      categoryStyles: { groceries: { bg: '#d1fae5', color: '#059669', icon: 'cart' } },
    })
    expect(html).toContain('cart')
    expect(html).toContain('receipt')
  })

  it('forwards className to the outer shell', () => {
    expect(markup({ transactions: rows, className: 'tx-class' })).toContain('tx-class')
  })

  it('renders a footer after the table', () => {
    expect(markup({ transactions: rows, footer: 'Page 1' })).toContain('Page 1')
  })
})
