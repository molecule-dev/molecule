// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ColorSwatchPicker` — a port of
 * `@molecule/app-color-swatch-picker-react/src/__tests__/color-swatch-picker.test.tsx`:
 * the same behavioral assertions, rendered with Vue SSR and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

const { ColorSwatchPicker } = await import('../ColorSwatchPicker.js')
const { renderToString } = await import('vue/server-renderer')
const { h } = await import('vue')

/**
 * Renders a {@link ColorSwatchPicker} to static markup, the way React's
 * `renderToStaticMarkup` helper does in the React suite.
 *
 * @param props - The component props.
 * @returns The serialized markup.
 */
const html = async (props: Record<string, unknown>): Promise<string> =>
  renderToString(h(ColorSwatchPicker, props))

const swatches = [
  { value: 'red', color: '#ff0000', label: 'Red' },
  { value: 'green', color: '#00ff00', label: 'Green' },
  { value: 'blue', color: '#0000ff' },
]

describe('ColorSwatchPicker', () => {
  it('renders one radio button per swatch', async () => {
    const markup = await html({ swatches, value: 'red', onChange: () => {} })
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('marks the selected swatch aria-checked', async () => {
    const markup = await html({ swatches, value: 'green', onChange: () => {} })
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('paints each swatch with its color', async () => {
    const markup = await html({ swatches, value: 'red', onChange: () => {} })
    expect(markup).toContain('background:#ff0000')
    expect(markup).toContain('background:#0000ff')
  })

  it('uses the label as the aria-label, falling back to value', async () => {
    const markup = await html({ swatches, value: 'red', onChange: () => {} })
    expect(markup).toContain('aria-label="Red"')
    expect(markup).toContain('aria-label="blue"')
  })

  it('renders the preview slot', async () => {
    const markup = await html({
      swatches,
      value: 'red',
      onChange: () => {},
      preview: h('div', { 'data-preview': '' }),
    })
    // Vue's serializer writes a bare attribute for the empty value
    // (`data-preview`), where React writes `data-preview=""` — same attribute.
    expect(markup).toContain('data-preview')
  })

  it('exposes a radiogroup with the supplied aria-label and forwards className', async () => {
    const markup = await html({
      swatches,
      value: 'red',
      onChange: () => {},
      ariaLabel: 'Tag color',
      className: 'csp-cls',
    })
    expect(markup).toContain('role="radiogroup"')
    expect(markup).toContain('aria-label="Tag color"')
    expect(markup).toContain('csp-cls')
  })
})
