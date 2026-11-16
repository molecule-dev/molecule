// @vitest-environment jsdom
/**
 * The axis tick and row badge duration labels go through `t()` — a port of
 * `@molecule/app-trace-waterfall-react`'s `duration-labels.test.tsx`: the same
 * assertion, rendered with Vue in jsdom.
 *
 * The labels used to render `formatDurationLabel`'s English directly, so a
 * switch to the pseudo-locale left `0µs` / `2.5ms` unbracketed. This test
 * bonds a `t` that marks every call, so a label that bypassed `t` would show
 * up as plain English.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Each translation comes back marked with its key and its `{{value}}`, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', () => ({
  useT: () => (key: string, values?: Record<string, string | number>) =>
    `«${key}:${values ? String(values.value ?? '') : ''}»`,
  useLocale: () => ({ value: 'en' }),
}))

import { createApp, defineComponent, h } from 'vue'

import { TraceWaterfall } from '../TraceWaterfall.js'
import type { Span } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TraceWaterfall} and returns the element it mounted into. */
const render = (props: { spans: Span[] }): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TraceWaterfall, props) }))
  app.mount(host)
  return host
}

const spans: Span[] = [
  { id: 'a', name: 'GET /api', service: 'edge', startTime: 0, duration: 100, status: 'ok' },
]

describe('TraceWaterfall duration labels', () => {
  it('renders axis ticks and row durations through t with their keys', () => {
    const container = render({ spans })
    const ticks = container.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')
    // The trace runs 0..100 ms, so the five ticks are 0µs, 25ms, 50ms, 75ms, 100ms.
    expect(ticks[0]?.textContent).toBe('«traceWaterfall.duration.us:0»')
    expect(ticks[1]?.textContent).toBe('«traceWaterfall.duration.ms:25»')
    expect(ticks[4]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
    const badges = container.querySelectorAll('[data-mol-id="trace-waterfall-duration"]')
    expect(badges[0]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
  })
})
