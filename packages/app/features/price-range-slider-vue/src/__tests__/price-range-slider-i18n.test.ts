// @vitest-environment jsdom
/**
 * i18n tests for the Vue `PriceRangeSlider` — a port of
 * `@molecule/app-price-range-slider-react/src/__tests__/price-range-slider-i18n.test.tsx`:
 * the thumb labels reach the template through `t()`, so they follow the
 * active locale.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
// Every key renders as its marked key, so an aria-label that bypassed t()
// would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { createApp, defineComponent, h } from 'vue'

import { PriceRangeSlider } from '../PriceRangeSlider.js'
import type { PriceRangeSliderProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link PriceRangeSlider} and returns the markup it produced. */
const render = (props: PriceRangeSliderProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(PriceRangeSlider, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('PriceRangeSlider i18n', () => {
  it('labels the two thumbs through i18n with their keys', () => {
    const markup = render({ min: 0, max: 100, value: [20, 80], onChange: () => {} })
    expect(markup).toContain('aria-label="«priceRangeSlider.aria.minimum»"')
    expect(markup).toContain('aria-label="«priceRangeSlider.aria.maximum»"')
  })
})
