// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `PriceRangeSlider` — a port of
 * `@molecule/app-price-range-slider-react/src/__tests__/price-range-slider.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import PriceRangeSlider from '../PriceRangeSlider.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts {@link PriceRangeSlider} with the given props.
 *
 * @param props - The slider props.
 * @returns The markup it produced.
 */
function render(props: Record<string, unknown>): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(PriceRangeSlider, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

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
      render({
        min: 0,
        max: 10,
        value: [1, 9],
        onChange: () => {},
        label: raw('Price range'),
      }),
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
