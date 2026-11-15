// @vitest-environment jsdom
/**
 * Unit tests for the Solid `PriceRangeSlider` — a port of
 * `@molecule/app-price-range-slider-react/src/__tests__/price-range-slider.test.tsx`:
 * the same behavioral assertions, rendered with Solid's browser renderer in
 * jsdom and asserted on the markup the component produces.
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

const base = (over: Partial<PriceRangeSliderProps>): PriceRangeSliderProps => ({
  min: 0,
  max: 10,
  value: [1, 9],
  onChange: () => {},
  ...over,
})

describe('PriceRangeSlider', () => {
  it('renders two range inputs with min/max aria-labels', () => {
    const markup = renderMarkup(base({ min: 0, max: 100, value: [20, 80] }))
    expect(markup.match(/type="range"/g) ?? []).toHaveLength(2)
    expect(markup).toContain('aria-label="Minimum"')
    expect(markup).toContain('aria-label="Maximum"')
  })

  it('reflects the value tuple on the two range inputs', () => {
    const markup = renderMarkup(base({ value: [25, 75] }))
    expect(markup).toContain('value="25"')
    expect(markup).toContain('value="75"')
  })

  it('formats the endpoint labels as USD currency by default', () => {
    const markup = renderMarkup(base({ max: 5000, value: [1000, 4000] }))
    expect(markup).toContain('$1,000')
    expect(markup).toContain('$4,000')
  })

  it('uses a custom formatValue when supplied', () => {
    const markup = renderMarkup(base({ value: [10, 90], formatValue: (n: number) => `${n}pts` }))
    expect(markup).toContain('10pts')
    expect(markup).toContain('90pts')
  })

  it('renders the label when present and omits it otherwise', () => {
    const withLabel = renderMarkup(base({ label: 'Price range' }))
    expect(withLabel).toContain('Price range')
    const withoutLabel = renderMarkup(base({}))
    expect(withoutLabel).not.toContain('Price range')
  })

  it('forwards className', () => {
    const markup = renderMarkup(base({ className: 'prs-cls' }))
    expect(markup).toContain('prs-cls')
  })
})
