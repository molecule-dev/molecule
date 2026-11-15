// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TrendChip` — a port of
 * `@molecule/app-trend-chip-react/src/__tests__/trend-chip.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces. Inline colors are set through the
 * CSSOM, so jsdom serializes them as `rgb(...)` (the same values React's
 * runtime mount produces).
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

import type { JSX } from 'solid-js'

const { TrendChip } = await import('../TrendChip.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('TrendChip', () => {
  it('renders an up arrow + green for a positive delta', () => {
    const container = mount(() => <TrendChip delta={12} />)
    const markup = container.innerHTML
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('rgb(34, 197, 94)')
  })

  it('renders a down arrow + red for a negative delta', () => {
    const container = mount(() => <TrendChip delta={-8} />)
    const markup = container.innerHTML
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('rgb(239, 68, 68)')
  })

  it('renders the neutral dash for a zero delta', () => {
    const container = mount(() => <TrendChip delta={0} />)
    const markup = container.innerHTML
    expect(markup).toContain('–')
    expect(markup).toContain('rgb(148, 163, 184)')
  })

  it('honours an explicit direction override', () => {
    const container = mount(() => <TrendChip delta={5} direction="down" />)
    expect(container.innerHTML).toContain('▼')
  })

  it('uses the default "%" suffix and a custom suffix', () => {
    expect(mount(() => <TrendChip delta={3} />).innerHTML).toContain('3%')
    expect(mount(() => <TrendChip delta={3} suffix="pts" />).innerHTML).toContain('3pts')
  })

  it('renders a colored pill background for the pill variant', () => {
    const markup = mount(() => <TrendChip delta={4} variant="pill" />).innerHTML
    expect(markup).toContain('border-radius: 999px')
    expect(markup).toContain('background: rgb(34, 197, 94)')
    expect(markup).toContain('color: rgb(255, 255, 255)')
  })

  it('honours a custom ariaLabel and forwards className', () => {
    const markup = mount(() => (
      <TrendChip delta={1} ariaLabel="Up one percent" className="tc-cls" />
    )).innerHTML
    expect(markup).toContain('aria-label="Up one percent"')
    expect(markup).toContain('tc-cls')
  })

  it('renders a string prefix and feeds the default aria label', () => {
    const markup = mount(() => <TrendChip delta={2} prefix="$" />).innerHTML
    expect(markup).toContain('aria-label="$▲ 2%"')
    expect(markup).toContain('$')
  })

  it('renders a node prefix', () => {
    const markup = mount(() => (
      <TrendChip delta={4} ariaLabel="up" prefix={<strong>+</strong>} />
    )).innerHTML
    expect(markup).toContain('<strong>+</strong>')
  })
})
