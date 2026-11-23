// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-legal-pages-angular` — a port of
 * `@molecule/app-legal-pages-react/src/__tests__/legal-pages.test.tsx`: the
 * same test names and the same behavioral assertions, mounted through
 * Angular's real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) with the mocked ClassMap the React
 * suite uses.
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
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// `useAuth` / `useVerifyPaymentReturn` are hoisted so individual tests can
// change what they return.
const { mockUseAuth, mockUseVerifyPaymentReturn } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseVerifyPaymentReturn: vi.fn(),
}))

// A ClassMap proxy echoing each accessed member back as its token — callable
// for method-style props (`cm.stack(4)`) and usable bare (`cm.prose`). `cn`
// joins tokens exactly as the real ClassMap does. The same mock the React
// tests use.
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

// The binding composables, the router link and the UI markers the React tests
// mock — the same observable contract, in Angular's shape.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const { Directive, Component } = await import('@angular/core')
  const CONTENT: Record<string, string> = {
    'content.privacyPolicy': '<p>Privacy Policy for {{appName}}.</p>',
    'content.termsOfService': '<p>These terms govern your use of {{appName}}.</p>',
  }
  const interpolate = (str: string, values?: Record<string, unknown>): string =>
    str.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
      values && name in values ? String(values[name]) : whole,
    )
  const t = (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
    interpolate(CONTENT[key] ?? opts?.defaultValue ?? key, values)
  const Link = Directive({
    selector: 'a[molLink]',
    standalone: true,
    inputs: ['molLink'],
    // prettier-ignore
    host: { '[attr.href]': 'molLink' },
  })(
    class StubLink {
      /** The link target. */
      molLink = ''
    },
  )
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useAuth: mockUseAuth,
    useTranslation: () => ({
      t,
      locale: () => 'en',
      locales: () => [],
      setLocale: async () => undefined,
    }),
    useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
    Link,
    // The kit's own pieces that a stubbed binding module must still answer for.
    provideMolecule: () => [],
    moleculePlugin: () => undefined,
    __StubUnused: Component,
  }
})

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  const Button = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['variant', 'size', 'color', 'className', 'style'],
    host: { 'data-button': '' },
    template: '<ng-content></ng-content>',
  })(class StubButton {})
  const Flex = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-flex]',
    standalone: true,
    inputs: ['align', 'justify', 'direction', 'wrap', 'gap', 'className', 'style'],
    host: { 'data-flex': '' },
    template: '<ng-content></ng-content>',
  })(class StubFlex {})
  const Spinner = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-spinner]',
    standalone: true,
    host: { 'data-spinner': '' },
    template: '',
  })(class StubSpinner {})
  // Render the body unconditionally: the port's Modal only renders while open,
  // and the assertions read the modal body without driving its state — the same
  // stub the React tests use.
  const Modal = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-modal',
    standalone: true,
    inputs: ['open', 'title', 'size', 'centered', 'preventScroll', 'closeLabel', 'className'],
    outputs: ['close'],
    host: { 'data-parity-unwrap': '', style: 'display: contents' },
    template: '<div data-modal=""><ng-content></ng-content></div>',
  })(
    class StubModal {
      /** The close request (React's `onClose`). */
      readonly close = new EventEmitter<unknown>()
    },
  )
  return { Button, Flex, Spinner, Modal }
})

const { ContentPageShell } = await import('../content-page-shell.component.js')
const { LegalContentPage } = await import('../legal-content-page.component.js')
const { LegalModalLinks } = await import('../legal-modal-links.component.js')
const { LegalModals } = await import('../legal-modals.component.js')
const { LegalPageLayout } = await import('../legal-page-layout.component.js')
const { LegalPageSection } = await import('../legal-page-section.component.js')
const { PlanUpdatedPage } = await import('../plan-updated-page.component.js')
const { PrivacyPage } = await import('../privacy-page.component.js')
const { TermsPage } = await import('../terms-page.component.js')

