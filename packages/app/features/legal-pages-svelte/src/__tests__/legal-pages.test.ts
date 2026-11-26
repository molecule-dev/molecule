// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-legal-pages-svelte` — a port of
 * `@molecule/app-legal-pages-react/src/__tests__/legal-pages.test.tsx`: the
 * same test names and the same behavioral assertions, mounted with Svelte 5 in
 * jsdom and asserted on the markup each component produces.
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { readable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

// `t(key, values, opts)` resolves bonded `content.*` HTML from a tiny local
// dictionary and echoes the supplied `defaultValue` for every other key. In
// BOTH cases it performs real `{{token}}` interpolation from `values`, exactly
// like the i18n bond — so a test can prove a component forwards `appName`
// through to `t()`.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { default: Link } = await import('./stubs/Link.svelte')
  const CONTENT: Record<string, string> = {
    'content.privacyPolicy': '<p>Privacy Policy for {{appName}}.</p>',
    'content.termsOfService': '<p>These terms govern your use of {{appName}}.</p>',
  }
  const interpolate = (str: string, values?: Record<string, unknown>): string =>
    str.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
      values && name in values ? String(values[name]) : whole,
    )
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useTranslation: () => ({
      t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
        interpolate(CONTENT[key] ?? opts?.defaultValue ?? key, values),
    }),
    useAuth: mockUseAuth,
    useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
    Link,
  }
})

vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Button } = await import('./stubs/Button.svelte')
  const { default: Flex } = await import('./stubs/Flex.svelte')
  const { default: Modal } = await import('./stubs/Modal.svelte')
  const { default: Spinner } = await import('./stubs/Spinner.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Button, Flex, Modal, Spinner }
})

const { default: LegalContentPage } = await import('../LegalContentPage.svelte')
const { default: LegalModalLinks } = await import('../LegalModalLinks.svelte')
const { default: LegalPageLayout } = await import('../LegalPageLayout.svelte')
const { default: LegalPageSection } = await import('../LegalPageSection.svelte')
const { default: PlanUpdatedPage } = await import('../PlanUpdatedPage.svelte')
const { default: PrivacyPage } = await import('../PrivacyPage.svelte')
const { default: TermsPage } = await import('../TermsPage.svelte')

/** The instances mounted in the running test, unmounted after it. */
const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/**
 * A text snippet, the shape a component's node-valued prop arrives in. A raw
 * snippet renders from an HTML string whose FIRST node must be an element, so
 * the text is wrapped in a `<span>` — the assertions read the text, not the
 * wrapper.
 *
 * @param value - The text to render.
 * @returns The snippet.
 */
const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }))

/**
 * An HTML snippet, for node-valued props that carry elements.
 *
 * @param markup - The markup to render.
 * @returns The snippet.
 */
const nodes = (markup: string) => createRawSnippet(() => ({ render: () => markup }))

/**
 * Mounts one component with the given props and returns the markup it
 * rendered.
 *
 * @param component - The component under test.
 * @param props - The props to pass it.
 * @returns The rendered markup.
 */
function html<Props extends object>(component: Component<Props>, props: NoInfer<Props>): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component, { target, props })
  mounted.push(instance)
  flushSync()
  return target.innerHTML
}

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ state: readable({ initialized: true }) })
  mockUseVerifyPaymentReturn.mockReturnValue({
    status: readable('idle'),
    isReturn: readable(false),
    provider: readable(null),
    transactionId: readable(null),
    error: readable(null),
    retry: vi.fn(),
  })
})

