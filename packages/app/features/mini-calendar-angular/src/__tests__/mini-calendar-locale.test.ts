// @vitest-environment jsdom
/**
 * Locale-default behaviour of the Angular `MiniCalendar`'s formatted names — a
 * port of `@molecule/app-mini-calendar-react`'s
 * `mini-calendar-locale.test.tsx`: the same test names and assertions.
 *
 * Without a `locale` input the month title used to format in the BROWSER's
 * language — `Intl.DateTimeFormat(undefined, …)` — so a switch of the app's
 * i18n locale left it behind. Now the component defaults to the app's active
 * locale (`useLocale()`), so the title follows a locale switch at once. This
 * test bonds a provider with an `en` and a `de` locale, renders the calendar
 * in `en`, switches to `de`, and asserts the title re-formats — and that an
 * explicit `locale` input still wins over the app locale.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size'],
      host: { 'data-button': '' },
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
  }
})

const { MiniCalendar } = await import('../mini-calendar.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `useLocale()` reads. */
let provider: I18nProvider
/** The mounted app, so a test can tick change detection after a locale switch. */
let appRef: ApplicationRef | undefined
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'de', name: 'German', translations: {} },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = undefined
  appRef = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // switch registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts the calendar through a JIT host template and returns its host
 * element.
 *
 * @param props - The props object the template reads as `p['name']`.
 */
async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const Host = Component({
    selector: 'mol-locale-host',
    standalone: true,
    imports: [MiniCalendar as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div
      mol-mini-calendar
      [month]="p['month']"
      [locale]="p['locale']"
    ></div>`,
  })(
    class LocaleHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const mountedApp: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  appRef = mountedApp
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  mountedApp.attachView(ref.hostView)
  mountedApp.tick()
  teardown = async () => {
    mountedApp.destroy()
    host.remove()
  }
  return host
}

/** The calendar's month title. */
const title = (host: HTMLElement): string => host.querySelector('header span')?.textContent ?? ''

// Pin the visible month to March 2026 for deterministic output.
const march2026 = new Date(2026, 2, 15)

describe('MiniCalendar locale default', () => {
  it('switching the provider locale reformats the month title', async () => {
    const host = await mount({ month: march2026 })
    expect(title(host)).toBe('March 2026')

    // The switch itself: the title must re-format in German. Against the
    // browser-language default this stayed 'March 2026' — nothing tied the
    // formatter to the provider's locale.
    await provider.setLocale('de')
    appRef!.tick()
    expect(title(host)).toBe('März 2026')
  })

  it('an explicit locale prop still wins over the app locale', async () => {
    const host = await mount({ month: march2026, locale: 'en-US' })
    await provider.setLocale('de')
    appRef!.tick()
    expect(title(host)).toBe('March 2026')
  })
})