/** The app and its host of the running test, destroyed after it. */
let live:
  | {
      appRef: ApplicationRef
      host: HTMLElement
      ref: ComponentRef<{ p: Record<string, unknown> }>
    }
  | undefined
/** Host selector counter (Angular requires a unique selector per component type). */
let hosts = 0

afterEach(async () => {
  if (live) {
    live.appRef.destroy()
    live.host.remove()
    live = undefined
  }
})

/**
 * Mounts a JIT host template and returns the rendered host plus a setter that
 * merges the props and runs one change detection.
 *
 * @param template - The host template (it reads the props as `p['key']`).
 * @param imports - The standalone components the template uses.
 * @param props - The props the template starts with.
 * @returns The rendered host and the props setter.
 */
async function mount(
  template: string,
  imports: readonly unknown[],
  props: Record<string, unknown> = {},
): Promise<{ root: HTMLElement; set: (next: Record<string, unknown>) => void }> {
  const Host = Component({
    selector: `mol-legal-spec-${++hosts}`,
    standalone: true,
    imports: imports as Type<unknown>[],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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
  live = { appRef, host, ref }
  return {
    root: host,
    set: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
  }
}

/**
 * Mounts a JIT host template and returns the markup it rendered.
 *
 * @param template - The host template (it reads the props as `p['key']`).
 * @param imports - The standalone components the template uses.
 * @param props - The props the template reads.
 * @returns The rendered markup.
 */
async function html(
  template: string,
  imports: readonly unknown[],
  props: Record<string, unknown> = {},
): Promise<string> {
  const { root } = await mount(template, imports, props)
  return root.innerHTML
}

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ state: () => ({ initialized: true }) })
  mockUseVerifyPaymentReturn.mockReturnValue({
    status: () => 'idle',
    isReturn: () => false,
    provider: () => null,
    transactionId: () => null,
    error: () => null,
    retry: vi.fn(),
  })
})

/**
 * The text of every `<b>` in the rendered host, in document order.
 *
 * @param root - The rendered host.
 * @returns The ordered texts.
 */
function itemTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('b')).map((el) => el.textContent ?? '')
}

describe('LegalPageLayout', () => {
  it('renders the title inside an <h1>', () => {
    return html(`<main mol-legal-page-layout><span slot="title">Terms</span></main>`, [
      LegalPageLayout,
    ]).then((markup) => {
      expect(markup).toContain('<h1')
      expect(markup).toContain('Terms')
    })
  })

  it('renders its children in the body wrapper', () => {
    return html(
      `<main mol-legal-page-layout><span slot="title">Privacy</span><p data-body="">hello</p></main>`,
      [LegalPageLayout],
    ).then((markup) => {
      expect(markup).toContain('data-body=""')
      expect(markup).toContain('hello')
    })
  })

  it('sets data-mol-id on the <main> when supplied', () => {
    return html(
      `<main mol-legal-page-layout [dataMolId]="'page-x'"><span slot="title">T</span></main>`,
      [LegalPageLayout],
    ).then((markup) => {
      expect(markup).toContain('data-mol-id="page-x"')
    })
  })

  it('uses mainClassName verbatim when supplied (no container tokens)', () => {
    return html(
      `<main mol-legal-page-layout [mainClassName]="'custom-main'"><span slot="title">T</span></main>`,
      [LegalPageLayout],
    ).then((markup) => {
      expect(markup).toContain('custom-main')
      expect(markup).not.toContain('container')
    })
  })

  it('uses bodyClassName verbatim when supplied (no prose token)', () => {
    return html(
      `<main mol-legal-page-layout [bodyClassName]="'custom-body'"><span slot="title">T</span></main>`,
      [LegalPageLayout],
    ).then((markup) => {
      expect(markup).toContain('custom-body')
      expect(markup).not.toContain('prose')
    })
  })

  it('falls back to ClassMap container + prose tokens with no overrides', () => {
    return html(`<main mol-legal-page-layout><span slot="title">T</span></main>`, [
      LegalPageLayout,
    ]).then((markup) => {
      expect(markup).toContain('container')
      expect(markup).toContain('prose')
    })
  })
})