describe('LegalPageLayout', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(LegalPageLayout, { title: text('Terms') })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Terms')
  })

  it('renders its children in the body wrapper', () => {
    const markup = html(LegalPageLayout, {
      title: text('Privacy'),
      children: nodes('<p data-body="">hello</p>'),
    })
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('hello')
  })

  it('sets data-mol-id on the <main> when supplied', () => {
    const markup = html(LegalPageLayout, { title: text('T'), dataMolId: 'page-x' })
    expect(markup).toContain('data-mol-id="page-x"')
  })

  it('uses mainClassName verbatim when supplied (no container tokens)', () => {
    const markup = html(LegalPageLayout, { title: text('T'), mainClassName: 'custom-main' })
    expect(markup).toContain('custom-main')
    expect(markup).not.toContain('container')
  })

  it('uses bodyClassName verbatim when supplied (no prose token)', () => {
    const markup = html(LegalPageLayout, { title: text('T'), bodyClassName: 'custom-body' })
    expect(markup).toContain('custom-body')
    expect(markup).not.toContain('prose')
  })

  it('falls back to ClassMap container + prose tokens with no overrides', () => {
    const markup = html(LegalPageLayout, { title: text('T') })
    expect(markup).toContain('container')
    expect(markup).toContain('prose')
  })
})

describe('LegalPageSection', () => {
  it('renders the title inside an <h2>', () => {
    const markup = html(LegalPageSection, { title: text('Section A') })
    expect(markup).toContain('<h2')
    expect(markup).toContain('Section A')
  })

  it('renders its children', () => {
    const markup = html(LegalPageSection, {
      title: text('S'),
      children: nodes('<p data-p="">body text</p>'),
    })
    expect(markup).toContain('data-p=""')
    expect(markup).toContain('body text')
  })

  it('wraps everything in a <section>', () => {
    const markup = html(LegalPageSection, { title: text('S') })
    expect(markup.startsWith('<section')).toBe(true)
  })
})

describe('PlanUpdatedPage', () => {
  it('renders only a Spinner while auth is uninitialized', () => {
    mockUseAuth.mockReturnValue({ state: readable({ initialized: false }) })
    const markup = html(PlanUpdatedPage, {})
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('data-mol-id="page-plan-updated"')
  })

  it('renders the confirmation once auth is initialized', () => {
    const markup = html(PlanUpdatedPage, {})
    expect(markup).toContain('data-mol-id="page-plan-updated"')
    expect(markup).toContain('Your plan has been updated.')
    expect(markup).toContain('Thank you!')
    expect(markup).toContain('Return to Home')
    expect(markup).not.toContain('data-spinner')
  })

  // The buyer's plan is granted by the confirmation call this page makes, so
  // a thank-you rendered while it is still in flight (or after it failed)
  // tells them they paid for something they did not get.
  it('shows the spinner, not a thank-you, while the purchase is being confirmed', () => {
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: readable('verifying'),
      isReturn: readable(true),
      provider: readable('stripe'),
      transactionId: readable('cs_live_1'),
      error: readable(null),
      retry: vi.fn(),
    })
    const markup = html(PlanUpdatedPage, {})
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('Thank you!')
  })

  it('offers a retry instead of a thank-you when confirmation fails', () => {
    const retry = vi.fn()
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: readable('failed'),
      isReturn: readable(true),
      provider: readable('stripe'),
      transactionId: readable('cs_live_1'),
      error: readable(new Error('502')),
      retry,
    })
    const markup = html(PlanUpdatedPage, {})
    expect(markup).toContain('data-mol-id="plan-updated-error"')
    expect(markup).toContain('We could not confirm your payment yet.')
    expect(markup).toContain('data-mol-id="plan-updated-retry"')
    expect(markup).not.toContain('Thank you!')
  })

  it('links the action button to "/" by default', () => {
    const markup = html(PlanUpdatedPage, {})
    expect(markup).toContain('href="/"')
    expect(markup).toContain('data-button=""')
  })

  it('honours a custom actionHref', () => {
    const markup = html(PlanUpdatedPage, { actionHref: '/dashboard' })
    expect(markup).toContain('href="/dashboard"')
  })

  it('honours custom message / thankYou / action default text', () => {
    const markup = html(PlanUpdatedPage, {
      messageDefault: 'Subscription changed.',
      thankYouDefault: 'Cheers!',
      actionDefault: 'Go back',
    })
    expect(markup).toContain('Subscription changed.')
    expect(markup).toContain('Cheers!')
    expect(markup).toContain('Go back')
  })
})

