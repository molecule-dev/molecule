// @vitest-environment jsdom
/**
 * Every string the Angular `ContactForm` writes itself goes through i18n — a
 * port of `@molecule/app-contact-form-react/src/__tests__/contact-form-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»`, locale: () => 'en' }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button, a `data-input` field and a `data-textarea` field, each
// carrying the `aria-label` bound on the host element — the same host-to-inner
// move the real field components run on every check.
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

/** A mounted spec host. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The markup the component rendered. */
  readonly markup: string
  /** Runs one change-detection pass over the mounted tree. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts `ContactForm` through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props the host template binds.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ContactForm as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<mol-contact-form
      [onSubmit]="p['onSubmit']"
      [title]="p['title']"
      [description]="p['description']"
      [submitLabel]="p['submitLabel']"
      [successContent]="p['successContent']"
      [className]="p['className']"
    ></mol-contact-form>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { onSubmit: () => {}, ...props }
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
  // A second pass settles the optional regions' first render (their
  // projection read runs in ngAfterViewInit and withdraws an empty wrapper).
  appRef.tick()
  return {
    host,
    markup: host.innerHTML,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mountedHosts: Mounted[] = []

afterEach(async () => {
  for (const m of mountedHosts.splice(0)) await m.destroy()
})

describe('ContactForm i18n', () => {
  it('takes the field labels through i18n by default', async () => {
    const m = await render()
    mountedHosts.push(m)
    expect(m.host.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.name»',
    )
    expect(m.host.querySelector('input[type="email"]')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.email»',
    )
    expect(m.host.querySelector('textarea')?.getAttribute('aria-label')).toBe(
      '«contactForm.label.message»',
    )
  })

  it('takes the non-Error submit fallback through i18n by default', async () => {
    // The fallback renders only when `onSubmit` throws something that is not
    // an `Error` (a rejected `Error` shows its own `.message` verbatim).
    const m = await render({ onSubmit: () => Promise.reject('boom') })
    mountedHosts.push(m)
    m.host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    m.tick()
    expect(m.host.querySelector('form')?.textContent).toContain(
      '«contactForm.error.submissionFailed»',
    )
  })
})