describe('LegalPageSection', () => {
  it('renders the title inside an <h2>', () => {
    return html(`<section mol-legal-page-section><span slot="title">Section A</span></section>`, [
      LegalPageSection,
    ]).then((markup) => {
      expect(markup).toContain('<h2')
      expect(markup).toContain('Section A')
    })
  })

  it('renders its children', () => {
    return html(
      `<section mol-legal-page-section><span slot="title">S</span><p data-p="">body text</p></section>`,
      [LegalPageSection],
    ).then((markup) => {
      expect(markup).toContain('data-p=""')
      expect(markup).toContain('body text')
    })
  })

  it('wraps everything in a <section>', () => {
    return html(`<section mol-legal-page-section><span slot="title">S</span></section>`, [
      LegalPageSection,
    ]).then((markup) => {
      expect(markup.startsWith('<section')).toBe(true)
    })
  })
})

describe('PlanUpdatedPage', () => {
  it('renders only a Spinner while auth is uninitialized', () => {
    mockUseAuth.mockReturnValue({ state: () => ({ initialized: false }) })
    return html(`<mol-plan-updated-page></mol-plan-updated-page>`, [PlanUpdatedPage]).then(
      (markup) => {
        expect(markup).toContain('data-spinner=""')
        expect(markup).not.toContain('data-mol-id="page-plan-updated"')
      },
    )
  })

  it('renders the confirmation once auth is initialized', () => {
    return html(`<mol-plan-updated-page></mol-plan-updated-page>`, [PlanUpdatedPage]).then(
      (markup) => {
        expect(markup).toContain('data-mol-id="page-plan-updated"')
        expect(markup).toContain('Your plan has been updated.')
        expect(markup).toContain('Thank you!')
        expect(markup).toContain('Return to Home')
        expect(markup).not.toContain('data-spinner')
      },
    )
  })

  // The buyer's plan is granted by the confirmation call this page makes, so
  // a thank-you rendered while it is still in flight (or after it failed)
  // tells them they paid for something they did not get.
  it('shows the spinner, not a thank-you, while the purchase is being confirmed', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: () => 'verifying',
      isReturn: () => true,
      provider: () => 'stripe',
      transactionId: () => 'cs_live_1',
      error: () => null,
      retry: vi.fn(),
    })
    return html(`<mol-plan-updated-page></mol-plan-updated-page>`, [PlanUpdatedPage]).then(
      (markup) => {
        expect(markup).toContain('data-spinner=""')
        expect(markup).not.toContain('Thank you!')
      },
    )
  })

  it('offers a retry instead of a thank-you when confirmation fails', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: () => 'failed',
      isReturn: () => true,
      provider: () => 'stripe',
      transactionId: () => 'cs_live_1',
      error: () => new Error('502'),
      retry: vi.fn(),
    })
    return html(`<mol-plan-updated-page></mol-plan-updated-page>`, [PlanUpdatedPage]).then(
      (markup) => {
        expect(markup).toContain('data-mol-id="plan-updated-error"')
        expect(markup).toContain('We could not confirm your payment yet.')
        expect(markup).toContain('data-mol-id="plan-updated-retry"')
        expect(markup).not.toContain('Thank you!')
      },
    )
  })

  it('links the action button to "/" by default', () => {
    return html(`<mol-plan-updated-page></mol-plan-updated-page>`, [PlanUpdatedPage]).then(
      (markup) => {
        expect(markup).toContain('href="/"')
        expect(markup).toContain('data-button=""')
      },
    )
  })

  it('honours a custom actionHref', () => {
    return html(`<mol-plan-updated-page [actionHref]="'/dashboard'"></mol-plan-updated-page>`, [
      PlanUpdatedPage,
    ]).then((markup) => {
      expect(markup).toContain('href="/dashboard"')
    })
  })

  it('honours custom message / thankYou / action default text', () => {
    return html(
      `<mol-plan-updated-page [messageDefault]="'Subscription changed.'" [thankYouDefault]="'Cheers!'" [actionDefault]="'Go back'"></mol-plan-updated-page>`,
      [PlanUpdatedPage],
    ).then((markup) => {
      expect(markup).toContain('Subscription changed.')
      expect(markup).toContain('Cheers!')
      expect(markup).toContain('Go back')
    })
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    // The real useAuth().state is a signal; a plain getter never re-checks an OnPush view.
    const authState = signal({ initialized: false })
    mockUseAuth.mockReturnValue({ state: authState })
    const m = await mount(`<i>a</i><mol-plan-updated-page></mol-plan-updated-page><i>b</i>`, [
      PlanUpdatedPage,
    ])
    const tags = (): string[] => Array.from(m.root.children).map((el) => el.tagName.toLowerCase())
    // Uninitialized auth: React's root is the centered <Flex>; no host remains.
    expect(tags()).toEqual(['i', 'div', 'i'])
    expect(m.root.querySelector('mol-plan-updated-page')).toBeNull()
    // Toggle presence: initialized auth renders React's confirmation <main>.
    authState.set({ initialized: true })
    m.set({})
    expect(tags()).toEqual(['i', 'main', 'i'])
    authState.set({ initialized: false })
    m.set({})
    expect(tags()).toEqual(['i', 'div', 'i'])
    expect(m.root.querySelector('mol-plan-updated-page')).toBeNull()
  })
})

