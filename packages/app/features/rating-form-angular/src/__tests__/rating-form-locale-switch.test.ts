// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular `RatingForm`'s comment field label
 * and star labels — the Angular port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-locale-switch.test.tsx`:
 * the same test name and assertion. The component's `useTranslation()` runs in
 * the injection context and its `t` reads the locale, so the view re-renders
 * on the switch. This test bonds a provider with `en` and `de` values for the
 * comment label and the star-label format, renders in `en`, switches to `de`,
 * and asserts both strings now show the German values.
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

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Angular suite uses.
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
      inputs: ['type', 'variant', 'color', 'disabled'],
      host: {
        'data-button': '',
        '[attr.type]': 'type ?? "button"',
        '[disabled]': 'disabled || null',
      },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Native button type. */
        type?: string
        /** Visual variant (unused by the marker). */
        variant?: string
        /** Colour variant (unused by the marker). */
        color?: string
        /** Disabled state. */
        disabled?: boolean
      },
    ),
    Textarea: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-textarea]',
      standalone: true,
      inputs: ['placeholder', 'value', 'rows'],
      template: `<textarea
        data-textarea
        [attr.placeholder]="placeholder"
        [attr.rows]="rows"
      ></textarea>`,
    })(
      class MockTextarea {
        /** Placeholder text. */
        placeholder?: string
        /** Controlled value. */
        value?: string
        /** Rows attribute. */
        rows?: number
      },
    ),
  }
})

// No mock of `@molecule/app-angular`: the real useTranslation reads the bonded
// provider, which is what the switch drives.
const { RatingForm } = await import('../rating-form.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

const teardowns: Array<() => Promise<void>> = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'rating.comment': 'Comment', 'rating.star': '{{n}} of {{max}}' },
    },
    {
      code: 'de',
      name: 'German',
      translations: { 'rating.comment': 'Kommentar', 'rating.star': '{{n}} von {{max}}' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  for (const teardown of teardowns.splice(0)) await teardown()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('RatingForm locale switch', () => {
  it('the comment field label and star labels follow a locale switch', async () => {
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [RatingForm as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<form mol-rating-form [onSubmit]="p['onSubmit']"></form>`,
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = { onSubmit: () => {} }
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection()],
    })
    const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    teardowns.push(async () => {
      appRef.destroy()
      host.remove()
    })

    const field = host.querySelector('div[mol-textarea]')
    const firstStar = host.querySelector('[data-mol-id="rating-form-star"]')
    expect(field?.getAttribute('aria-label')).toBe('Comment')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 of 5')

    // The switch itself: the label must follow it without an unrelated
    // re-render, and the star format must interpolate the same values.
    await provider.setLocale('de')
    appRef.tick()

    expect(field?.getAttribute('aria-label')).toBe('Kommentar')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 von 5')
  })
})
