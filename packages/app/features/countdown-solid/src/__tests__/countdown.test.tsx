// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token, the same mock
// the React package's own tests use.
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

const { Countdown } = await import('../Countdown.jsx')
const { useCountdown } = await import('../useCountdown.js')

const disposers: Array<() => void> = []

/** Renders a view with Solid's browser renderer and disposes it after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

// 1d 2h 3m 4s in ms — used as the target with the clock pinned to epoch 0.
const ONE_D_TWO_H_THREE_M_FOUR_S = 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('useCountdown', () => {
  /**
   * Renders a probe component calling the primitive with the given target and returns its state.
   *
   * @param target - The target epoch milliseconds.
   * @returns The countdown state as plain data.
   */
  function probe(target: number): Record<string, unknown> {
    let state: Record<string, unknown> = {}
    /**
     * Minimal Solid component that renders the countdown state as JSON for inspection.
     *
     * @returns The JSON text.
     */
    function Probe(): JSX.Element {
      const s = useCountdown(target)
      state = {
        days: s.days(),
        hours: s.hours(),
        minutes: s.minutes(),
        seconds: s.seconds(),
        msRemaining: s.msRemaining(),
        expired: s.expired(),
      }
      return <span>{JSON.stringify(state)}</span>
    }
    mount(() => <Probe />)
    return state
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
    const onlySeconds = mount(() => <Countdown target={30_000} />).innerHTML
    expect(onlySeconds).toContain('30s')
    expect(onlySeconds).not.toContain('d ')
    const full = mount(() => <Countdown target={ONE_D_TWO_H_THREE_M_FOUR_S} />).innerHTML
    expect(full).toContain('1d 2h 3m 4s')
  })

  it('renders the long format with pluralised unit words', () => {
    const markup = mount(() => (
      <Countdown target={ONE_D_TWO_H_THREE_M_FOUR_S} format="long" />
    )).innerHTML
    expect(markup).toContain('1 day 2 hours 3 minutes 4 seconds')
  })

  it('renders the colon format zero-padded to two digits', () => {
    const markup = mount(() => (
      <Countdown target={ONE_D_TWO_H_THREE_M_FOUR_S} format="colon" />
    )).innerHTML
    expect(markup).toContain('01:02:03:04')
  })

  it('renders the `expired` node once the target has passed', () => {
    const markup = mount(() => (
      <Countdown target={-1_000} expired={<span data-expired="">Done</span>} />
    )).innerHTML
    expect(markup).toContain('data-expired=""')
    expect(markup).toContain('Done')
  })

  it('uses the `render` prop for full control over markup', () => {
    const markup = mount(() => (
      <Countdown
        target={ONE_D_TWO_H_THREE_M_FOUR_S}
        render={(s) => <b data-render="">{`${s.days}`}</b>}
      />
    )).innerHTML
    expect(markup).toContain('data-render=""')
    expect(markup).toContain('>1<')
  })

  it('forwards className onto the wrapper span', () => {
    const markup = mount(() => <Countdown target={30_000} className="cd-cls" />).innerHTML
    expect(markup).toContain('cd-cls')
  })
})
