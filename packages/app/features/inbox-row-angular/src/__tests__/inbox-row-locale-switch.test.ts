// @vitest-environment jsdom

/**
 * Locale-switch reactivity for InboxRow's star aria-label — the Angular port
 * of `@molecule/app-inbox-row-react/src/__tests__/inbox-row-locale-switch.test.tsx`.
 *
 * `useTranslation()` from `@molecule/app-angular` reads the provider's locale
 * notification signal inside `t`, so a template expression that calls it
 * re-runs on a switch. This test bonds a provider with an `en` and a `fr`
 * value for a key the component renders, renders it in `en`, switches to `fr`,
 * flushes change detection, and asserts the DOM now shows the French value.
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
  const { Component, TemplateRef } = await import('@angular/core')
  const MockAvatar = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'alt', 'name', 'size', 'rounded', 'className', 'style', 'testId'],
    host: { 'data-avatar': '', '[attr.data-avatar-name]': 'alt ?? name ?? ""' },
    template: '',
  })(
    class MockAvatarClass {
      /** Image source. */
      src?: string
      /** Image alt text. */
      alt?: string
      /** Display name. */
      name?: string
      /** Size preset. */
      size?: string
      /** Rounded corners. */
      rounded?: boolean
      /** Extra classes. */
      className?: string
      /** Inline style. */
      style?: Record<string, unknown>
      /** `data-testid`. */
      testId?: string
    },
  )
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Avatar: MockAvatar,
    asTemplate: (value: unknown) => (value instanceof TemplateRef ? value : null),
  }
})

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { InboxRow } = await import('../inbox-row.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The running application, torn down in `afterEach`. */
let appRef: ApplicationRef | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'inboxRow.star': 'Star' } },
    { code: 'fr', name: 'French', translations: { 'inboxRow.star': 'Favori' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  appRef?.destroy()
  appRef = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InboxRow locale switch', () => {
  it('renders the star aria-label in French after setLocale', async () => {
    const Host = Component({
      selector: 'mol-locale-host',
      standalone: true,
      imports: [InboxRow],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div
        mol-inbox-row
        sender="Alice"
        subject="Lunch?"
        [onToggleStar]="onToggleStar"
      ></div>`,
    })(
      class LocaleHost {
        /** The star toggle the component calls. */
        onToggleStar = (): void => undefined
      },
    )
    appRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref: ComponentRef<unknown> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    expect(host.querySelector('button[aria-label="Star"]')).not.toBeNull()

    // The switch itself: the row must re-render in French. Against a
    // non-reactive `t` this stays 'Star' — nothing subscribed it.
    await provider.setLocale('fr')
    appRef.tick()
    expect(host.querySelector('button[aria-label="Favori"]')).not.toBeNull()
    expect(host.querySelector('button[aria-label="Star"]')).toBeNull()
  })
})
