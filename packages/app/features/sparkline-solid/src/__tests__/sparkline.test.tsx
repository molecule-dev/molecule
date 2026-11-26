// @vitest-environment jsdom
/**
 * Unit tests for the Solid `Sparkline` — a port of
 * `@molecule/app-sparkline-react/src/__tests__/sparkline.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
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

import type { JSX } from 'solid-js'

const { Sparkline } = await import('../Sparkline.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to render.
 * @returns The mount container.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('Sparkline', () => {
  it('renders nothing when values is empty', () => {
    const container = mount(() => <Sparkline values={[]} />)
    expect(container.innerHTML).not.toContain('<svg')
  })

  it('renders an <svg> with role="img" and a default aria-label', () => {
    const container = mount(() => <Sparkline values={[1, 2, 3]} />)
    const markup = container.innerHTML
    expect(markup).toContain('<svg')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Trend sparkline"')
  })

  it('honours a custom ariaLabel and dimensions', () => {
    const container = mount(() => (
      <Sparkline values={[1, 2]} ariaLabel="Sales trend" width={120} height={40} />
    ))
    const markup = container.innerHTML
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).toContain('width="120"')
    expect(markup).toContain('height="40"')
  })

  it('renders a polyline for the line variant', () => {
    const container = mount(() => <Sparkline values={[1, 5, 2]} variant="line" />)
    expect(container.innerHTML).toContain('<polyline')
  })

  it('renders rects for the bar variant', () => {
    const container = mount(() => <Sparkline values={[1, 5, 2]} variant="bar" />)
    expect(container.innerHTML).toContain('<rect')
  })

  it('renders circles for the dot variant', () => {
    const container = mount(() => <Sparkline values={[1, 5, 2]} variant="dot" />)
    expect(container.innerHTML).toContain('<circle')
  })

  it('applies a custom color and forwards className', () => {
    const container = mount(() => <Sparkline values={[1, 2]} color="#ff0000" className="spk-cls" />)
    const markup = container.innerHTML
    expect(markup).toContain('#ff0000')
    expect(markup).toContain('spk-cls')
  })
})
