// @vitest-environment jsdom
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CountdownProps } from '../types.js'

// Proxy ClassMap echoing each accessed member back as its token, the same mock
// the React package's own tests use.
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

const { default: Countdown } = await import('../Countdown.svelte')
const { default: Probe } = await import('./Probe.svelte')

const mounted: Array<ReturnType<typeof mount>> = []

// 1d 2h 3m 4s in ms — used as the target with the clock pinned to epoch 0.
const ONE_D_TWO_H_THREE_M_FOUR_S = 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000

/**
 * A snippet rendering fixed markup, the way a caller fills a slot.
 *
 * @param html - The markup to render.
 * @returns The snippet.
 */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts a countdown into the document body and flushes its first render.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The document body's markup.
 */
function render(component: Component<CountdownProps>, props: CountdownProps): string {
  mounted.push(mount(component, { target: document.body, props }))
  flushSync()
  return document.body.innerHTML
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('useCountdown', () => {
  /**
   * Mounts a probe component calling the hook with the given target and returns its state.
   *
   * @param target - The target epoch milliseconds.
   * @returns The countdown state as plain data.
   */
  function probe(target: number): Record<string, unknown> {
    mounted.push(mount(Probe, { target: document.body, props: { target } }))
    const text = document.querySelector('[data-state]')?.textContent ?? '{}'
    return JSON.parse(text) as Record<string, unknown>
  }

  it('decomposes the remaining time into days / hours / minutes / seconds', () => {
    const s = probe(ONE_D_TWO_H_THREE_M_FOUR_S)
    expect(s).toMatchObject({ days: 1, hours: 2, minutes: 3, seconds: 4, expired: false })
  })

  it('flags expired and clamps units to 0 when the target is in the past', () => {
    const s = probe(-5_000)
    expect(s.expired).toBe(true)
    expect(s).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    expect(s.msRemaining).toBeLessThan(0)
  })
})

describe('Countdown', () => {
  it('renders the compact format by default, skipping leading zero units', () => {
    const onlySeconds = render(Countdown, { target: 30_000 })
    expect(onlySeconds).toContain('30s')
    expect(onlySeconds).not.toContain('d ')
    const full = render(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S })
    expect(full).toContain('1d 2h 3m 4s')
  })

  it('renders the long format with pluralised unit words', () => {
    const markup = render(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'long' })
    expect(markup).toContain('1 day 2 hours 3 minutes 4 seconds')
  })

  it('renders the colon format zero-padded to two digits', () => {
    const markup = render(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'colon' })
    expect(markup).toContain('01:02:03:04')
  })

  it('renders the `expired` node once the target has passed', () => {
    const markup = render(Countdown, {
      target: -1_000,
      expired: raw('<span data-expired>Done</span>'),
    })
    expect(markup).toContain('data-expired=""')
    expect(markup).toContain('Done')
  })

  it('uses the `render` prop for full control over markup', () => {
    const markup = render(Countdown, {
      target: ONE_D_TWO_H_THREE_M_FOUR_S,
      render: createRawSnippet(() => ({ render: () => '<b data-render>1</b>' })),
    })
    expect(markup).toContain('data-render=""')
    expect(markup).toContain('>1<')
  })

  it('forwards className onto the wrapper span', () => {
    const markup = render(Countdown, { target: 30_000, className: 'cd-cls' })
    expect(markup).toContain('cd-cls')
  })
})
