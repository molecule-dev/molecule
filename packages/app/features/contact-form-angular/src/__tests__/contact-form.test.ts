// @vitest-environment jsdom
/**
 * Unit tests of `ContactForm` — the port of `@molecule/app-contact-form-react`'s
 * own suite. The React suite renders the component with mocked UI dependencies
 * and asserts the markup; this port mounts the same mocked tree through
 * Angular's real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same markup strings.
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
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
    locale: () => 'en',
  }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button, a `data-input` field and a `data-textarea` field, each
// carrying the `aria-label` the host element was given.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, ElementRef, inject } = await import('@angular/core')
  const { useTranslation } = await import('@molecule/app-angular')
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

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The markup the component rendered. */
  readonly markup: string
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
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
    markup: host.innerHTML,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template: every prop bound as an input, the React suite's shape. */
const TEMPLATE = `<mol-contact-form
  [onSubmit]="p['onSubmit']"
  [title]="p['title']"
  [description]="p['description']"
  [submitLabel]="p['submitLabel']"
  [successContent]="p['successContent']"
  [className]="p['className']"
></mol-contact-form>`

const mounted: Mounted[] = []

/**
 * Mounts `ContactForm` with the given props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(TEMPLATE, ContactForm as Type<unknown>, {
    onSubmit: () => {},
    ...props,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ContactForm', () => {
  it('renders the name, email, and message fields', async () => {
    const markup = (await render()).markup
    expect(markup).toContain('aria-label="Name"')
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('aria-label="Message"')
  })

  it('renders the title and description when present and omits the header otherwise', async () => {
    const full = (await render({ title: 'Contact us', description: 'we reply fast' })).markup
    expect(full).toContain('Contact us')
    expect(full).toContain('we reply fast')
    expect((await render()).markup).not.toContain('<header')
  })

  it('renders a projected title and description', async () => {
    const m = await mount(
      `<mol-contact-form [onSubmit]="p['onSubmit']">
        <ng-container ngProjectAs="[slot=title]"><strong>Contact us</strong></ng-container>
        <ng-container ngProjectAs="[slot=description]"><em>we reply fast</em></ng-container>
      </mol-contact-form>`,
      ContactForm as Type<unknown>,
      { onSubmit: () => {} },
    )
    mounted.push(m)
    expect(m.markup).toContain('<strong>Contact us</strong>')
    expect(m.markup).toContain('<em>we reply fast</em>')
  })

  it('renders the default submit label', async () => {
    expect((await render()).markup).toContain('Send message')
  })

  it('honours a custom submitLabel', async () => {
    const markup = (await render({ submitLabel: 'Get in touch' })).markup
    expect(markup).toContain('Get in touch')
    expect(markup).not.toContain('Send message')
  })

  it('renders the extraFields slot', async () => {
    const m = await mount(
      `<mol-contact-form [onSubmit]="p['onSubmit']">
        <ng-container ngProjectAs="[slot=extraFields]"><input data-extra="" /></ng-container>
      </mol-contact-form>`,
      ContactForm as Type<unknown>,
      { onSubmit: () => {} },
    )
    mounted.push(m)
    expect(m.markup).toContain('data-extra=""')
  })

  it('forwards className onto the form', async () => {
    expect((await render({ className: 'cf-cls' })).markup).toContain('cf-cls')
  })
})
