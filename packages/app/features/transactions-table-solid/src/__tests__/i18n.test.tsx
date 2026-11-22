// @vitest-environment jsdom
/**
 * The Solid port of
 * `@molecule/app-transactions-table-react/src/__tests__/i18n.test.tsx` (the
 * same test names): TransactionsTable's own text goes through `t()`, the
 * default formatters follow the provider's active locale, and the icon-font
 * glyph is hidden from assistive technology. A provider whose `t` marks every
 * string proves a default that bypassed `t()`.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other Solid tests use.
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
        // `iconGlyphFont` is a string field of the ClassMap, not a method.
        if (token === 'iconGlyphFont') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The provider's locale, switchable from the tests through the same signal the
// component reads (a real signal, so Solid re-renders on a switch).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-solid', async (importOriginal) => {
  const { createSignal } = await import('solid-js')
  const [locale, setLocale] = createSignal(i18n.locale)
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useTranslation: (): { t: (key: string) => string } => ({
      t: (key: string) => `«${key}»`,
    }),
    useLocale: () => locale,
    __setLocale: (next: string): void => {
      i18n.locale = next
      setLocale(next)
    },
  }
})

import type * as Binding from '@molecule/app-solid'

const { TransactionsTable } = await import('../TransactionsTable.jsx')
import type { TransactionRowData, TransactionsTableProps } from '../types.js'

/** The mocked binding, with the locale setter the tests switch. */
type MockedBinding = typeof Binding & { __setLocale: (locale: string) => void }

const disposers: Array<() => void> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  const binding = (await import('@molecule/app-solid')) as MockedBinding
  binding.__setLocale('en')
})

/** One expense row (the neutral category style's `receipt` icon). */
const row: TransactionRowData = {
  id: 't1',
  date: '2026-03-01T00:00:00',
  description: 'Groceries',
  categoryKey: 'groceries',
  categoryLabel: 'Groceries',
  account: 'Checking',
  amount: -54.2,
}

/**
 * Mounts a {@link TransactionsTable}; returns its markup (kept mounted until
 * the test's cleanup, so a locale switch re-renders in place).
 *
 * @param props - The props.
 * @returns The markup getter.
 */
const mount = (props: TransactionsTableProps): { markup: () => string } => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <TransactionsTable {...props} />, container))
  return { markup: (): string => container.innerHTML }
}

/**
 * Switches the mock provider's locale.
 *
 * @param locale - The locale to switch to.
 */
const switchLocale = async (locale: string): Promise<void> => {
  const binding = (await import('@molecule/app-solid')) as MockedBinding
  binding.__setLocale(locale)
}

describe('TransactionsTable text', () => {
  it('takes the Date column header through i18n by default', () => {
    expect(mount({ transactions: [row] }).markup()).toContain('«transactionsTable.header.date»')
  })

  it('takes the Description column header through i18n by default', () => {
    expect(mount({ transactions: [row] }).markup()).toContain(
      '«transactionsTable.header.description»',
    )
  })

  it('takes the Category column header through i18n by default', () => {
    expect(mount({ transactions: [row] }).markup()).toContain('«transactionsTable.header.category»')
  })

  it('takes the Account column header through i18n by default', () => {
    expect(mount({ transactions: [row] }).markup()).toContain('«transactionsTable.header.account»')
  })

  it('takes the Amount column header through i18n by default', () => {
    expect(mount({ transactions: [row] }).markup()).toContain('«transactionsTable.header.amount»')
  })

  it("keeps the caller's own column headers", () => {
    const markup = mount({ transactions: [row], headers: { date: 'When', amount: 'Sum' } }).markup()
    expect(markup).toContain('When')
    expect(markup).toContain('Sum')
    expect(markup).not.toContain('«transactionsTable.header.date»')
    // The headers the caller left unset still translate.
    expect(markup).toContain('«transactionsTable.header.category»')
  })

  it('takes the retry label through i18n by default', () => {
    const markup = mount({ transactions: [row], error: 'Boom', onRetry: () => {} }).markup()
    expect(markup).toContain('«transactionsTable.label.retry»')
  })

  it("keeps the caller's own retry label", () => {
    const markup = mount({
      transactions: [row],
      error: 'Boom',
      onRetry: () => {},
      retryLabel: 'Reload',
    }).markup()
    expect(markup).toContain('>Reload</button>')
    expect(markup).not.toContain('«transactionsTable.label.retry»')
  })

  it("re-formats dates when the provider's locale switches", async () => {
    const view = mount({ transactions: [row] })
    expect(view.markup()).toContain('Mar 1, 2026')
    await switchLocale('de')
    expect(view.markup()).toContain('1. März 2026')
    expect(view.markup()).not.toContain('Mar 1, 2026')
  })

  it("re-formats amounts when the provider's locale switches", async () => {
    const view = mount({ transactions: [row] })
    expect(view.markup()).toContain('$54.20')
    await switchLocale('de')
    // German formats before the code with a no-break space (innerHTML escapes
    // it to the entity).
    expect(view.markup()).toContain('54,20&nbsp;$')
    expect(view.markup()).toContain('-54,20&nbsp;$')
    expect(view.markup()).not.toContain('$54.20')
  })

  it('formats amounts in the currency prop', () => {
    const markup = mount({ transactions: [row], currency: 'EUR' }).markup()
    expect(markup).toContain('€54.20')
  })

  it('hides the category icon glyph from screen readers', () => {
    const markup = mount({ transactions: [row] }).markup()
    expect(markup).toContain('<span aria-hidden="true" class="iconGlyphFont">receipt</span>')
  })
})
