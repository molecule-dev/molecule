// @vitest-environment jsdom
/**
 * Unit tests of `NewsletterSignup` — the port of
 * `@molecule/app-newsletter-signup-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
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

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The markup the component rendered. */
  readonly markup: string
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
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
    changeDetection: ChangeDetectionStrategy.Eager,
    template: templateUrl,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
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
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template: every prop bound as an input, the React suite's shape. */
const TEMPLATE = `<mol-newsletter-signup
  [onSubscribe]="p['onSubscribe']"
  [title]="p['title']"
  [description]="p['description']"
  [placeholder]="p['placeholder']"
  [buttonLabel]="p['buttonLabel']"
  [successContent]="p['successContent']"
  [layout]="p['layout']"
  [className]="p['className']"
></mol-newsletter-signup>`

const mounted: Mounted[] = []

/** The host template for the list-placement test: two fixed siblings around the widget. */
const LIST_TEMPLATE = `<i>a</i><mol-newsletter-signup
  [onSubscribe]="p['onSubscribe']"
  [successContent]="p['successContent']"
></mol-newsletter-signup><i>b</i>`

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

describe('NewsletterSignup', () => {
  it('renders the email input and subscribe button', async () => {
    const markup = (await render()).markup
    expect(markup).toContain('aria-label="Email"')
    expect(markup).toContain('Subscribe')
  })

  it('renders the default email placeholder and honours a custom one', async () => {
    expect((await render()).markup).toContain('placeholder="Your email"')
    expect((await render({ placeholder: 'name@co.com' })).markup).toContain(
      'placeholder="name@co.com"',
    )
  })

  it('renders the title and description when present and omits them otherwise', async () => {
    const full = (await render({ title: 'Stay in the loop', description: 'monthly digest' })).markup
    expect(full).toContain('Stay in the loop')
    expect(full).toContain('monthly digest')
    expect((await render()).markup).not.toContain('<h4')
  })

  it('renders a projected title and description', async () => {
    const m = await mount(
      `<mol-newsletter-signup [onSubscribe]="p['onSubscribe']">
        <ng-container ngProjectAs="[slot=title]"><strong>Stay in the loop</strong></ng-container>
        <ng-container ngProjectAs="[slot=description]"><em>monthly digest</em></ng-container>
      </mol-newsletter-signup>`,
      NewsletterSignup as Type<unknown>,
      { onSubscribe: () => {} },
    )
    mounted.push(m)
    expect(m.markup).toContain('<strong>Stay in the loop</strong>')
    expect(m.markup).toContain('<em>monthly digest</em>')
  })

  it('honours a custom buttonLabel', async () => {
    const markup = (await render({ buttonLabel: 'Join now' })).markup
    expect(markup).toContain('Join now')
    expect(markup).not.toContain('Subscribe')
  })

  it('forwards className onto the form', async () => {
    expect((await render({ className: 'ns-cls' })).markup).toContain('ns-cls')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(LIST_TEMPLATE, NewsletterSignup as Type<unknown>, {
      onSubscribe: () => {},
      successContent: 'Thanks for subscribing',
    })
    mounted.push(m)
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(children()).toEqual(['i', 'form', 'i'])
    const form = m.host.querySelector('form')
    if (!form) throw new Error('no <form> rendered')
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await m.setProps({})
    expect(children()).toEqual(['i', 'div', 'i'])
  })
})
