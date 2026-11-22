// @vitest-environment jsdom
/**
 * The Angular `NewsletterSignup`'s own text goes through i18n — a port of
 * `@molecule/app-newsletter-signup-react/src/__tests__/newsletter-signup-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the suite's other tests
 * use). With a provider whose `t` marks every key (`«key»`), the email field's
 * label and the non-`Error` failure message render their key, and an explicit
 * `placeholder` input still overrides the default.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// the same mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button and a `data-input` field carrying the same attributes.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, inject, ElementRef } = await import('@angular/core')
  return {
    Button: Component({
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

/** A mounted spec host: its DOM, an event flush, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs a change-detection pass after an interaction. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param templateUrl - The host template, receiving the props as `p`.
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  templateUrl: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: templateUrl,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
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
  // A second pass settles the optional regions' first render (their
  // projection read runs in ngAfterViewInit and withdraws an empty wrapper).
  appRef.tick()
  return {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template: every prop bound as an input, the React suite's shape. */
const TEMPLATE = `<mol-newsletter-signup
  [onSubscribe]="p['onSubscribe']"
  [placeholder]="p['placeholder']"
></mol-newsletter-signup>`

const mounted: Mounted[] = []

/**
 * Mounts `NewsletterSignup` with the given props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(TEMPLATE, NewsletterSignup as Type<unknown>, {
    onSubscribe: () => {},
    ...props,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('NewsletterSignup text', () => {
  it('takes the email field label through i18n by default', async () => {
    const m = await render()
    expect(m.host.querySelector('input')?.getAttribute('aria-label')).toBe(
      '«newsletter.label.email»',
    )
  })

  it('takes the subscription failure message through i18n by default', async () => {
    // A non-`Error` rejection is where the component supplies its own message.
    const m = await render({ onSubscribe: () => Promise.reject('nope') })
    m.host
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    m.tick()
    expect(m.host.querySelector('form')?.textContent).toContain(
      '«newsletter.error.subscriptionFailed»',
    )
  })

  it('keeps an explicit placeholder over the translated default', async () => {
    const m = await render({ placeholder: 'name@co.com' })
    expect(m.host.querySelector('input')?.getAttribute('placeholder')).toBe('name@co.com')
  })
})
