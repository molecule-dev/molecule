// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ColorSwatchPicker` — a port of
 * `@molecule/app-color-swatch-picker-react/src/__tests__/color-swatch-picker.test.tsx`:
 * the same behavioral assertions, rendered with Solid's browser renderer in
 * jsdom and asserted on the markup the component produces. jsdom serializes
 * inline styles it is given through the CSSOM (`#ff0000` becomes
 * `rgb(255, 0, 0)`), so the paint assertions check the computed color value.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
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

const { ColorSwatchPicker } = await import('../ColorSwatchPicker.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view function.
 * @returns The container element whose `innerHTML` the assertions read.
 */
function mount(view: () => ReturnType<typeof ColorSwatchPicker>): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const swatches = [
  { value: 'red', color: '#ff0000', label: 'Red' },
  { value: 'green', color: '#00ff00', label: 'Green' },
  { value: 'blue', color: '#0000ff' },
]

describe('ColorSwatchPicker', () => {
  it('renders one radio button per swatch', () => {
    const container = mount(() => (
      <ColorSwatchPicker swatches={swatches} value="red" onChange={() => {}} />
    ))
    expect(container.innerHTML.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('marks the selected swatch aria-checked', () => {
    const container = mount(() => (
      <ColorSwatchPicker swatches={swatches} value="green" onChange={() => {}} />
    ))
    expect(container.innerHTML.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('paints each swatch with its color', () => {
    const container = mount(() => (
      <ColorSwatchPicker swatches={swatches} value="red" onChange={() => {}} />
    ))
    // jsdom serializes inline styles through the CSSOM: `#ff0000` becomes
    // `rgb(255, 0, 0)`.
    expect(container.innerHTML).toContain('rgb(255, 0, 0)')
    expect(container.innerHTML).toContain('rgb(0, 0, 255)')
  })

  it('uses the label as the aria-label, falling back to value', () => {
    const container = mount(() => (
      <ColorSwatchPicker swatches={swatches} value="red" onChange={() => {}} />
    ))
    expect(container.innerHTML).toContain('aria-label="Red"')
    expect(container.innerHTML).toContain('aria-label="blue"')
  })

  it('renders the preview slot', () => {
    const container = mount(() => (
      <ColorSwatchPicker
        swatches={swatches}
        value="red"
        onChange={() => {}}
        preview={<div data-preview="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-preview=""')
  })

  it('exposes a radiogroup with the supplied aria-label and forwards className', () => {
    const container = mount(() => (
      <ColorSwatchPicker
        swatches={swatches}
        value="red"
        onChange={() => {}}
        ariaLabel="Tag color"
        className="csp-cls"
      />
    ))
    expect(container.innerHTML).toContain('role="radiogroup"')
    expect(container.innerHTML).toContain('aria-label="Tag color"')
    expect(container.innerHTML).toContain('csp-cls')
  })
})
