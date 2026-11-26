import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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
// Every key renders as its marked key, so an aria-label that bypassed t()
// would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { PriceRangeSlider } = await import('../PriceRangeSlider.js')

describe('PriceRangeSlider i18n', () => {
  it('labels the two thumbs through i18n with their keys', () => {
    const markup = renderToStaticMarkup(
      createElement(PriceRangeSlider, { min: 0, max: 100, value: [20, 80], onChange: () => {} }),
    )
    expect(markup).toContain('aria-label="«priceRangeSlider.aria.minimum»"')
    expect(markup).toContain('aria-label="«priceRangeSlider.aria.maximum»"')
  })
})
