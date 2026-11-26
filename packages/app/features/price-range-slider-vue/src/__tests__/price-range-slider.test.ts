// @vitest-environment jsdom
/**
 * Unit tests for the Vue `PriceRangeSlider` — a port of
 * `@molecule/app-price-range-slider-react/src/__tests__/price-range-slider.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { PriceRangeSlider } from '../PriceRangeSlider.js'
import type { PriceRangeSliderProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link PriceRangeSlider} and returns the markup it produced. */
const render = (
  props: PriceRangeSliderProps,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(PriceRangeSlider, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('PriceRangeSlider', () => {
  it('renders two range inputs with min/max aria-labels', () => {
    const markup = render({ min: 0, max: 100, value: [20, 80], onChange: () => {} })
    expect(markup.match(/type="range"/g) ?? []).toHaveLength(2)
    expect(markup).toContain('aria-label="Minimum"')
    expect(markup).toContain('aria-label="Maximum"')
  })

  it('reflects the value tuple on the two range inputs', () => {
    const markup = render({ min: 0, max: 100, value: [25, 75], onChange: () => {} })
    expect(markup).toContain('value="25"')
    expect(markup).toContain('value="75"')
  })

  it('formats the endpoint labels as USD currency by default', () => {
    const markup = render({ min: 0, max: 5000, value: [1000, 4000], onChange: () => {} })
    expect(markup).toContain('$1,000')
    expect(markup).toContain('$4,000')
  })

  it('uses a custom formatValue when supplied', () => {
    const markup = render({
      min: 0,
      max: 100,
      value: [10, 90],
      onChange: () => {},
      formatValue: (n: number) => `${n}pts`,
    })
    expect(markup).toContain('10pts')
    expect(markup).toContain('90pts')
  })

  it('renders the label when present and omits it otherwise', () => {
    expect(
      render(
        { min: 0, max: 10, value: [1, 9], onChange: () => {} },
        { label: () => ['Price range'] },
      ),
    ).toContain('Price range')
    expect(render({ min: 0, max: 10, value: [1, 9], onChange: () => {} })).not.toContain(
      'Price range',
    )
  })

  it('forwards className', () => {
    const markup = render({
      min: 0,
      max: 10,
      value: [1, 9],
      onChange: () => {},
      className: 'prs-cls',
    })
    expect(markup).toContain('prs-cls')
  })
})