describe('PrivacyPage', () => {
  it('renders the default "Privacy" title and boilerplate intro', () => {
    return html(`<mol-privacy-page></mol-privacy-page>`, [PrivacyPage]).then((markup) => {
      expect(markup).toContain('Privacy')
      expect(markup).toContain('This is the Privacy page')
      expect(markup).toContain('data-mol-id="page-privacy"')
    })
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    return html(`<mol-privacy-page><p data-real="">real</p></mol-privacy-page>`, [
      PrivacyPage,
    ]).then((markup) => {
      expect(markup).toContain('data-real=""')
      expect(markup).not.toContain('This is the Privacy page')
    })
  })

  it('honours a custom titleDefault', () => {
    return html(`<mol-privacy-page [titleDefault]="'Datenschutz'"></mol-privacy-page>`, [
      PrivacyPage,
    ]).then((markup) => {
      expect(markup).toContain('Datenschutz')
    })
  })

  it('keeps a consumer list in order when an item is inserted in the middle of body', async () => {
    const m = await mount(
      `<mol-privacy-page>@for (x of p['xs']; track x) {<b>{{ x }}</b>}</mol-privacy-page>`,
      [PrivacyPage],
      { xs: [1, 3] },
    )
    expect(itemTexts(m.root)).toEqual(['1', '3'])
    m.set({ xs: [1, 2, 3] })
    expect(itemTexts(m.root)).toEqual(['1', '2', '3'])
    m.set({ xs: [1, 2] })
    expect(itemTexts(m.root)).toEqual(['1', '2'])
  })

  it('shows and removes the intro wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-privacy-page>@if (p['on']) {<p data-real>real</p>}</mol-privacy-page>`,
      [PrivacyPage],
      { on: false },
    )
    // No children: React renders the boilerplate intro paragraph.
    expect(m.root.querySelector('[data-real]')).toBeNull()
    expect(m.root.textContent).toContain('This is the Privacy page')
    m.set({ on: true })
    // Children arrive: the intro wrapper goes and the content renders in its place.
    expect(m.root.querySelector('[data-real]')?.isConnected).toBe(true)
    expect(m.root.textContent).not.toContain('This is the Privacy page')
    m.set({ on: false })
    expect(m.root.querySelector('[data-real]')).toBeNull()
    expect(m.root.textContent).toContain('This is the Privacy page')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-privacy-page>@if (p['on']) {<p data-real>real</p>}</mol-privacy-page><i>b</i>`,
      [PrivacyPage],
      { on: false },
    )
    const tags = (): string[] => Array.from(m.root.children).map((el) => el.tagName.toLowerCase())
    // React's root is the layout's <main>; no <mol-privacy-page> or capture span remains.
    expect(tags()).toEqual(['i', 'main', 'i'])
    expect(m.root.querySelector('mol-privacy-page')).toBeNull()
    m.set({ on: true })
    expect(tags()).toEqual(['i', 'main', 'i'])
    expect(m.root.querySelector('mol-privacy-page')).toBeNull()
  })
})

describe('TermsPage', () => {
  it('renders the default "Terms" title and boilerplate intro', () => {
    return html(`<mol-terms-page></mol-terms-page>`, [TermsPage]).then((markup) => {
      expect(markup).toContain('Terms')
      expect(markup).toContain('This is the Terms page')
      expect(markup).toContain('data-mol-id="page-terms"')
    })
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    return html(`<mol-terms-page><p data-real="">real</p></mol-terms-page>`, [TermsPage]).then(
      (markup) => {
        expect(markup).toContain('data-real=""')
        expect(markup).not.toContain('This is the Terms page')
      },
    )
  })

  it('honours a custom titleDefault', () => {
    return html(`<mol-terms-page [titleDefault]="'Nutzungsbedingungen'"></mol-terms-page>`, [
      TermsPage,
    ]).then((markup) => {
      expect(markup).toContain('Nutzungsbedingungen')
    })
  })

  it('keeps a consumer list in order when an item is inserted in the middle of body', async () => {
    const m = await mount(
      `<mol-terms-page>@for (x of p['xs']; track x) {<b>{{ x }}</b>}</mol-terms-page>`,
      [TermsPage],
      { xs: [1, 3] },
    )
    expect(itemTexts(m.root)).toEqual(['1', '3'])
    m.set({ xs: [1, 2, 3] })
    expect(itemTexts(m.root)).toEqual(['1', '2', '3'])
    m.set({ xs: [1, 2] })
    expect(itemTexts(m.root)).toEqual(['1', '2'])
  })

  it('shows and removes the intro wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-terms-page>@if (p['on']) {<p data-real>real</p>}</mol-terms-page>`,
      [TermsPage],
      { on: false },
    )
    // No children: React renders the boilerplate intro paragraph.
    expect(m.root.querySelector('[data-real]')).toBeNull()
    expect(m.root.textContent).toContain('This is the Terms page')
    m.set({ on: true })
    // Children arrive: the intro wrapper goes and the content renders in its place.
    expect(m.root.querySelector('[data-real]')?.isConnected).toBe(true)
    expect(m.root.textContent).not.toContain('This is the Terms page')
    m.set({ on: false })
    expect(m.root.querySelector('[data-real]')).toBeNull()
    expect(m.root.textContent).toContain('This is the Terms page')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i><mol-terms-page>@if (p['on']) {<p data-real>real</p>}</mol-terms-page><i>b</i>`,
      [TermsPage],
      { on: false },
    )
    const tags = (): string[] => Array.from(m.root.children).map((el) => el.tagName.toLowerCase())
    expect(tags()).toEqual(['i', 'main', 'i'])
    expect(m.root.querySelector('mol-terms-page')).toBeNull()
    m.set({ on: true })
    expect(tags()).toEqual(['i', 'main', 'i'])
    expect(m.root.querySelector('mol-terms-page')).toBeNull()
  })
})

describe('ContentPageShell (slotted hero)', () => {
  it('renders the hero only when a title is supplied', () => {
    return html(`<div mol-content-page-shell>Body copy</div>`, [ContentPageShell]).then(
      (markup) => {
        expect(markup).not.toContain('<section')
        expect(markup).toContain('Body copy')
      },
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of body', async () => {
    const m = await mount(
      `<div mol-content-page-shell>@for (x of p['xs']; track x) {<b>{{ x }}</b>}</div>`,
      [ContentPageShell],
      { xs: [1, 3] },
    )
    expect(itemTexts(m.root)).toEqual(['1', '3'])
    m.set({ xs: [1, 2, 3] })
    expect(itemTexts(m.root)).toEqual(['1', '2', '3'])
    m.set({ xs: [1, 2] })
    expect(itemTexts(m.root)).toEqual(['1', '2'])
  })

  it('shows and removes the hero wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-content-page-shell>@if (p['on']) {<span slot="title" data-title>Terms</span>}Body copy</div>`,
      [ContentPageShell],
      { on: false },
    )
    // No projected title: React renders no hero band.
    expect(m.root.querySelector('section')).toBeNull()
    expect(m.root.querySelector('[data-title]')).toBeNull()
    m.set({ on: true })
    // The title arrives: the hero band and its content render in the same pass.
    expect(m.root.querySelector('section')?.isConnected).toBe(true)
    expect(m.root.querySelector('[data-title]')?.isConnected).toBe(true)
    m.set({ on: false })
    expect(m.root.querySelector('section')).toBeNull()
    expect(m.root.querySelector('[data-title]')).toBeNull()
  })
})