describe('PrivacyPage', () => {
  it('renders the default "Privacy" title and boilerplate intro', () => {
    const markup = html(PrivacyPage, {})
    expect(markup).toContain('Privacy')
    expect(markup).toContain('This is the Privacy page')
    expect(markup).toContain('data-mol-id="page-privacy"')
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    const markup = html(PrivacyPage, { children: nodes('<p data-real="">real</p>') })
    expect(markup).toContain('data-real=""')
    expect(markup).not.toContain('This is the Privacy page')
  })

  it('honours a custom titleDefault', () => {
    const markup = html(PrivacyPage, { titleDefault: 'Datenschutz' })
    expect(markup).toContain('Datenschutz')
  })
})

describe('TermsPage', () => {
  it('renders the default "Terms" title and boilerplate intro', () => {
    const markup = html(TermsPage, {})
    expect(markup).toContain('Terms')
    expect(markup).toContain('This is the Terms page')
    expect(markup).toContain('data-mol-id="page-terms"')
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    const markup = html(TermsPage, { children: nodes('<p data-real="">real</p>') })
    expect(markup).toContain('data-real=""')
    expect(markup).not.toContain('This is the Terms page')
  })

  it('honours a custom titleDefault', () => {
    const markup = html(TermsPage, { titleDefault: 'Nutzungsbedingungen' })
    expect(markup).toContain('Nutzungsbedingungen')
  })
})

describe('LegalModalLinks (in-place modals)', () => {
  it('interpolates appName into BOTH the privacy and terms modal bodies', () => {
    const markup = html(LegalModalLinks, { appName: 'Acme' })
    // The terms modal previously dropped `appName`, leaving `{{appName}}`
    // literal — this is the regression the fix addresses.
    expect(markup).toContain('These terms govern your use of Acme.')
    // The privacy modal already interpolated; it must still work.
    expect(markup).toContain('Privacy Policy for Acme.')
    // No unsubstituted placeholder may reach the rendered output.
    expect(markup).not.toContain('{{appName}}')
  })

  it('leaves the terms placeholder unsubstituted when no appName is supplied', () => {
    const markup = html(LegalModalLinks, {})
    // Proves the content genuinely carries `{{appName}}` (so the positive test
    // is not vacuous) and that substitution is driven by the passed value.
    expect(markup).toContain('These terms govern your use of {{appName}}.')
  })
})

describe('legal content {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert on the content page', () => {
    const markup = html(LegalContentPage, {
      kind: 'privacy',
      appName: 'Acme<img src=x onerror=alert(1)><script>evil()</script>',
    })
    expect(markup).toContain('&lt;script&gt;')
    expect(markup).toContain('&lt;img')
    expect(markup).not.toContain('<script>evil')
  })

  it('a markup-carrying appName renders inert in the legal modals too', () => {
    const markup = html(LegalModalLinks, {
      appName: 'Acme<img src=x onerror=alert(1)><script>evil()</script>',
    })
    expect(markup).toContain('&lt;script&gt;')
    expect(markup).not.toContain('<script>evil')
  })
})

describe('LegalContentPage (standalone bonded pages)', () => {
  it('interpolates appName into the terms body', () => {
    const markup = html(LegalContentPage, { kind: 'terms', appName: 'Acme' })
    expect(markup).toContain('These terms govern your use of Acme.')
    expect(markup).not.toContain('{{appName}}')
  })

  it('interpolates appName into the privacy body', () => {
    const markup = html(LegalContentPage, { kind: 'privacy', appName: 'Acme' })
    expect(markup).toContain('Privacy Policy for Acme.')
    expect(markup).not.toContain('{{appName}}')
  })
})
