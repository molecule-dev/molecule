// @vitest-environment jsdom
/**
 * Unit tests for `@molecule/app-legal-pages-solid` — a port of
 * `@molecule/app-legal-pages-react/src/__tests__/legal-pages.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Solid in
 * jsdom and asserted on the markup each component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

// `t(key, values, opts)` resolves bonded `content.*` HTML from a tiny local
// dictionary and echoes the supplied `defaultValue` for every other key. In
// BOTH cases it performs real `{{token}}` interpolation from `values`, exactly
// like the i18n bond — so a test can prove a component forwards `appName`
// through to `t()`.
vi.mock('@molecule/app-solid', () => {
  const CONTENT: Record<string, string> = {
    'content.privacyPolicy': '<p>Privacy Policy for {{appName}}.</p>',
    'content.termsOfService': '<p>These terms govern your use of {{appName}}.</p>',
  }
  const interpolate = (str: string, values?: Record<string, unknown>): string =>
    str.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
      values && name in values ? String(values[name]) : whole,
    )
  return {
    useTranslation: () => ({
      t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
        interpolate(CONTENT[key] ?? opts?.defaultValue ?? key, values),
    }),
    useAuth: mockUseAuth,
    useVerifyPaymentReturn: mockUseVerifyPaymentReturn,
    Link: (props: { to: string; children?: JSX.Element }) => (
      <a href={props.to}>{props.children}</a>
    ),
  }
})

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element } & Record<string, unknown>) => {
    const { children, ...rest } = props
    return (
      <button data-button="" {...rest}>
        {children}
      </button>
    )
  },
  Flex: (props: { children?: JSX.Element }) => <div data-flex="">{props.children}</div>,
  Spinner: () => <span data-spinner="" />,
  // Render the body unconditionally: the port's Modal only renders while open,
  // and the assertions read the modal body without driving its state — the same
  // stub the React tests use.
  Modal: (props: { children?: JSX.Element }) => <div data-modal="">{props.children}</div>,
}))

const { LegalContentPage } = await import('../LegalContentPage.jsx')
const { LegalModalLinks } = await import('../LegalModalLinks.jsx')
const { LegalPageLayout } = await import('../LegalPageLayout.jsx')
const { LegalPageSection } = await import('../LegalPageSection.jsx')
const { PlanUpdatedPage } = await import('../PlanUpdatedPage.jsx')
const { PrivacyPage } = await import('../PrivacyPage.jsx')
const { TermsPage } = await import('../TermsPage.jsx')

/** The disposers of every view mounted in the running test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders one view with Solid's browser renderer and returns the markup it
 * produced.
 *
 * @param view - The JSX to render.
 * @returns The rendered markup.
 */
function html(view: () => JSX.Element): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
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

describe('LegalPageLayout', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(() => <LegalPageLayout title="Terms" />)
    expect(markup).toContain('<h1')
    expect(markup).toContain('Terms')
  })

  it('renders its children in the body wrapper', () => {
    const markup = html(() => (
      <LegalPageLayout title="Privacy">
        <p data-body="">hello</p>
      </LegalPageLayout>
    ))
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('hello')
  })

  it('sets data-mol-id on the <main> when supplied', () => {
    const markup = html(() => <LegalPageLayout title="T" dataMolId="page-x" />)
    expect(markup).toContain('data-mol-id="page-x"')
  })

  it('uses mainClassName verbatim when supplied (no container tokens)', () => {
    const markup = html(() => <LegalPageLayout title="T" mainClassName="custom-main" />)
    expect(markup).toContain('custom-main')
    expect(markup).not.toContain('container')
  })

  it('uses bodyClassName verbatim when supplied (no prose token)', () => {
    const markup = html(() => <LegalPageLayout title="T" bodyClassName="custom-body" />)
    expect(markup).toContain('custom-body')
    expect(markup).not.toContain('prose')
  })

  it('falls back to ClassMap container + prose tokens with no overrides', () => {
    const markup = html(() => <LegalPageLayout title="T" />)
    expect(markup).toContain('container')
    expect(markup).toContain('prose')
  })
})

describe('LegalPageSection', () => {
  it('renders the title inside an <h2>', () => {
    const markup = html(() => <LegalPageSection title="Section A" />)
    expect(markup).toContain('<h2')
    expect(markup).toContain('Section A')
  })

  it('renders its children', () => {
    const markup = html(() => (
      <LegalPageSection title="S">
        <p data-p="">body text</p>
      </LegalPageSection>
    ))
    expect(markup).toContain('data-p=""')
    expect(markup).toContain('body text')
  })

  it('wraps everything in a <section>', () => {
    const markup = html(() => <LegalPageSection title="S" />)
    expect(markup.startsWith('<section')).toBe(true)
  })
})