describe('LegalModalLinks (in-place modals)', () => {
  it('interpolates appName into BOTH the privacy and terms modal bodies', () => {
    return html(`<mol-legal-modal-links [appName]="'Acme'"></mol-legal-modal-links>`, [
      LegalModalLinks,
    ]).then((markup) => {
      // The terms modal previously dropped `appName`, leaving `{{appName}}`
      // literal — this is the regression the fix addresses.
      expect(markup).toContain('These terms govern your use of Acme.')
      // The privacy modal already interpolated; it must still work.
      expect(markup).toContain('Privacy Policy for Acme.')
      // No unsubstituted placeholder may reach the rendered output.
      expect(markup).not.toContain('{{appName}}')
    })
  })

  it('leaves the terms placeholder unsubstituted when no appName is supplied', () => {
    return html(`<mol-legal-modal-links></mol-legal-modal-links>`, [LegalModalLinks]).then(
      (markup) => {
        // Proves the content genuinely carries `{{appName}}` (so the positive
        // test is not vacuous) and that substitution is driven by the passed
        // value.
        expect(markup).toContain('These terms govern your use of {{appName}}.')
      },
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of privacyLabel', async () => {
    const m = await mount(
      `<mol-legal-modal-links>@for (x of p['xs']; track x) {<b slot="privacyLabel">{{ x }}</b>}</mol-legal-modal-links>`,
      [LegalModalLinks],
      { xs: [1, 3] },
    )
    expect(itemTexts(m.root)).toEqual(['1', '3'])
    m.set({ xs: [1, 2, 3] })
    expect(itemTexts(m.root)).toEqual(['1', '2', '3'])
    m.set({ xs: [1, 2] })
    expect(itemTexts(m.root)).toEqual(['1', '2'])
  })

  it('shows and removes the privacyLabel wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-legal-modal-links [show]="'privacy'">@if (p['on']) {<span slot="privacyLabel" data-label>My privacy</span>}</mol-legal-modal-links>`,
      [LegalModalLinks],
      { on: false },
    )
    const label = (): HTMLElement | null => m.root.querySelector('[data-label]')
    const trigger = (): HTMLElement | null => m.root.querySelector('button')
    // No projected label: React renders the translated text bare in the trigger.
    expect(label()).toBeNull()
    expect(trigger()?.textContent).toContain('Privacy Policy')
    m.set({ on: true })
    // The projected label renders bare inside the trigger in the same pass.
    expect(label()).not.toBeNull()
    expect(label()?.parentElement?.tagName).toBe('BUTTON')
    expect(label()?.isConnected).toBe(true)
    expect(trigger()?.textContent).not.toContain('Privacy Policy')
    m.set({ on: false })
    expect(label()).toBeNull()
    expect(trigger()?.textContent).toContain('Privacy Policy')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(`<i>a</i><mol-legal-modal-links></mol-legal-modal-links><i>b</i>`, [
      LegalModalLinks,
    ])
    // React's fragment (trigger buttons + portaled modals) renders in the host's
    // place; neither the wrapping host nor the label capture spans remain.
    expect(m.root.querySelector('mol-legal-modal-links')).toBeNull()
    expect(m.root.querySelector('mol-legal-modals')).toBeNull()
    const buttons = Array.from(m.root.querySelectorAll('button'))
    expect(buttons.length).toBe(2)
    for (const button of buttons) expect(button.querySelector('span')).toBeNull()
  })
})

