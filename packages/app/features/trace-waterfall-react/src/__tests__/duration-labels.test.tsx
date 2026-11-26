// @vitest-environment jsdom

/**
 * The axis tick and row badge duration labels go through `t()`.
 *
 * The labels used to render `formatDurationLabel`'s English directly, so a
 * switch to the pseudo-locale left `0µs` / `2.5ms` unbracketed. Now the unit
 * and the number go through `t()` as one string
 * (`traceWaterfall.duration.us` / `.ms` / `.s`). This test bonds a provider
 * whose `t` marks every call, so a label that bypassed `t` would show up as
 * plain English.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TraceWaterfallProps } from '../TraceWaterfall.js'
import type { Span } from '../types.js'

// Class tokens echo their own name.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c).join(' ')
            : () => String(prop),
      },
    ),
}))
// Each translation comes back marked with its key and its `{{value}}`, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      `«${key}:${values ? String(values.value ?? '') : ''}»`,
  }),
  useLocale: () => 'en',
}))

const { TraceWaterfall } = await import('../TraceWaterfall.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

/**
 * Mounts the waterfall in jsdom.
 *
 * @param props - Props over the waterfall.
 * @returns The host element.
 */
async function mount(props: TraceWaterfallProps): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(TraceWaterfall, props))
  })
  return host
}

const spans: Span[] = [
  { id: 'a', name: 'GET /api', service: 'edge', startTime: 0, duration: 100, status: 'ok' },
]

describe('TraceWaterfall duration labels', () => {
  it('renders axis ticks and row durations through t with their keys', async () => {
    const container = await mount({ spans })
    const ticks = container.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')
    // The trace runs 0..100 ms, so the five ticks are 0µs, 25ms, 50ms, 75ms, 100ms.
    expect(ticks[0]?.textContent).toBe('«traceWaterfall.duration.us:0»')
    expect(ticks[1]?.textContent).toBe('«traceWaterfall.duration.ms:25»')
    expect(ticks[4]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
    const badges = container.querySelectorAll('[data-mol-id="trace-waterfall-duration"]')
    expect(badges[0]?.textContent).toBe('«traceWaterfall.duration.ms:100»')
  })
})
