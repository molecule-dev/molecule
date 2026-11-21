// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TransactionsTable` — the port of
 * `@molecule/app-transactions-table-react/src/__tests__/` (the package smoke
 * test keeps React's name): the same behavioral assertions, rendered with
 * Solid in jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
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

import type { JSX } from 'solid-js'

const { TransactionsTable } = await import('../TransactionsTable.jsx')
import type { TransactionRowData } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

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

describe('TransactionsTable', () => {
  it('renders the five columns with their default labels', () => {
    const container = mount(() => <TransactionsTable transactions={rows} />)
    expect(container.querySelectorAll('th')).toHaveLength(5)
    expect(container.textContent).toContain('Date')
    expect(container.textContent).toContain('Amount')
  })

  it('renders the date, description, category, account and signed amount of each row', () => {
    const container = mount(() => <TransactionsTable transactions={rows} />)
    expect(container.textContent).toContain('Mar 1, 2026')
    expect(container.textContent).toContain('Groceries')
    expect(container.textContent).toContain('Checking')
    expect(container.textContent).toContain('-$54.20')
    expect(container.textContent).toContain('+$2,450.00')
  })

  it('marks every row with its agent id', () => {
    const container = mount(() => <TransactionsTable transactions={rows} />)
    expect(container.querySelectorAll('[data-mol-id="transactions-table-row"]')).toHaveLength(2)
  })

  it('renders six skeleton rows while loading', () => {
    const container = mount(() => <TransactionsTable transactions={rows} loading={true} />)
    expect(container.querySelector('[data-mol-id="transactions-table-loading"]')).not.toBeNull()
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6)
    expect(container.textContent).not.toContain('Groceries')
  })

  it('renders the error state and calls onRetry from its button', () => {
    const onRetry = vi.fn()
    const container = mount(() => (
      <TransactionsTable transactions={[]} error="Boom" onRetry={onRetry} />
    ))
    expect(container.innerHTML).toContain('role="alert"')
    expect(container.textContent).toContain('Boom')
    const button = container.querySelector('button')
    expect(button?.textContent).toBe('Try again')
    button?.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits the retry button without onRetry', () => {
    const container = mount(() => <TransactionsTable transactions={[]} error="Boom" />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('renders the empty state only when there are no rows', () => {
    const empty = mount(() => <TransactionsTable transactions={[]} emptyState="Nothing here" />)
    expect(empty.querySelector('[data-mol-id="transactions-table-empty"]')).not.toBeNull()
    expect(empty.textContent).toContain('Nothing here')
    const full = mount(() => <TransactionsTable transactions={rows} emptyState="Nothing here" />)
    expect(full.querySelector('[data-mol-id="transactions-table-empty"]')).toBeNull()
  })

  it('calls onRowClick with the clicked row and marks rows clickable', () => {
    const onRowClick = vi.fn()
    const container = mount(() => <TransactionsTable transactions={rows} onRowClick={onRowClick} />)
    const trs = container.querySelectorAll('[data-mol-id="transactions-table-row"]')
    expect(trs[0]?.getAttribute('class')).toContain('cursorPointer')
    ;(trs[0] as HTMLElement).click()
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('leaves rows inert without onRowClick', () => {
    const container = mount(() => <TransactionsTable transactions={rows} />)
    expect(container.innerHTML).not.toContain('cursorPointer')
  })

  it('uses the category style for a matching key and the neutral style otherwise', () => {
    const container = mount(() => (
      <TransactionsTable
        transactions={rows}
        categoryStyles={{ groceries: { bg: '#d1fae5', color: '#059669', icon: 'cart' } }}
      />
    ))
    expect(container.textContent).toContain('cart')
    expect(container.textContent).toContain('receipt')
  })

  it('forwards className to the outer shell', () => {
    const container = mount(() => <TransactionsTable transactions={rows} className="tx-class" />)
    expect(container.innerHTML).toContain('tx-class')
  })

  it('renders a footer after the table', () => {
    const container = mount(() => (
      <TransactionsTable transactions={rows} footer={<nav>Page 1</nav>} />
    ))
    expect(container.innerHTML).toContain('<nav>Page 1</nav>')
  })
})
