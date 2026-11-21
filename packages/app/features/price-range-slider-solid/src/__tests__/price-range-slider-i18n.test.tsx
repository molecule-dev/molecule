// @vitest-environment jsdom
/**
 * i18n tests for the Solid `PriceRangeSlider` — a port of
 * `@molecule/app-price-range-slider-react/src/__tests__/price-range-slider-i18n.test.tsx`:
 * the thumb labels reach the template through `t()`, so they follow the
 * active locale.
 *
 * @module
 */

import { render } from 'solid-js/web'
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
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { PriceRangeSlider } = await import('../PriceRangeSlider.jsx')

import type { PriceRangeSliderProps } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a {@link PriceRangeSlider} and returns the markup it produced. */
function renderMarkup(props: PriceRangeSliderProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => PriceRangeSlider(props), container))
  return container.innerHTML
}

describe('PriceRangeSlider i18n', () => {
  it('labels the two thumbs through i18n with their keys', () => {
    const markup = renderMarkup({ min: 0, max: 100, value: [20, 80], onChange: () => {} })
    expect(markup).toContain('aria-label="«priceRangeSlider.aria.minimum»"')
    expect(markup).toContain('aria-label="«priceRangeSlider.aria.maximum»"')
  })
})
