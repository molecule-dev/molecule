// @vitest-environment jsdom
/**
 * Component tests of the Solid `RelativeTime`'s clock — the port of
 * `@molecule/app-relative-time-react/src/__tests__/RelativeTime.tick.test.tsx`
 * (the same test names): "now" is committed state, so the label advances when
 * the refresh interval fires, and an unrelated re-render does not re-read the
 * clock (a `refreshMs={0}` label holds its mount value). Rendered with Solid in
 * jsdom against the bonded provider.
 *
 * @module
 */

import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { RelativeTime } from '../RelativeTime.jsx'

const provider = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])
setProvider(provider)

/** The fake system clock's start. */
const START = new Date('2026-11-18T12:00:00.000Z')

/** Five minutes before {@link START} — the component reads `Date.now()` itself. */
const FIVE_MINUTES_AGO = new Date(START.getTime() - 5 * 60_000).toISOString()

/** The disposers of the roots mounted during one test. */
const disposers: Array<() => void> = []

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.useRealTimers()
  await provider.setLocale('en')
})

/** The `<time>` element's text. */
const label = (host: HTMLElement): string | null => host.querySelector('time')?.textContent ?? null

describe('<RelativeTime> clock', () => {
  it('advances the label when the refresh interval fires', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    disposers.push(
      render(() => <RelativeTime date={FIVE_MINUTES_AGO} locale="en" refreshMs={60_000} />, host),
    )
    expect(label(host)).toBe('5 minutes ago')
    vi.advanceTimersByTime(60_000)
    expect(label(host)).toBe('6 minutes ago')
  })

  it('holds its mount value on an unrelated re-render when refreshMs is 0', () => {
    const [className, setClassName] = createSignal('before')
    const host = document.createElement('div')
    document.body.appendChild(host)
    disposers.push(
      render(
        () => (
          <RelativeTime date={FIVE_MINUTES_AGO} locale="en" refreshMs={0} className={className()} />
        ),
        host,
      ),
    )
    expect(label(host)).toBe('5 minutes ago')
    vi.setSystemTime(new Date(START.getTime() + 2 * 60_000))
    setClassName('after')
    // The unrelated prop change reached the DOM; the clock it shows is still
    // the mount value.
    expect(host.querySelector('time')?.getAttribute('class')).toBe('after')
    expect(label(host)).toBe('5 minutes ago')
  })
})
