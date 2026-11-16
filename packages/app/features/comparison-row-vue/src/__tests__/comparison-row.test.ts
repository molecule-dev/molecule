// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ComparisonRow` — a port of
 * `@molecule/app-comparison-row-react/src/__tests__/comparison-row.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces. The delta's tone is a ClassMap class, so
 * the assertions check which `textTone-<tone>` class the row picked (the same
 * mock the React tests use).
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
        // semantic tone (`textTone-success`) the row picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { ComparisonRow } from '../ComparisonRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link ComparisonRow} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ComparisonRow, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('ComparisonRow', () => {
  it('renders the label and current value', () => {
    const markup = render({ label: 'Revenue', current: '$12,345' })
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$12,345')
  })

  it('renders the previous value (struck through) when present and omits it otherwise', () => {
    const withPrev = render({ label: 'R', current: '$100', previous: '$80' })
    expect(withPrev).toContain('$80')
    expect(withPrev).toContain('line-through')
    const without = render({ label: 'R', current: '$100' })
    expect(without).not.toContain('line-through')
  })

  it('renders an up arrow + percentage for a positive delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: 12.5 })
    expect(markup).toContain('▲')
    expect(markup).toContain('12.5%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders a down arrow for a negative delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: -8 })
    expect(markup).toContain('▼')
    expect(markup).toContain('8.0%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: 0 })
    expect(markup).toContain('–')
    expect(markup).toContain('textTone-secondary')
  })

  it('uses a custom formatDelta when supplied', () => {
    const markup = render({
      label: 'R',
      current: '$1',
      deltaPct: 5,
      formatDelta: (d: number) => h('span', { 'data-fmt': '' }, `delta ${d}`),
    })
    expect(markup).toContain('data-fmt=""')
    expect(markup).toContain('delta 5')
  })

  it('renders the periodLabel and forwards className', () => {
    const markup = render({
      label: 'R',
      current: '$1',
      periodLabel: 'vs. last week',
      className: 'cr-cls',
    })
    expect(markup).toContain('vs. last week')
    expect(markup).toContain('cr-cls')
  })
})
