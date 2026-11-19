// @vitest-environment jsdom
/**
 * Unit tests for `ColorSwatchPicker` — a port of
 * `@molecule/app-color-swatch-picker-react/src/__tests__/color-swatch-picker.test.tsx`:
 * the same behavioral assertions, mounted with Svelte 5's real client mount
 * in jsdom and asserted on the markup the component produces. jsdom
 * serializes inline styles it is given through the CSSOM (`#ff0000` becomes
 * `rgb(255, 0, 0)`), so the paint assertions check the computed color value.
 *
 * @module
 */

import { type ComponentProps, createRawSnippet, flushSync, mount, type Snippet } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

import ColorSwatchPicker from '../ColorSwatchPicker.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const swatches = [
  { value: 'red', color: '#ff0000', label: 'Red' },
  { value: 'green', color: '#00ff00', label: 'Green' },
  { value: 'blue', color: '#0000ff' },
]

/**
 * Mounts {@link ColorSwatchPicker} with the given props.
 *
 * @param props - The component props.
 * @returns The host element whose `innerHTML` the assertions read.
 */
const render = (props: ComponentProps<typeof ColorSwatchPicker>): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mount(ColorSwatchPicker, { target: host, props })
  flushSync()
  return host
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ColorSwatchPicker', () => {
  it('renders one radio button per swatch', () => {
    const host = render({ swatches, value: 'red', onChange: () => {} })
    expect(host.innerHTML.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('marks the selected swatch aria-checked', () => {
    const host = render({ swatches, value: 'green', onChange: () => {} })
    expect(host.innerHTML.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('paints each swatch with its color', () => {
    const host = render({ swatches, value: 'red', onChange: () => {} })
    // jsdom serializes inline styles through the CSSOM: `#ff0000` becomes
    // `rgb(255, 0, 0)`.
    expect(host.innerHTML).toContain('rgb(255, 0, 0)')
    expect(host.innerHTML).toContain('rgb(0, 0, 255)')
  })

  it('uses the label as the aria-label, falling back to value', () => {
    const host = render({ swatches, value: 'red', onChange: () => {} })
    expect(host.innerHTML).toContain('aria-label="Red"')
    expect(host.innerHTML).toContain('aria-label="blue"')
  })

  it('renders the preview slot', () => {
    const host = render({
      swatches,
      value: 'red',
      onChange: () => {},
      preview: raw('<div data-preview=""></div>'),
    })
    expect(host.innerHTML).toContain('data-preview=""')
  })

  it('exposes a radiogroup with the supplied aria-label and forwards className', () => {
    const host = render({
      swatches,
      value: 'red',
      onChange: () => {},
      ariaLabel: 'Tag color',
      className: 'csp-cls',
    })
    expect(host.innerHTML).toContain('role="radiogroup"')
    expect(host.innerHTML).toContain('aria-label="Tag color"')
    expect(host.innerHTML).toContain('csp-cls')
  })
})
