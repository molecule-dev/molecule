// @vitest-environment jsdom
/**
 * The Vue port of
 * `@molecule/app-transactions-table-react/src/__tests__/i18n.test.tsx` (the
 * same test names): TransactionsTable's own text goes through `t()`, the
 * default formatters follow the provider's active locale, and the icon-font
 * glyph is hidden from assistive technology. A provider whose `t` marks every
 * string proves a default that bypassed `t()`.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type Ref } from 'vue'

// Class tokens echo their own name (methods when called, the token itself for
// the ClassMap's string fields) — the same mock the other Vue tests use.
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

// The provider's locale, switchable from the tests through the same ref the
// component reads (a real ref, so Vue re-renders on a switch).
const i18n = vi.hoisted(() => ({ locale: 'en' }))

vi.mock('@molecule/app-vue', async () => {
  const { ref } = await import('vue')
  const localeRef = ref(i18n.locale)
  return {
    useTranslation: (): { t: (key: string) => string } => ({
      t: (key: string) => `«${key}»`,
    }),
    useLocale: () => localeRef,
    __localeRef: localeRef,
  }
})

import type * as Binding from '@molecule/app-vue'

import { TransactionsTable } from '../TransactionsTable.js'
import type { TransactionRowData, TransactionsTableProps } from '../types.js'

/** The mocked binding, with the locale ref the tests switch. */
type MockedBinding = typeof Binding & { __localeRef: Ref<string> }

afterEach(async () => {
  document.body.innerHTML = ''
  i18n.locale = 'en'
  const binding = (await import('@molecule/app-vue')) as MockedBinding
  binding.__localeRef.value = 'en'
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

/** Mounts a {@link TransactionsTable}; returns its markup and a teardown. */
const mount = (props: TransactionsTableProps): { markup: () => string; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TransactionsTable, props) }))
  app.mount(host)
  return { markup: (): string => host.innerHTML, unmount: (): void => app.unmount() }
}

/** Mounts and unmounts, returning the markup the table produced. */
const render = (props: TransactionsTableProps): string => {
  const { markup, unmount } = mount(props)
  const html = markup()
  unmount()
  return html
}

/**
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
const switchLocale = async (locale: string): Promise<void> => {
  const binding = (await import('@molecule/app-vue')) as MockedBinding
  binding.__localeRef.value = locale
  await nextTick()
}

describe('TransactionsTable text', () => {
  it('takes the Date column header through i18n by default', () => {
    expect(render({ transactions: [row] })).toContain('«transactionsTable.header.date»')
  })

  it('takes the Description column header through i18n by default', () => {
    expect(render({ transactions: [row] })).toContain('«transactionsTable.header.description»')
  })

  it('takes the Category column header through i18n by default', () => {
    expect(render({ transactions: [row] })).toContain('«transactionsTable.header.category»')
  })

  it('takes the Account column header through i18n by default', () => {
    expect(render({ transactions: [row] })).toContain('«transactionsTable.header.account»')
  })

  it('takes the Amount column header through i18n by default', () => {
    expect(render({ transactions: [row] })).toContain('«transactionsTable.header.amount»')
  })

  it("keeps the caller's own column headers", () => {
    const markup = render({ transactions: [row], headers: { date: 'When', amount: 'Sum' } })
    expect(markup).toContain('When')
    expect(markup).toContain('Sum')
    expect(markup).not.toContain('«transactionsTable.header.date»')
    // The headers the caller left unset still translate.
    expect(markup).toContain('«transactionsTable.header.category»')
  })

  it('takes the retry label through i18n by default', () => {
    const markup = render({ transactions: [row], error: 'Boom', onRetry: () => {} })
    expect(markup).toContain('«transactionsTable.label.retry»')
  })

  it("keeps the caller's own retry label", () => {
    const markup = render({
      transactions: [row],
      error: 'Boom',
      onRetry: () => {},
      retryLabel: 'Reload',
    })
    expect(markup).toContain('>Reload</button>')
    expect(markup).not.toContain('«transactionsTable.label.retry»')
  })

  it("re-formats dates when the provider's locale switches", async () => {
    const view = mount({ transactions: [row] })
    expect(view.markup()).toContain('Mar 1, 2026')
    await switchLocale('de')
    expect(view.markup()).toContain('1. März 2026')
    expect(view.markup()).not.toContain('Mar 1, 2026')
    view.unmount()
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
    view.unmount()
  })

  it('formats amounts in the currency prop', () => {
    const markup = render({ transactions: [row], currency: 'EUR' })
    expect(markup).toContain('€54.20')
  })

  it('hides the category icon glyph from screen readers', () => {
    const markup = render({ transactions: [row] })
    expect(markup).toContain('<span aria-hidden="true" class="iconGlyphFont">receipt</span>')
  })
})
