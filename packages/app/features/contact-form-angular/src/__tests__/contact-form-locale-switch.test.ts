// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular `ContactForm`'s field labels — a
 * port of `@molecule/app-contact-form-react/src/__tests__/contact-form-locale-switch.test.tsx`:
 * the same test name and assertion. The component reads `t` through the
 * injection-context `useTranslation()` and binds each field's label on its
 * host (`[attr.aria-label]`), so a switch re-renders the text; the real field
 * components move that host attribute onto the inner control on every check
 * (the markers below mirror the move). This test bonds a provider with an
 * `en` and a `fr` value for a key the component renders, renders it in `en`,
 * switches to `fr`, and asserts the DOM now shows the French value.
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

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, ElementRef, inject } = await import('@angular/core')
  const { useTranslation } = await import('@molecule/app-angular')
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
      inputs: ['type', 'value', 'placeholder', 'required', 'className', 'id'],
      template: `<input
        data-input
        [attr.type]="type ?? 'text'"
        [attr.placeholder]="placeholder"
        [attr.required]="required ? '' : null"
        [attr.aria-label]="label()"
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
        /** Explicit id. */
        id?: string
        private readonly host = inject(ElementRef)
        private readonly i18n = useTranslation()

        /**
         * The `aria-label` on the host element (the real field components move
         * host attributes onto the inner control; the marker mirrors that,
         * including the locale read that re-checks them on a switch).
         * @returns The label, or null.
         */
        label(): string | null {
          void this.i18n.locale()
          return (this.host.nativeElement as HTMLElement).getAttribute('aria-label')
        }
      },
    ),
    Textarea: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[mol-textarea]',
      standalone: true,
      inputs: ['value', 'placeholder', 'required', 'rows', 'className', 'id'],
      template: `<textarea
        data-textarea
        [attr.placeholder]="placeholder"
        [attr.required]="required ? '' : null"
        [attr.rows]="rows ?? null"
        [attr.aria-label]="label()"
      ></textarea>`,
    })(
      class MockTextarea {
        /** Controlled value. */
        value?: string
        /** Placeholder text. */
        placeholder?: string
        /** Required flag. */
        required?: boolean
        /** Rows. */
        rows?: number
        /** Extra classes (unused by the marker). */
        className?: string
        /** Explicit id. */
        id?: string
        private readonly host = inject(ElementRef)
        private readonly i18n = useTranslation()

        /**
         * The `aria-label` on the host element (the real field components move
         * host attributes onto the inner control; the marker mirrors that,
         * including the locale read that re-checks them on a switch).
         * @returns The label, or null.
         */
        label(): string | null {
          void this.i18n.locale()
          return (this.host.nativeElement as HTMLElement).getAttribute('aria-label')
        }
      },
    ),
  }
})

const { ContactForm } = await import('../contact-form.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'contactForm.label.name': 'Name' } },
    { code: 'fr', name: 'French', translations: { 'contactForm.label.name': 'Nom' } },
  ])
  setProvider(provider)
})

/** A mounted spec host. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass over the mounted tree. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mountedHosts: Mounted[] = []

afterEach(async () => {
  for (const m of mountedHosts.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ContactForm locale switch', () => {
  it('renders the name label in French after setLocale', async () => {
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [ContactForm as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<mol-contact-form [onSubmit]="p['onSubmit']"></mol-contact-form>`,
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = { onSubmit: () => {} }
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    // A second pass settles the optional regions' first render (the placement
    // function detaches a region it finds nothing in).
    appRef.tick()
    mountedHosts.push({
      host,
      tick: () => appRef.tick(),
      destroy: async () => {
        appRef.destroy()
        host.remove()
      },
    })

    const field = () => host.querySelector('input[type="text"]')!
    expect(field().getAttribute('aria-label')).toBe('Name')

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')
    appRef.tick()

    expect(field().getAttribute('aria-label')).toBe('Nom')
  })
})
