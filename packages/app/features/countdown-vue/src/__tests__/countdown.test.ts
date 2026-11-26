// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Component, createApp, defineComponent, h } from 'vue'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings.
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

const { Countdown } = await import('../Countdown.js')
const { useCountdown } = await import('../useCountdown.js')

/** Mounts a component into a fresh container and returns the container. */
const mount = (component: Component): HTMLElement => {
  const container = document.createElement('div')
  document.body.append(container)
  createApp(component).mount(container)
  return container
}

// 1d 2h 3m 4s in ms — used as the target with the clock pinned to epoch 0.
const ONE_D_TWO_H_THREE_M_FOUR_S = 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(0))
})

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('useCountdown', () => {
  /**
   * Reads the composable's state inside a component setup, the way an app does.
   *
   * @param target - The target epoch milliseconds.
   * @returns The countdown state as plain data.
   */
  function probe(target: number): Record<string, unknown> {
    let state: Record<string, unknown> = {}
    mount(
      defineComponent({
        setup() {
          const s = useCountdown(target)
          state = {
            days: s.days.value,
            hours: s.hours.value,
            minutes: s.minutes.value,
            seconds: s.seconds.value,
            msRemaining: s.msRemaining.value,
            expired: s.expired.value,
          }
          return () => null
        },
      }),
    )
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
    const onlySeconds = mount(
      defineComponent({ render: () => h(Countdown, { target: 30_000 }) }),
    ).innerHTML
    expect(onlySeconds).toContain('30s')
    expect(onlySeconds).not.toContain('d ')
    const full = mount(
      defineComponent({ render: () => h(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S }) }),
    ).innerHTML
    expect(full).toContain('1d 2h 3m 4s')
  })

  it('renders the long format with pluralised unit words', () => {
    const markup = mount(
      defineComponent({
        render: () => h(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'long' }),
      }),
    ).innerHTML
    expect(markup).toContain('1 day 2 hours 3 minutes 4 seconds')
  })

  it('renders the colon format zero-padded to two digits', () => {
    const markup = mount(
      defineComponent({
        render: () => h(Countdown, { target: ONE_D_TWO_H_THREE_M_FOUR_S, format: 'colon' }),
      }),
    ).innerHTML
    expect(markup).toContain('01:02:03:04')
  })

  it('renders the `expired` node once the target has passed', () => {
    const markup = mount(
      defineComponent({
        render: () =>
          h(Countdown, {
            target: -1_000,
            expired: h('span', { 'data-expired': '' }, 'Done'),
          }),
      }),
    ).innerHTML
    expect(markup).toContain('data-expired=""')
    expect(markup).toContain('Done')
  })

  it('uses the `render` prop for full control over markup', () => {
    const markup = mount(
      defineComponent({
        render: () =>
          h(Countdown, {
            target: ONE_D_TWO_H_THREE_M_FOUR_S,
            render: (s: { days: number }) => h('b', { 'data-render': '' }, `${s.days}`),
          }),
      }),
    ).innerHTML
    expect(markup).toContain('data-render=""')
    expect(markup).toContain('>1<')
  })

  it('forwards className onto the wrapper span', () => {
    const markup = mount(
      defineComponent({
        render: () => h(Countdown, { target: 30_000, className: 'cd-cls' }),
      }),
    ).innerHTML
    expect(markup).toContain('cd-cls')
  })
})
