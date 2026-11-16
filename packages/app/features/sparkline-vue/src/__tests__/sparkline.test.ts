// @vitest-environment jsdom
/**
 * Unit tests for the Vue `Sparkline` — a port of
 * `@molecule/app-sparkline-react/src/__tests__/sparkline.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
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

import { createApp, defineComponent, h } from 'vue'

import { Sparkline } from '../Sparkline.js'
import type { SparklineProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link Sparkline} and returns the markup it produced.
 *
 * @param props - The sparkline props.
 * @returns The markup of the mounted sparkline.
 */
const render = (props: SparklineProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(Sparkline, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('Sparkline', () => {
  it('renders nothing when values is empty', () => {
    expect(render({ values: [] })).not.toContain('<svg')
  })

  it('renders an <svg> with role="img" and a default aria-label', () => {
    const markup = render({ values: [1, 2, 3] })
    expect(markup).toContain('<svg')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Trend sparkline"')
  })

  it('honours a custom ariaLabel and dimensions', () => {
    const markup = render({
      values: [1, 2],
      ariaLabel: 'Sales trend',
      width: 120,
      height: 40,
    })
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).toContain('width="120"')
    expect(markup).toContain('height="40"')
  })

  it('renders a polyline for the line variant', () => {
    const markup = render({ values: [1, 5, 2], variant: 'line' })
    expect(markup).toContain('<polyline')
  })

  it('renders rects for the bar variant', () => {
    const markup = render({ values: [1, 5, 2], variant: 'bar' })
    expect(markup).toContain('<rect')
  })

  it('renders circles for the dot variant', () => {
    const markup = render({ values: [1, 5, 2], variant: 'dot' })
    expect(markup).toContain('<circle')
  })

  it('applies a custom color and forwards className', () => {
    const markup = render({ values: [1, 2], color: '#ff0000', className: 'spk-cls' })
    expect(markup).toContain('#ff0000')
    expect(markup).toContain('spk-cls')
  })
})
