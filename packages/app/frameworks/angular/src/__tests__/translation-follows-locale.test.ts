// @vitest-environment jsdom

/**
 * A view that renders `useTranslation().t(…)` or `useT()(…)` follows a locale switch
 * by itself. React re-renders every `useTranslation` consumer on a switch; a zoneless
 * Angular view refreshes only when a signal it read changes, so `t` must read the
 * locale signal — a component author never has to remember to read `locale()` too.
 *
 * @module
 */

import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { useT, useTranslation } from '../hooks/use-translation.js'
import { provideI18n } from '../providers.js'

/** Renders a translation through a method, the shape every UI component uses. */
@Component({
  selector: 'app-test-greeting',
  template: '<p>{{ greeting() }}</p>',
})
class GreetingComponent {
  private readonly i18n = useTranslation()

  greeting(): string {
    return this.i18n.t('greeting', undefined, { defaultValue: 'Hello' })
  }
}

/** The same through `useT`, with the string-default shorthand. */
@Component({
  selector: 'app-test-greeting-short',
  template: '<p>{{ greeting() }}</p>',
})
class ShortGreetingComponent {
  private readonly t = useT()

  greeting(): string {
    return this.t('greeting', 'Hello')
  }
}

const i18n = () =>
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { greeting: 'Hello' } },
    { code: 'fr', name: 'Français', translations: { greeting: 'Bonjour' } },
  ])

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('translation follows the locale in a zoneless view', () => {
  for (const [name, component] of [
    ['useTranslation().t', GreetingComponent],
    ['useT()', ShortGreetingComponent],
  ] as const) {
    it(`${name} re-renders on a locale switch without reading locale()`, async () => {
      const provider = i18n()
      TestBed.configureTestingModule({
        imports: [component],
        providers: [provideZonelessChangeDetection(), provideI18n(provider)],
      })
      const fixture = TestBed.createComponent(component)
      await fixture.whenStable()
      expect(fixture.nativeElement.textContent).toBe('Hello')

      await provider.setLocale('fr')
      await fixture.whenStable()
      expect(fixture.nativeElement.textContent).toBe('Bonjour')
    })
  }
})
