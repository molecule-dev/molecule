// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TrendChip` — a port of
 * `@molecule/app-trend-chip-react/src/__tests__/trend-chip.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces. Inline colors are set through the CSSOM,
 * so jsdom serializes them as `rgb(...)` (the same values React's runtime
 * mount produces).
 *
 * @module
 */

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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { TrendChip } from '../TrendChip.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TrendChip} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TrendChip, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('TrendChip', () => {
  it('renders an up arrow + green for a positive delta', () => {
    const markup = render({ delta: 12 })
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('rgb(34, 197, 94)')
  })

  it('renders a down arrow + red for a negative delta', () => {
    const markup = render({ delta: -8 })
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('rgb(239, 68, 68)')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = render({ delta: 0 })
    expect(markup).toContain('–')
    expect(markup).toContain('rgb(148, 163, 184)')
  })

  it('honours an explicit direction override', () => {
    const markup = render({ delta: 5, direction: 'down' })
    expect(markup).toContain('▼')
  })

  it('uses the default "%" suffix and a custom suffix', () => {
    expect(render({ delta: 3 })).toContain('3%')
    expect(render({ delta: 3, suffix: 'pts' })).toContain('3pts')
  })

  it('renders a colored pill background for the pill variant', () => {
    const markup = render({ delta: 4, variant: 'pill' })
    expect(markup).toContain('border-radius: 999px')
    expect(markup).toContain('background: rgb(34, 197, 94)')
    expect(markup).toContain('color: rgb(255, 255, 255)')
  })

  it('honours a custom ariaLabel and forwards className', () => {
    const markup = render({ delta: 1, ariaLabel: 'Up one percent', className: 'tc-cls' })
    expect(markup).toContain('aria-label="Up one percent"')
    expect(markup).toContain('tc-cls')
  })

  it('renders a string prefix and feeds the default aria label', () => {
    const markup = render({ delta: 2, prefix: '$' })
    expect(markup).toContain('aria-label="$▲ 2%"')
    expect(markup).toContain('$')
  })

  it('renders a node prefix passed as a prop or as the same-named slot', () => {
    const asProp = render({ delta: 4, ariaLabel: 'up', prefix: h('strong', '+') })
    expect(asProp).toContain('<strong>+</strong>')
    const asSlot = render({ delta: 4, ariaLabel: 'up' }, { prefix: () => [h('strong', '+')] })
    expect(asSlot).toContain('<strong>+</strong>')
  })
})
