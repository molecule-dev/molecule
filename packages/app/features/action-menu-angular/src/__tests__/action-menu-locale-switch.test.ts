// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `ActionMenu`'s trigger label — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu-locale-switch.test.tsx`:
 * the same test name and assertion. The label used to be an inline template
 * literal (`triggerAriaLabel ?? 'Actions'`), which no provider could ever
 * translate or re-render. It now flows through `useTranslation()` from
 * `@molecule/app-angular` and is read in the template binding, so the trigger
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
      inputs: ['variant', 'size', 'color', 'loading', 'className', 'disabled', 'type'],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
        /** Button color. */
        color?: string
        /** Whether the button is busy. */
        loading?: boolean
        /** Extra classes. */
        className?: string
        /** Whether the button is disabled. */
        disabled?: boolean
        /** The button's `type` attribute. */
        type?: string
      },
    ),
  }
})

const { ActionMenu } = await import('../action-menu.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'actionMenu.aria.trigger': 'Actions' } },
    { code: 'de', name: 'German', translations: { 'actionMenu.aria.trigger': 'Aktionen' } },
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

describe('ActionMenu locale switch', () => {
  it('the trigger label follows a locale switch', async () => {
    const Host = Component({
      selector: 'mol-locale-host',
      standalone: true,
      imports: [ActionMenu],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<span mol-action-menu [items]="items"></span>`,
    })(
      class LocaleHost {
        /** The menu's items. */
        items = [
          { id: 'edit', label: 'Edit' },
          { id: 'delete', label: 'Delete', destructive: true },
        ]
      },
    )
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
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')

    // The switch itself: the trigger must re-render in German. Against the old
    // inline literal this stayed 'Actions' — nothing read the provider.
    await provider.setLocale('de')
    appRef.tick()

    expect(trigger?.getAttribute('aria-label')).toBe('Aktionen')
  })
})