describe('LegalModals', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const api = {
      openPrivacy: () => Promise.resolve(),
      openTerms: () => Promise.resolve(),
      modals: null,
      state: {
        privacyOpen: signal(false),
        termsOpen: signal(false),
        appName: undefined as string | undefined,
      },
    }
    const m = await mount(
      `<i>a</i><mol-legal-modals [api]="p['api']"></mol-legal-modals><i>b</i>`,
      [LegalModals],
      { api },
    )
    const tags = (): string[] => Array.from(m.root.children).map((el) => el.tagName.toLowerCase())
    // React's root is a fragment of two portaled modals; the host never appears.
    expect(m.root.querySelector('mol-legal-modals')).toBeNull()
    expect(m.root.querySelectorAll('mol-modal').length).toBe(2)
    expect(tags()[0]).toBe('i')
    // Toggle presence: the section around the modals is not the component's host.
    api.state.privacyOpen.set(true)
    m.set({})
    expect(m.root.querySelector('mol-legal-modals')).toBeNull()
    expect(tags()[0]).toBe('i')
  })
})

describe('legal content {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert on the content page', () => {
    return html(
      `<div mol-legal-content-page [kind]="'privacy'" [appName]="'Acme<img src=x onerror=alert(1)><script>evil()</script>'"></div>`,
      [LegalContentPage],
    ).then((markup) => {
      expect(markup).toContain('&lt;script&gt;')
      expect(markup).toContain('&lt;img')
      expect(markup).not.toContain('<script>evil')
    })
  })

  it('a markup-carrying appName renders inert in the legal modals too', () => {
    return html(
      `<mol-legal-modal-links [appName]="'Acme<img src=x onerror=alert(1)><script>evil()</script>'"></mol-legal-modal-links>`,
      [LegalModalLinks],
    ).then((markup) => {
      expect(markup).toContain('&lt;script&gt;')
      expect(markup).not.toContain('<script>evil')
    })
  })
})

describe('LegalContentPage (standalone bonded pages)', () => {
  it('interpolates appName into the terms body', () => {
    return html(`<div mol-legal-content-page [kind]="'terms'" [appName]="'Acme'"></div>`, [
      LegalContentPage,
    ]).then((markup) => {
      expect(markup).toContain('These terms govern your use of Acme.')
      expect(markup).not.toContain('{{appName}}')
    })
  })

  it('interpolates appName into the privacy body', () => {
    return html(`<div mol-legal-content-page [kind]="'privacy'" [appName]="'Acme'"></div>`, [
      LegalContentPage,
    ]).then((markup) => {
      expect(markup).toContain('Privacy Policy for Acme.')
      expect(markup).not.toContain('{{appName}}')
    })
  })
})
