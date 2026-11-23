// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular `NewsletterSignup`'s own texts — a
 * port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-locale-switch.test.tsx`:
 * the same test names and assertions. `useTranslation()` from
 * `@molecule/app-angular` subscribes to the bonded provider, so the form
 * re-renders on the switch. This test bonds a provider with an `en` and a `fr`
 * value for the keys the component renders, renders it in `en`, switches to
 * `fr`, and asserts the DOM now shows the French values.
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

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button and a `data-input` field carrying the same attributes.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, inject, ElementRef } = await import('@angular/core')
  return {
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
    Input: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-input]',
      standalone: true,
      inputs: ['type', 'value', 'placeholder', 'required', 'className'],
      template: `<input
        data-input
        [attr.type]="type ?? 'text'"
        [attr.placeholder]="placeholder"
        [attr.required]="required ? '' : null"
        [attr.aria-label]="label"
      />`,
    })(
      class MockInput {
        /** Input type. */
        type?: string
        /** Controlled value. */
        value?: string
        /** Placeholder text. */
        placeholder?: string
        /** Required flag. */
        required?: boolean
        /** Extra classes (unused by the marker). */
        className?: string
        /** The accessible label the caller bound on the host (React's rest). */
        label?: string

        private readonly host = inject(ElementRef)

        /** The real Input forwards the host's rest attributes onto the field; the mock mirrors the same aria-label each pass. */
        ngDoCheck(): void {
          this.label = this.host.nativeElement.getAttribute('aria-label') ?? undefined
        }
      },
    ),
  }
})

const { NewsletterSignup } = await import('../newsletter-signup.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'newsletter.label.email': 'Email',
        'newsletter.error.subscriptionFailed': 'Subscription failed',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'newsletter.label.email': 'Adresse e-mail',
        'newsletter.error.subscriptionFailed': "L'abonnement a échoué",
      },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts `NewsletterSignup` through a JIT host template.
 *
 * @param props - The component props.
 * @returns The host element and a manual change-detection pass.
 */
async function render(
  props: Record<string, unknown> = {},
): Promise<{ host: HTMLElement; tick(): void }> {
  const Host = Component({
    selector: 'mol-locale-host',
    standalone: true,
    imports: [NewsletterSignup as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<mol-newsletter-signup
      [onSubscribe]="p['onSubscribe']"
      [placeholder]="p['placeholder']"
    ></mol-newsletter-signup>`,
  })(
    class LocaleHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { onSubscribe: () => {}, ...props }
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
  appRef.tick()
  teardown = async () => {
    appRef.destroy()
    host.remove()
  }
  return { host, tick: () => appRef.tick() }
}

describe('NewsletterSignup locale switch', () => {
  it('renders the email field label in French after setLocale', async () => {
    const { host, tick } = await render()
    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Email')

    await provider.setLocale('fr')
    tick()

    expect(host.querySelector('input')?.getAttribute('aria-label')).toBe('Adresse e-mail')
    expect(host.querySelector('input')!.getAttribute('aria-label')).not.toBe('Email')
  })

  it('renders the subscription failure message in French after setLocale', async () => {
    const { host, tick } = await render({ onSubscribe: () => Promise.reject('nope') })
    await provider.setLocale('fr')
    tick()
    host
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    tick()

    expect(host.querySelector('form')?.textContent).toContain("L'abonnement a échoué")
    expect(host.querySelector('form')?.textContent).not.toContain('Subscription failed')
  })
})
