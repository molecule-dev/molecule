// @vitest-environment jsdom
/**
 * Locale-default behaviour of the Solid trace waterfall's duration labels — a
 * port of `@molecule/app-trace-waterfall-react`'s
 * `duration-labels-locale.test.tsx`: the same test name and assertion.
 *
 * The tick and badge labels format their number with `Intl.NumberFormat` in
 * the app's active locale (`useLocale()`), so a switch of the provider's
 * locale re-formats them at once (`2.5ms` → `2,5ms` in German).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { TraceWaterfall } from '../TraceWaterfall.jsx'
import type { Span } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `useLocale()` reads. */
let provider: I18nProvider

const disposers: Array<() => void> = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'de', name: 'German', translations: {} },
  ])
  setProvider(provider)
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // switch registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** Renders a {@link TraceWaterfall} with these props. */
const waterfall = (props: { spans: Span[] }): HTMLElement =>
  mount(() => <TraceWaterfall {...props} />)

/** The last axis tick (the trace's total duration). */
const lastTick = (el: HTMLElement): string =>
  el.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')[4]?.textContent ?? ''

/** The row's duration badge. */
const badge = (el: HTMLElement): string =>
  el.querySelector('[data-mol-id="trace-waterfall-duration"]')?.textContent ?? ''

/** The axis's total-duration label (the left column). */
const total = (el: HTMLElement): string =>
  el.querySelector('[data-mol-id="trace-waterfall-axis"]')?.firstElementChild?.textContent ?? ''

/** The row's `aria-label`, which names the same duration as the badge. */
const rowAria = (el: HTMLElement): string =>
  el.querySelector('[data-mol-id="trace-waterfall-row"]')?.getAttribute('aria-label') ?? ''

const spans: Span[] = [{ id: 's', name: 'lone', startTime: 0, duration: 2.5 }]

describe('TraceWaterfall duration labels locale', () => {
  it('switching the provider locale reformats the duration labels', async () => {
    const container = waterfall({ spans })
    // The trace runs 0..2.5 ms, so the last tick is 2.5ms in English.
    expect(lastTick(container)).toBe('2.5ms')
    expect(badge(container)).toBe('2.5ms')

    // The switch itself: the numbers must re-format in German (decimal comma).
    await provider.setLocale('de')
    expect(lastTick(container)).toBe('2,5ms')
    expect(badge(container)).toBe('2,5ms')
  })

  it('the total label and the row aria name the duration in the active locale', async () => {
    const container = waterfall({ spans })
    expect(total(container)).toBe('Total: 2.5ms')
    expect(rowAria(container)).toBe(' · lone · 2.5ms')

    // The `{{duration}}` placeholders carry the same localized number as the badge.
    await provider.setLocale('de')
    expect(total(container)).toBe('Total: 2,5ms')
    expect(rowAria(container)).toBe(' · lone · 2,5ms')
  })
})
