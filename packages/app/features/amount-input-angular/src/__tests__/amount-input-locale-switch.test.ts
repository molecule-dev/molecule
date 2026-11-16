// @vitest-environment jsdom
/**
 * Locale-switch reactivity for AmountInput's toggle labels.
 *
 * The port of `@molecule/app-amount-input-react`'s locale test: the component
 * reads `t` through the framework binding's reactive `useTranslation()`, whose
 * `t` reads the provider's locale notifications, so a `setLocale` call
 * re-renders the labels in the new language.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AmountInput } from '../amount-input.component.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** The mounted app's host element. */
let host: HTMLElement

/** Flushes change detection for the mounted app. */
let flush: () => void

/** Destroys the mounted app. */
let destroy: () => void

beforeEach(async () => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'amountInput.type.expense': 'Expense' } },
    { code: 'fr', name: 'French', translations: { 'amountInput.type.expense': 'Dépense' } },
  ])
  setProvider(provider)

  const noop = (): void => {}
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AmountInput],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div
      mol-amount-input
      [amount]="0"
      [onAmountChange]="noop"
      [type]="'expense'"
      [onTypeChange]="noop"
      [typeOptions]="options"
    ></div>`,
  })(
    class SpecHost {
      /** The amount callback the template binds. */
      readonly noop = noop
      /** The single toggle option the template binds. */
      readonly options = ['expense']
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, { environmentInjector: appRef.injector })
  host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  flush = () => appRef.tick()
  destroy = () => appRef.destroy()
})

afterEach(() => {
  destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('AmountInput locale switch', () => {
  it('renders the expense toggle label in French after setLocale', async () => {
    expect(host.textContent).toContain('Expense')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Expense' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flush()
    expect(host.textContent).toContain('Dépense')
    expect(host.textContent).not.toContain('Expense')
  })
})
