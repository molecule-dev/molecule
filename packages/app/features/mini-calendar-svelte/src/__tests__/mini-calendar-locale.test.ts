// @vitest-environment jsdom
/**
 * Locale-default behaviour of the Svelte `MiniCalendar`'s formatted names — a
 * port of `@molecule/app-mini-calendar-react`'s
 * `mini-calendar-locale.test.tsx`: the same test names and assertions.
 *
 * Without a `locale` prop the month title used to format in the BROWSER's
 * language — `Intl.DateTimeFormat(undefined, …)` — so a switch of the app's
 * i18n locale left it behind. Now the component defaults to the app's active
 * locale (`useLocale()`), so the title follows a locale switch at once. This
 * test bonds a provider with an `en` and a `de` locale, renders the calendar
 * in `en`, switches to `de`, and asserts the title re-formats — and that an
 * explicit `locale` prop still wins over the app locale.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

import MiniCalendar from '../MiniCalendar.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `useLocale()` reads. */
let provider: I18nProvider

interface Mounted {
  readonly target: HTMLElement
  destroy(): void
}

const mounted: Mounted[] = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'de', name: 'German', translations: {} },
  ])
  setProvider(provider)
})

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // switch registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts the calendar and returns the wrapper around its DOM.
 *
 * @param props - Props over the calendar.
 */
const render = (props: Record<string, unknown>): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(MiniCalendar, { target, props })
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

/** The calendar's month title. */
const title = (el: HTMLElement): string => el.querySelector('header span')?.textContent ?? ''

// Pin the visible month to March 2026 for deterministic output.
const march2026 = new Date(2026, 2, 15)

describe('MiniCalendar locale default', () => {
  it('switching the provider locale reformats the month title', async () => {
    const { target } = render({ month: march2026 })
    expect(title(target)).toBe('March 2026')

    // The switch itself: the title must re-format in German. Against the
    // browser-language default this stayed 'March 2026' — nothing tied the
    // formatter to the provider's locale.
    await provider.setLocale('de')
    flushSync()
    expect(title(target)).toBe('März 2026')
  })

  it('an explicit locale prop still wins over the app locale', async () => {
    const { target } = render({ month: march2026, locale: 'en-US' })
    await provider.setLocale('de')
    flushSync()
    expect(title(target)).toBe('March 2026')
  })
})
