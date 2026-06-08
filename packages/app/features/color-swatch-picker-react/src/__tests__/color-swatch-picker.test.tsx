import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { ColorSwatchPicker } = await import('../ColorSwatchPicker.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const swatches = [
  { value: 'red', color: '#ff0000', label: 'Red' },
  { value: 'green', color: '#00ff00', label: 'Green' },
  { value: 'blue', color: '#0000ff' },
]

describe('ColorSwatchPicker', () => {
  it('renders one radio button per swatch', () => {
    const markup = html(
      createElement(ColorSwatchPicker, { swatches, value: 'red', onChange: () => {} }),
    )
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('marks the selected swatch aria-checked', () => {
    const markup = html(
      createElement(ColorSwatchPicker, { swatches, value: 'green', onChange: () => {} }),
    )
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('paints each swatch with its color', () => {
    const markup = html(
      createElement(ColorSwatchPicker, { swatches, value: 'red', onChange: () => {} }),
    )
    expect(markup).toContain('background:#ff0000')
    expect(markup).toContain('background:#0000ff')
  })

  it('uses the label as the aria-label, falling back to value', () => {
    const markup = html(
      createElement(ColorSwatchPicker, { swatches, value: 'red', onChange: () => {} }),
    )
    expect(markup).toContain('aria-label="Red"')
    expect(markup).toContain('aria-label="blue"')
  })

  it('renders the preview slot', () => {
    const markup = html(
      createElement(ColorSwatchPicker, {
        swatches,
        value: 'red',
        onChange: () => {},
        preview: createElement('div', { 'data-preview': '' }),
      }),
    )
    expect(markup).toContain('data-preview=""')
  })

  it('exposes a radiogroup with the supplied aria-label and forwards className', () => {
    const markup = html(
      createElement(ColorSwatchPicker, {
        swatches,
        value: 'red',
        onChange: () => {},
        ariaLabel: 'Tag color',
        className: 'csp-cls',
      }),
    )
    expect(markup).toContain('role="radiogroup"')
    expect(markup).toContain('aria-label="Tag color"')
    expect(markup).toContain('csp-cls')
  })
})
