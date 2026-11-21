// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TrendChip` — a port of
 * `@molecule/app-trend-chip-react/src/__tests__/trend-chip.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`textTone-success`) the chip picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { TrendChip } from '../TrendChip.js'
import type { TrendChipProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TrendChip} and returns the markup it produced. */
const render = (props: TrendChipProps, slots?: Record<string, () => VNodeChild[]>): string => {
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
  it('renders the success tone for a positive delta', () => {
    const markup = render({ delta: 12 })
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders the error tone for a negative delta', () => {
    const markup = render({ delta: -8 })
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the secondary tone for a zero delta', () => {
    const markup = render({ delta: 0 })
    expect(markup).toContain('–')
    expect(markup).toContain('textTone-secondary')
  })

  it('honours an explicit direction override', () => {
    const markup = render({ delta: 5, direction: 'down' })
    expect(markup).toContain('▼')
    expect(markup).toContain('textTone-error')
  })

  it('uses the default "%" suffix and a custom suffix', () => {
    expect(render({ delta: 3 })).toContain('3%')
    expect(render({ delta: 3, suffix: 'pts' })).toContain('3pts')
  })

  it('renders the tonal pill fill for the pill variant', () => {
    const markup = render({ delta: 4, variant: 'pill' })
    expect(markup).toContain('bgTone-success')
    expect(markup).toContain('textOnTone')
    expect(markup).toContain('border-radius: 999px')
    expect(markup).not.toContain('background:')
    expect(markup).not.toContain('color:')
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
