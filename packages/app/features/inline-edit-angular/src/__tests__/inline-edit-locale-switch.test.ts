// @vitest-environment jsdom
/**
 * The Angular `InlineEdit`'s editor field label follows the provider's locale
 * — a port of `@molecule/app-inline-edit-react`'s
 * `inline-edit-locale-switch.test.tsx`: the same test name and assertion,
 * mounted through Angular's real renderer in jsdom.
 *
 * `useTranslation()` reads the locale-notifications signal on every `t` call,
 * so the view re-renders on `setLocale`. This test bonds a provider with an
 * `en` and a `fr` value for `inlineEdit.aria.edit`, opens the editor in `en`
 * (the key is untranslated there, so the English default shows), switches to
 * `fr`, and asserts the label is now French.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { InlineEdit } from '../inline-edit.component.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: {} },
    { code: 'fr', name: 'French', translations: { 'inlineEdit.aria.edit': 'Modifier' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('InlineEdit locale switch', () => {
  // The JIT host compile of the component tree is slow on a loaded machine;
  // the default 10s test timeout is not enough for one test to pay it all.
  it('switches the editor field label with the provider locale', async () => {
    const Host = Component({
      selector: 'mol-locale-spec-host',
      standalone: true,
      imports: [InlineEdit],
      changeDetection: ChangeDetectionStrategy.Default,
      template: `<mol-inline-edit [value]="'Hello world'" [onSubmit]="submit"></mol-inline-edit>`,
    })(
      class SpecHost {
        /** A no-op submit, as the template's `[onSubmit]` binding. */
        submit = (_next: string): void => {}
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection()],
    })
    const ref: ComponentRef<{ submit: (next: string) => void }> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    try {
      const trigger = host.querySelector('[role="button"]')
      if (!trigger) throw new Error('no read-state trigger rendered')
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      appRef.tick()
      expect(host.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('Edit')

      // The switch itself: the label must follow the provider. Against the
      // hardcoded `placeholder ?? 'Edit'` fallback this stayed English.
      await provider.setLocale('fr')
      appRef.tick()
      expect(host.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('Modifier')
    } finally {
      appRef.destroy()
      host.remove()
    }
  }, 60_000)
})
