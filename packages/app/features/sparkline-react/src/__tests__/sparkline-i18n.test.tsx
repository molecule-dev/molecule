/**
 * The Sparkline's own text goes through i18n: a provider whose `t` returns a
 * marker, so a default that bypassed `t()` would show up as plain English
 * (the conformance kit's pseudo-locale check found exactly that in the
 * recorded `en-XA` snapshot of the default aria-label).
 *
 * @module
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the other Sparkline tests use.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { Sparkline } = await import('../Sparkline.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('Sparkline i18n', () => {
  it('renders the default aria-label through t with its key', () => {
    const markup = html(createElement(Sparkline, { values: [1, 2, 3] }))
    expect(markup).toContain('aria-label="«sparkline.aria.trendSparkline»"')
  })

  it('lets an explicit ariaLabel override the translated default', () => {
    const markup = html(createElement(Sparkline, { values: [1, 2], ariaLabel: 'Sales trend' }))
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).not.toContain('«sparkline.aria.trendSparkline»')
  })
})
