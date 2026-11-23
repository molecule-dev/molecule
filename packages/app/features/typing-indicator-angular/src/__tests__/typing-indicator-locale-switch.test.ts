// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `TypingIndicator`'s aria-label — a port of
 * `@molecule/app-typing-indicator-react/src/__tests__/typing-indicator-locale-switch.test.tsx`:
 * the same test name and assertion. The label used to be an inline read-time
 * literal (`this.ariaLabel ?? 'Typing…'`), which no provider could ever
 * translate or re-render. It now flows through `useTranslation()` from
 * `@molecule/app-angular` and is read in the template binding, so the label
 * re-renders on a locale switch. This test bonds a provider with an `en` and a
 * `de` value for the key, renders in `en`, switches to `de`, and asserts the
 * aria-label now shows the German value.
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

const { TypingIndicator } = await import('../typing-indicator.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'typingIndicator.aria.label': 'Typing…' } },
    {
      code: 'de',
      name: 'German',
      translations: { 'typingIndicator.aria.label': 'Tippt gerade…' },
    },
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

describe('TypingIndicator locale switch', () => {
  it('the aria-label follows a locale switch', async () => {
    const Host = Component({
      selector: 'mol-locale-host',
      standalone: true,
      imports: [TypingIndicator],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<mol-typing-indicator />`,
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
    const status = host.querySelector('span[role="status"]')
    expect(status?.getAttribute('aria-label')).toBe('Typing…')

    // The switch itself: the label must re-render in German. Against the old
    // read-time literal this stayed 'Typing…' — nothing read the provider.
    await provider.setLocale('de')
    appRef.tick()

    expect(status?.getAttribute('aria-label')).toBe('Tippt gerade…')
  })
})
