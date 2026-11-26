// @vitest-environment jsdom
/**
 * The axis tick and row badge duration labels go through `t()` — a port of
 * `@molecule/app-trace-waterfall-react`'s `duration-labels.test.tsx`: the same
 * assertion, rendered with a real Svelte mount (jsdom).
 *
 * The labels used to render `formatDurationLabel`'s English directly, so a
 * switch to the pseudo-locale left `0µs` / `2.5ms` unbracketed. This test
 * bonds a `t` that marks every call, so a label that bypassed `t` would show
 * up as plain English.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Each translation comes back marked with its key and its `{{value}}`, so a
// default that bypassed t() would show up as plain English. `useLocale`
// returns a readable store of the active locale, as the binding does.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useT: () => (key: string, values?: Record<string, string | number>) =>
    `«${key}:${values ? String(values.value ?? '') : ''}»`,
  useLocale: () => ({
    subscribe: (run: (locale: string) => void) => {
      run('en')
      return () => {}
    },
  }),
}))

import TraceWaterfall from '../TraceWaterfall.svelte'
import type { TraceWaterfallProps } from '../types.js'

interface Mounted {
  readonly target: HTMLElement
  destroy(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts the waterfall and returns the wrapper around its DOM.
 *
 * @param props - Props over the waterfall.
 */
const render = (props: TraceWaterfallProps): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(TraceWaterfall, { target, props })
  const m: Mounted = {
    target,
    destroy: () => {
      unmount(component)
      target.remove()
    },
  }
  mounted.push(m)
  flushSync()
  return m
}

const spans = [
  { id: 'a', name: 'GET /api', service: 'edge', startTime: 0, duration: 100, status: 'ok' },
]

describe('TraceWaterfall duration labels', () => {
  it('renders axis ticks and row durations through t with their keys', () => {
    const { target } = render({ spans } as TraceWaterfallProps)
    const ticks = target.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')
    // The trace runs 0..100 ms, so the five ticks are 0µs, 25ms, 50ms, 75ms, 100ms.
    expect(ticks[0]?.textContent).toBe('«traceWaterfall.duration.us:0»')
    expect(ticks[1]?.textContent).toBe('«traceWaterfall.duration.ms:25»')
    expect(ticks[4]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
    const badges = target.querySelectorAll('[data-mol-id="trace-waterfall-duration"]')
    expect(badges[0]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
  })
})
