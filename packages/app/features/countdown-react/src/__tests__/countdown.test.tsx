import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings.
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

const { Countdown } = await import('../Countdown.js')
const { useCountdown } = await import('../useCountdown.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

// 1d 2h 3m 4s in ms — used as the target with the clock pinned to epoch 0.
const ONE_D_TWO_H_THREE_M_FOUR_S = 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  // SSR-render a probe so the hook's initial computed state is inspectable.
  function probe(target: number) {
    function Probe() {
      const s = useCountdown(target)
      return createElement('span', null, JSON.stringify(s))
    }
    // `renderToStaticMarkup` HTML-escapes the JSON's quotes — decode them back.
    return JSON.parse(
      html(createElement(Probe))
        .replace(/<\/?span>/g, '')
        .replace(/&quot;/g, '"'),
    )
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
    const onlySeconds = html(createElement(Countdown, { target: 30_000 }))
    expect(onlySeconds).toContain('30s')
    expect(onlySeconds).not.toContain('d ')
    const full = html(createElement(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S }))
    expect(full).toContain('1d 2h 3m 4s')
  })

  it('renders the long format with pluralised unit words', () => {
    const markup = html(
      createElement(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'long' }),
    )
    expect(markup).toContain('1 day 2 hours 3 minutes 4 seconds')
  })

  it('renders the colon format zero-padded to two digits', () => {
    const markup = html(
      createElement(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'colon' }),
    )
    expect(markup).toContain('01:02:03:04')
  })

  it('renders the `expired` node once the target has passed', () => {
    const markup = html(
      createElement(Countdown, {
        target: -1_000,
        expired: createElement('span', { 'data-expired': '' }, 'Done'),
      }),
    )
    expect(markup).toContain('data-expired=""')
    expect(markup).toContain('Done')
  })

  it('uses the `render` prop for full control over markup', () => {
    const markup = html(
      createElement(Countdown, {
        target: ONE_D_TWO_H_THREE_M_FOUR_S,
        render: (s) => createElement('b', { 'data-render': '' }, `${s.days}`),
      }),
    )
    expect(markup).toContain('data-render=""')
    expect(markup).toContain('>1<')
  })

  it('forwards className onto the wrapper span', () => {
    const markup = html(createElement(Countdown, { target: 30_000, className: 'cd-cls' }))
    expect(markup).toContain('cd-cls')
  })
})
