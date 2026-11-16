// @vitest-environment jsdom

/**
 * Locale-default behaviour of the duration labels.
 *
 * The tick and badge labels format their number with `Intl.NumberFormat` in
 * the app's active locale (`useLocale()`), so a switch of the provider's
 * locale re-formats them at once (`2.5ms` → `2,5ms` in German); the unit
 * symbol comes from the translation (`traceWaterfall.duration.ms`).
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import type { TraceWaterfallProps } from '../TraceWaterfall.js'
import type { Span } from '../types.js'

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

const { TraceWaterfall } = await import('../TraceWaterfall.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `useLocale()` reads. */
let provider: I18nProvider

let root: Root | null = null
let host: HTMLElement | null = null

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'de', name: 'German', translations: {} },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // switch registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
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
    const container = await mount({ spans })
    // The trace runs 0..2.5 ms, so the last tick is 2.5ms in English.
    expect(lastTick(container)).toBe('2.5ms')
    expect(badge(container)).toBe('2.5ms')

    // The switch itself: the numbers must re-format in German (decimal comma).
    await act(async () => {
      await provider.setLocale('de')
    })
    expect(lastTick(container)).toBe('2,5ms')
    expect(badge(container)).toBe('2,5ms')
  })

  it('the total label and the row aria name the duration in the active locale', async () => {
    const container = await mount({ spans })
    expect(total(container)).toBe('Total: 2.5ms')
    expect(rowAria(container)).toBe(' · lone · 2.5ms')

    // The `{{duration}}` placeholders carry the same localized number as the badge.
    await act(async () => {
      await provider.setLocale('de')
    })
    expect(total(container)).toBe('Total: 2,5ms')
    expect(rowAria(container)).toBe(' · lone · 2,5ms')
  })
})