describe('PlanUpdatedPage', () => {
  it('renders only a Spinner while auth is uninitialized', () => {
    mockUseAuth.mockReturnValue({ state: () => ({ initialized: false }) })
    const markup = html(() => <PlanUpdatedPage />)
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('data-mol-id="page-plan-updated"')
  })

  it('renders the confirmation once auth is initialized', () => {
    const markup = html(() => <PlanUpdatedPage />)
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
      status: () => 'verifying',
      isReturn: () => true,
      provider: () => 'stripe',
      transactionId: () => 'cs_live_1',
      error: () => null,
      retry: vi.fn(),
    })
    const markup = html(() => <PlanUpdatedPage />)
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('Thank you!')
  })

  it('offers a retry instead of a thank-you when confirmation fails', () => {
    const retry = vi.fn()
    mockUseVerifyPaymentReturn.mockReturnValue({
      status: () => 'failed',
      isReturn: () => true,
      provider: () => 'stripe',
      transactionId: () => 'cs_live_1',
      error: () => new Error('502'),
      retry,
    })
    const markup = html(() => <PlanUpdatedPage />)
    expect(markup).toContain('data-mol-id="plan-updated-error"')
    expect(markup).toContain('We could not confirm your payment yet.')
    expect(markup).toContain('data-mol-id="plan-updated-retry"')
    expect(markup).not.toContain('Thank you!')
  })

  it('links the action button to "/" by default', () => {
    const markup = html(() => <PlanUpdatedPage />)
    expect(markup).toContain('href="/"')
    expect(markup).toContain('data-button=""')
  })

  it('honours a custom actionHref', () => {
    const markup = html(() => <PlanUpdatedPage actionHref="/dashboard" />)
    expect(markup).toContain('href="/dashboard"')
  })

  it('honours custom message / thankYou / action default text', () => {
    const markup = html(() => (
      <PlanUpdatedPage
        messageDefault="Subscription changed."
        thankYouDefault="Cheers!"
        actionDefault="Go back"
      />
    ))
    expect(markup).toContain('Subscription changed.')
    expect(markup).toContain('Cheers!')
    expect(markup).toContain('Go back')
  })
})

describe('PrivacyPage', () => {
  it('renders the default "Privacy" title and boilerplate intro', () => {
    const markup = html(() => <PrivacyPage />)
    expect(markup).toContain('Privacy')
    expect(markup).toContain('This is the Privacy page')
    expect(markup).toContain('data-mol-id="page-privacy"')
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    const markup = html(() => (
      <PrivacyPage>
        <p data-real="">real</p>
      </PrivacyPage>
    ))
    expect(markup).toContain('data-real=""')
    expect(markup).not.toContain('This is the Privacy page')
  })

  it('honours a custom titleDefault', () => {
    const markup = html(() => <PrivacyPage titleDefault="Datenschutz" />)
    expect(markup).toContain('Datenschutz')
  })
})

describe('TermsPage', () => {
  it('renders the default "Terms" title and boilerplate intro', () => {
    const markup = html(() => <TermsPage />)
    expect(markup).toContain('Terms')
    expect(markup).toContain('This is the Terms page')
    expect(markup).toContain('data-mol-id="page-terms"')
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    const markup = html(() => (
      <TermsPage>
        <p data-real="">real</p>
      </TermsPage>
    ))
    expect(markup).toContain('data-real=""')
    expect(markup).not.toContain('This is the Terms page')
  })

  it('honours a custom titleDefault', () => {
    const markup = html(() => <TermsPage titleDefault="Nutzungsbedingungen" />)
    expect(markup).toContain('Nutzungsbedingungen')
  })
})

describe('LegalModalLinks (in-place modals)', () => {
  it('interpolates appName into BOTH the privacy and terms modal bodies', () => {
    const markup = html(() => <LegalModalLinks appName="Acme" />)
    // The terms modal previously dropped `appName`, leaving `{{appName}}`
    // literal — this is the regression the fix addresses.
    expect(markup).toContain('These terms govern your use of Acme.')
    // The privacy modal already interpolated; it must still work.
    expect(markup).toContain('Privacy Policy for Acme.')
    // No unsubstituted placeholder may reach the rendered output.
    expect(markup).not.toContain('{{appName}}')
  })

  it('leaves the terms placeholder unsubstituted when no appName is supplied', () => {
    const markup = html(() => <LegalModalLinks />)
    // Proves the content genuinely carries `{{appName}}` (so the positive test
    // is not vacuous) and that substitution is driven by the passed value.
    expect(markup).toContain('These terms govern your use of {{appName}}.')
  })
})

describe('legal content {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert on the content page', () => {
    const markup = html(() => (
      <LegalContentPage
        kind="privacy"
        appName="Acme<img src=x onerror=alert(1)><script>evil()</script>"
      />
    ))
    expect(markup).toContain('&lt;script&gt;')
    expect(markup).toContain('&lt;img')
    expect(markup).not.toContain('<script>evil')
  })

  it('a markup-carrying appName renders inert in the legal modals too', () => {
    const markup = html(() => (
      <LegalModalLinks appName="Acme<img src=x onerror=alert(1)><script>evil()</script>" />
    ))
    expect(markup).toContain('&lt;script&gt;')
    expect(markup).not.toContain('<script>evil')
  })
})

describe('LegalContentPage (standalone bonded pages)', () => {
  it('interpolates appName into the terms body', () => {
    const markup = html(() => <LegalContentPage kind="terms" appName="Acme" />)
    expect(markup).toContain('These terms govern your use of Acme.')
    expect(markup).not.toContain('{{appName}}')
  })

  it('interpolates appName into the privacy body', () => {
    const markup = html(() => <LegalContentPage kind="privacy" appName="Acme" />)
    expect(markup).toContain('Privacy Policy for Acme.')
    expect(markup).not.toContain('{{appName}}')
  })
})
