// @vitest-environment jsdom
/**
 * TransactionsTable's own text goes through `t()`, the default formatters
 * follow the provider's active locale, and the icon-font glyph is hidden from
 * assistive technology. A provider whose `t` marks every string proves a
 * default that bypassed `t()`.
 *
 * @module
 */

import { act, createElement, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TransactionsTableProps } from '../TransactionsTable.js'
import type { TransactionRowData } from '../types.js'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields).
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'cn')
            return (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c).join(' ')
          const token = String(prop)
          // `iconGlyphFont` is a string field of the ClassMap, not a method.
          if (token === 'iconGlyphFont') return token
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

// The provider's locale, switchable from the tests (React re-renders through
// the store subscription, the way the real hook does).
const i18n = vi.hoisted(() => ({ locale: 'en', listeners: new Set<() => void>() }))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, _values?: unknown, _options?: unknown) => `«${key}»`,
  }),
  useLocale: () =>
    useSyncExternalStore(
      (onChange) => {
        i18n.listeners.add(onChange)
        return () => i18n.listeners.delete(onChange)
      },
      () => i18n.locale,
      () => i18n.locale,
    ),
}))

const { TransactionsTable } = await import('../TransactionsTable.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  i18n.locale = 'en'
})

/**
 * Mounts the table in jsdom.
 *
 * @param props - Props over the row fixtures.
 * @returns The container.
 */
async function mount(props: TransactionsTableProps): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(TransactionsTable, props))
  })
  return host
}

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
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  await act(async () => {
    i18n.locale = locale
    i18n.listeners.forEach((listener) => listener())
  })
}

describe('TransactionsTable text', () => {
  it('takes the Date column header through i18n by default', async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('«transactionsTable.header.date»')
  })

  it('takes the Description column header through i18n by default', async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('«transactionsTable.header.description»')
  })

  it('takes the Category column header through i18n by default', async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('«transactionsTable.header.category»')
  })

  it('takes the Account column header through i18n by default', async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('«transactionsTable.header.account»')
  })

  it('takes the Amount column header through i18n by default', async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('«transactionsTable.header.amount»')
  })

  it("keeps the caller's own column headers", async () => {
    const container = await mount({
      transactions: [row],
      headers: { date: 'When', amount: 'Sum' },
    })
    expect(container.textContent).toContain('When')
    expect(container.textContent).toContain('Sum')
    expect(container.textContent).not.toContain('«transactionsTable.header.date»')
    // The headers the caller left unset still translate.
    expect(container.textContent).toContain('«transactionsTable.header.category»')
  })

  it('takes the retry label through i18n by default', async () => {
    const container = await mount({ transactions: [row], error: 'Boom', onRetry: () => {} })
    expect(container.querySelector('button')?.textContent).toBe('«transactionsTable.label.retry»')
  })

  it("keeps the caller's own retry label", async () => {
    const container = await mount({
      transactions: [row],
      error: 'Boom',
      onRetry: () => {},
      retryLabel: 'Reload',
    })
    expect(container.querySelector('button')?.textContent).toBe('Reload')
  })

  it("re-formats dates when the provider's locale switches", async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('Mar 1, 2026')
    await switchLocale('de')
    expect(container.textContent).toContain('1. März 2026')
    expect(container.textContent).not.toContain('Mar 1, 2026')
  })

  it("re-formats amounts when the provider's locale switches", async () => {
    const container = await mount({ transactions: [row] })
    expect(container.textContent).toContain('$54.20')
    await switchLocale('de')
    // German formats before the code with a no-break space.
    expect(container.textContent).toContain('54,20\u00a0$')
    expect(container.textContent).toContain('-54,20\u00a0$')
    expect(container.textContent).not.toContain('$54.20')
  })

  it('formats amounts in the currency prop', async () => {
    const container = await mount({ transactions: [row], currency: 'EUR' })
    expect(container.textContent).toContain('€54.20')
  })

  it('hides the category icon glyph from screen readers', async () => {
    const container = await mount({ transactions: [row] })
    const glyph = container.querySelector('span.iconGlyphFont')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
    expect(glyph?.textContent).toBe('receipt')
  })
})
