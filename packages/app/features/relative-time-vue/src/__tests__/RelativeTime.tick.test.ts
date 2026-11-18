// @vitest-environment jsdom
/**
 * Component tests of the Vue `RelativeTime`'s clock — the port of
 * `@molecule/app-relative-time-react/src/__tests__/RelativeTime.tick.test.tsx`
 * (the same test names): "now" is committed state, so the label advances when
 * the refresh interval fires, and an unrelated re-render does not re-read the
 * clock (a `refreshMs={0}` label holds its mount value). Rendered with Vue in
 * jsdom against the bonded provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../RelativeTime.js'
import type { RelativeTimeProps } from '../types.js'

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])
setProvider(provider)

/** The fake system clock's start. */
const START = new Date('2026-11-18T12:00:00.000Z')

/** Five minutes before {@link START} — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(START.getTime() - 5 * 60_000).toISOString()

/** The apps mounted during one test, unmounted in `afterEach`. */
const mounted: Array<{ app: ReturnType<typeof createApp>; host: HTMLElement }> = []

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(async () => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
  vi.useRealTimers()
  await provider.setLocale('en')
})

/**
 * Mounts the component through a host whose render function re-reads `props`,
 * so setting a prop (React's `rerender`) re-renders the component.
 *
 * @param props - Props over `RelativeTime`, re-read on every host render.
 * @returns The host element whose content the component rendered.
 */
async function mount(props: () => RelativeTimeProps): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(RelativeTime, props()) }))
  app.mount(host)
  mounted.push({ app, host })
  await nextTick()
  return host
}

/** The `<time>` element's text. */
const label = (host: HTMLElement): string | null => host.querySelector('time')?.textContent ?? null

describe('<RelativeTime> clock', () => {
  it('advances the label when the refresh interval fires', async () => {
    const host = await mount(() => ({
      date: FIVE_MINUTES_AGO,
      locale: 'en',
      refreshMs: 60_000,
    }))
    expect(label(host)).toBe('5 minutes ago')
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(label(host)).toBe('6 minutes ago')
  })

  it('holds its mount value on an unrelated re-render when refreshMs is 0', async () => {
    const className = ref('before')
    const host = await mount(() => ({
      date: FIVE_MINUTES_AGO,
      locale: 'en',
      refreshMs: 0,
      className: className.value,
    }))
    expect(label(host)).toBe('5 minutes ago')
    vi.setSystemTime(new Date(START.getTime() + 2 * 60_000))
    className.value = 'after'
    await nextTick()
    // The unrelated prop change re-rendered the component; the clock it shows
    // is still the mount value.
    expect(host.querySelector('time')?.getAttribute('class')).toBe('after')
    expect(label(host)).toBe('5 minutes ago')
  })
})
