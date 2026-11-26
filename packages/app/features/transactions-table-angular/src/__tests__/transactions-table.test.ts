// @vitest-environment jsdom
/**
 * Unit tests of `TransactionsTable` — the port of
 * `@molecule/app-transactions-table-react/src/__tests__/` (the package smoke
 * test keeps React's name): the same behavioral assertions, rendered with
 * Angular's real renderer (the same `createApplication` + JIT host approach
 * the conformance kit's Angular adapter uses) and asserted on the markup the
 * component produces.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `transactionsTableShell`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React package's tests use.
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
        // `iconGlyphFont` is a string field of the ClassMap, not a method.
        if (token === 'iconGlyphFont') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { TransactionsTable } from '../transactions-table.component.js'
import type { TransactionRowData } from '../types.js'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const TEMPLATE = `<div
  mol-transactions-table
  [transactions]="p['transactions']"
  [loading]="p['loading']"
  [error]="p['error']"
  [retryLabel]="p['retryLabel']"
  [onRetry]="p['onRetry']"
  [categoryStyles]="p['categoryStyles']"
  [className]="p['className']"
  [emptyState]="p['emptyState']"
  [footer]="p['footer']"
  [onRowClick]="p['onRowClick']"
></div>`

const mounted: Mounted[] = []

/** Hosts mounted so far: each gets its own id (Angular derives a component id from the definition). */
let hostCount = 0

/**
 * Mounts the {@link TransactionsTable} host template with the given props.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  hostCount += 1
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TransactionsTable],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(hostCount) },
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
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

/** The rendered table's own host element (the outer shell div). */
const tableOf = (m: Mounted): HTMLElement => {
  const el = m.host.querySelector('div[mol-transactions-table]')
  if (!el) throw new Error('the transactions table did not render')
  return el as HTMLElement
}

/** The host markup with Angular's structural comment anchors removed. */
const markupOf = (m: Mounted): string => m.host.innerHTML.replace(/<!--[^>]*-->/g, '')

describe('TransactionsTable', () => {
  it('renders the five columns with their default labels', async () => {
    const m = await render({ transactions: rows })
    expect(m.host.querySelectorAll('th')).toHaveLength(5)
    expect(m.host.textContent).toContain('Date')
    expect(m.host.textContent).toContain('Amount')
  })

  it('renders the date, description, category, account and signed amount of each row', async () => {
    const m = await render({ transactions: rows })
    const text = m.host.textContent ?? ''
    expect(text).toContain('Mar 1, 2026')
    expect(text).toContain('Groceries')
    expect(text).toContain('Checking')
    expect(text).toContain('-$54.20')
    expect(text).toContain('+$2,450.00')
  })

  it('marks every row with its agent id', async () => {
    const m = await render({ transactions: rows })
    expect(m.host.querySelectorAll('[data-mol-id="transactions-table-row"]')).toHaveLength(2)
  })

  it('renders six skeleton rows while loading', async () => {
    const m = await render({ transactions: rows, loading: true })
    expect(tableOf(m).getAttribute('data-mol-id')).toBe('transactions-table-loading')
    expect(m.host.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6)
    expect(m.host.textContent).not.toContain('Groceries')
  })

  it('renders the error state and calls onRetry from its button', async () => {
    const onRetry = vi.fn()
    const m = await render({ transactions: [], error: 'Boom', onRetry })
    expect(tableOf(m).getAttribute('role')).toBe('alert')
    expect(m.host.textContent).toContain('Boom')
    const button = m.host.querySelector('button')
    expect(button?.textContent).toBe('Try again')
    button?.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits the retry button without onRetry', async () => {
    const m = await render({ transactions: [], error: 'Boom' })
    expect(m.host.querySelector('button')).toBeNull()
  })

  it('renders the empty state only when there are no rows', async () => {
    const empty = await render({ transactions: [], emptyState: 'Nothing here' })
    expect(tableOf(empty).getAttribute('data-mol-id')).toBe('transactions-table-empty')
    expect(empty.host.textContent).toContain('Nothing here')
    const full = await render({ transactions: rows, emptyState: 'Nothing here' })
    expect(tableOf(full).getAttribute('data-mol-id')).toBeNull()
  })

  it('calls onRowClick with the clicked row and marks rows clickable', async () => {
    const onRowClick = vi.fn()
    const m = await render({ transactions: rows, onRowClick })
    const trs = m.host.querySelectorAll('[data-mol-id="transactions-table-row"]')
    expect(trs[0]?.getAttribute('class')).toContain('cursorPointer')
    ;(trs[0] as HTMLElement).click()
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('leaves rows inert without onRowClick', async () => {
    const m = await render({ transactions: rows })
    expect(markupOf(m)).not.toContain('cursorPointer')
  })

  it('uses the category style for a matching key and the neutral style otherwise', async () => {
    const m = await render({
      transactions: rows,
      categoryStyles: { groceries: { bg: '#d1fae5', color: '#059669', icon: 'cart' } },
    })
    const text = m.host.textContent ?? ''
    expect(text).toContain('cart')
    expect(text).toContain('receipt')
  })

  it('forwards className to the outer shell', async () => {
    const m = await render({ transactions: rows, className: 'tx-class' })
    expect(tableOf(m).getAttribute('class')).toContain('tx-class')
  })

  it('renders a footer after the table', async () => {
    const m = await render({ transactions: rows, footer: 'Page 1' })
    expect(m.host.textContent).toContain('Page 1')
  })
})
