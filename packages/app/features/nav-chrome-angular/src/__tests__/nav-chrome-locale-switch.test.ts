// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular nav-chrome shells' landmark labels
 * — a port of
 * `@molecule/app-nav-chrome-react/src/__tests__/nav-chrome-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-angular` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for a key the bottom nav renders, renders it in `en`, switches to
 * `fr`, and asserts the `aria-label` now shows the French value.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
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

const { AppShellBottomNav } = await import('../app-shell-bottom-nav.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'navChrome.aria.bottom': 'Bottom' } },
    { code: 'fr', name: 'French', translations: { 'navChrome.aria.bottom': 'Bas' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = undefined
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AppShellBottomNav locale switch', () => {
  it('renders the bottom nav label in French after setLocale', async () => {
    const Host = Component({
      selector: 'mol-locale-host',
      standalone: true,
      imports: [AppShellBottomNav],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<nav mol-nav-bottom [items]="[{ id: 'a', label: 'label-a' }]"></nav>`,
    })(class LocaleHost {})
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref: ComponentRef<unknown> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    teardown = async () => {
      appRef.destroy()
      host.remove()
    }
    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Bottom')

    // The switch itself: the label must follow it without an unrelated re-render.
    await provider.setLocale('fr')
    appRef.tick()

    expect(host.querySelector('nav')?.getAttribute('aria-label')).toBe('Bas')
  })
})
