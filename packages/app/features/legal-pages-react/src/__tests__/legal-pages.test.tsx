import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// `useAuth` is hoisted so individual tests can flip `initialized`.
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(4)`) and also usable bare (`cm.prose`).
// `cn(...)` joins tokens, calling any function-valued args first so bare
// property tokens survive.
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

// `t(key, values, opts)` echoes the supplied `defaultValue` so canonical
// English copy lands in the rendered markup.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
  useAuth: mockUseAuth,
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
  Flex: ({ children }: { children?: ReactNode }) =>
    createElement('div', { 'data-flex': '' }, children),
  Spinner: () => createElement('span', { 'data-spinner': '' }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to }, children),
}))

const { LegalPageLayout } = await import('../LegalPageLayout.js')
const { LegalPageSection } = await import('../LegalPageSection.js')
const { PlanUpdatedPage } = await import('../PlanUpdatedPage.js')
const { PrivacyPage } = await import('../PrivacyPage.js')
const { TermsPage } = await import('../TermsPage.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ state: { initialized: true } })
})

describe('LegalPageLayout', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(createElement(LegalPageLayout, { title: 'Terms', children: null }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Terms')
  })

  it('renders its children in the body wrapper', () => {
    const markup = html(
      createElement(LegalPageLayout, {
        title: 'Privacy',
        children: createElement('p', { 'data-body': '' }, 'hello'),
      }),
    )
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('hello')
  })

  it('sets data-mol-id on the <main> when supplied', () => {
    const markup = html(
      createElement(LegalPageLayout, { title: 'T', children: null, dataMolId: 'page-x' }),
    )
    expect(markup).toContain('data-mol-id="page-x"')
  })

  it('uses mainClassName verbatim when supplied (no container tokens)', () => {
    const markup = html(
      createElement(LegalPageLayout, { title: 'T', children: null, mainClassName: 'custom-main' }),
    )
    expect(markup).toContain('custom-main')
    expect(markup).not.toContain('container')
  })

  it('uses bodyClassName verbatim when supplied (no prose token)', () => {
    const markup = html(
      createElement(LegalPageLayout, { title: 'T', children: null, bodyClassName: 'custom-body' }),
    )
    expect(markup).toContain('custom-body')
    expect(markup).not.toContain('prose')
  })

  it('falls back to ClassMap container + prose tokens with no overrides', () => {
    const markup = html(createElement(LegalPageLayout, { title: 'T', children: null }))
    expect(markup).toContain('container')
    expect(markup).toContain('prose')
  })
})

describe('LegalPageSection', () => {
  it('renders the title inside an <h2>', () => {
    const markup = html(createElement(LegalPageSection, { title: 'Section A', children: null }))
    expect(markup).toContain('<h2')
    expect(markup).toContain('Section A')
  })

  it('renders its children', () => {
    const markup = html(
      createElement(LegalPageSection, {
        title: 'S',
        children: createElement('p', { 'data-p': '' }, 'body text'),
      }),
    )
    expect(markup).toContain('data-p=""')
    expect(markup).toContain('body text')
  })

  it('wraps everything in a <section>', () => {
    const markup = html(createElement(LegalPageSection, { title: 'S', children: null }))
    expect(markup.startsWith('<section')).toBe(true)
  })
})

describe('PlanUpdatedPage', () => {
  it('renders only a Spinner while auth is uninitialized', () => {
    mockUseAuth.mockReturnValue({ state: { initialized: false } })
    const markup = html(createElement(PlanUpdatedPage))
    expect(markup).toContain('data-spinner=""')
    expect(markup).not.toContain('data-mol-id="page-plan-updated"')
  })

  it('renders the confirmation once auth is initialized', () => {
    const markup = html(createElement(PlanUpdatedPage))
    expect(markup).toContain('data-mol-id="page-plan-updated"')
    expect(markup).toContain('Your plan has been updated.')
    expect(markup).toContain('Thank you!')
    expect(markup).toContain('Return to Home')
    expect(markup).not.toContain('data-spinner')
  })

  it('links the action button to "/" by default', () => {
    const markup = html(createElement(PlanUpdatedPage))
    expect(markup).toContain('href="/"')
    expect(markup).toContain('data-button=""')
  })

  it('honours a custom actionHref', () => {
    const markup = html(createElement(PlanUpdatedPage, { actionHref: '/dashboard' }))
    expect(markup).toContain('href="/dashboard"')
  })

  it('honours custom message / thankYou / action default text', () => {
    const markup = html(
      createElement(PlanUpdatedPage, {
        messageDefault: 'Subscription changed.',
        thankYouDefault: 'Cheers!',
        actionDefault: 'Go back',
      }),
    )
    expect(markup).toContain('Subscription changed.')
    expect(markup).toContain('Cheers!')
    expect(markup).toContain('Go back')
  })
})

describe('PrivacyPage', () => {
  it('renders the default "Privacy" title and boilerplate intro', () => {
    const markup = html(createElement(PrivacyPage, {}))
    expect(markup).toContain('Privacy')
    expect(markup).toContain('This is the Privacy page')
    expect(markup).toContain('data-mol-id="page-privacy"')
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    const markup = html(
      createElement(PrivacyPage, { children: createElement('p', { 'data-real': '' }, 'real') }),
    )
    expect(markup).toContain('data-real=""')
    expect(markup).not.toContain('This is the Privacy page')
  })

  it('honours a custom titleDefault', () => {
    const markup = html(createElement(PrivacyPage, { titleDefault: 'Datenschutz' }))
    expect(markup).toContain('Datenschutz')
  })
})

describe('TermsPage', () => {
  it('renders the default "Terms" title and boilerplate intro', () => {
    const markup = html(createElement(TermsPage, {}))
    expect(markup).toContain('Terms')
    expect(markup).toContain('This is the Terms page')
    expect(markup).toContain('data-mol-id="page-terms"')
  })

  it('renders supplied children instead of the boilerplate intro', () => {
    const markup = html(
      createElement(TermsPage, { children: createElement('p', { 'data-real': '' }, 'real') }),
    )
    expect(markup).toContain('data-real=""')
    expect(markup).not.toContain('This is the Terms page')
  })

  it('honours a custom titleDefault', () => {
    const markup = html(createElement(TermsPage, { titleDefault: 'Nutzungsbedingungen' }))
    expect(markup).toContain('Nutzungsbedingungen')
  })
})
