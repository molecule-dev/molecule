import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
}))

const {
  AuthShell,
  AuthShellContainer,
  AuthShellDecoration,
  AuthShellCard,
  AuthShellHeading,
  AuthShellFooter,
  AuthShellBackLink,
  AuthShellSplit,
  AuthShellSplitRow,
  AuthShellPanel,
  AuthShellCardColumn,
} = await import('../AuthShell.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('AuthShellContainer', () => {
  it('renders its children and forwards className + style', () => {
    const markup = html(
      createElement(AuthShellContainer, {
        children: createElement('div', { 'data-c': '' }),
        className: 'cont-cls',
        style: { background: 'red' },
      }),
    )
    expect(markup).toContain('data-c=""')
    expect(markup).toContain('cont-cls')
    expect(markup).toContain('background:red')
  })
})

describe('AuthShellDecoration', () => {
  it('renders its children inside a pointer-events-none layer', () => {
    const markup = html(
      createElement(AuthShellDecoration, { children: createElement('div', { 'data-orb': '' }) }),
    )
    expect(markup).toContain('data-orb=""')
    expect(markup).toContain('pointer-events-none')
  })
})

describe('AuthShellCard', () => {
  it('renders its children and the dataMolId', () => {
    const markup = html(
      createElement(AuthShellCard, {
        children: createElement('div', { 'data-body': '' }),
        dataMolId: 'auth-card',
      }),
    )
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('data-mol-id="auth-card"')
  })

  it('uses the default glass surface unless surfaceClassName overrides it', () => {
    const def = html(createElement(AuthShellCard, { children: 'x' }))
    expect(def).toContain('backdrop-blur-2xl')
    const custom = html(
      createElement(AuthShellCard, { children: 'x', surfaceClassName: 'my-surface' }),
    )
    expect(custom).toContain('my-surface')
    expect(custom).not.toContain('backdrop-blur-2xl')
  })
})

describe('AuthShellHeading', () => {
  it('renders the heading inside an <h1>', () => {
    const markup = html(createElement(AuthShellHeading, { heading: 'Sign in' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Sign in')
  })

  it('renders the subheading and eyebrow when present and omits them otherwise', () => {
    const full = html(
      createElement(AuthShellHeading, {
        heading: 'H',
        subheading: 'welcome back',
        eyebrow: 'ACCOUNT',
      }),
    )
    expect(full).toContain('welcome back')
    expect(full).toContain('ACCOUNT')
    const bare = html(createElement(AuthShellHeading, { heading: 'H' }))
    expect(bare).not.toContain('welcome back')
    expect(bare).not.toContain('ACCOUNT')
  })
})

describe('AuthShellFooter', () => {
  it('renders its children inside a <footer>', () => {
    const markup = html(
      createElement(AuthShellFooter, { children: createElement('span', { 'data-f': '' }) }),
    )
    expect(markup).toContain('<footer')
    expect(markup).toContain('data-f=""')
  })
})

describe('AuthShellBackLink', () => {
  it('renders a Link to "/" with the default "Back to home" label', () => {
    const markup = html(createElement(AuthShellBackLink, {}))
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('href="/"')
    expect(markup).toContain('Back to home')
  })

  it('honours a custom destination and label', () => {
    const markup = html(createElement(AuthShellBackLink, { to: '/welcome', label: 'Go back' }))
    expect(markup).toContain('href="/welcome"')
    expect(markup).toContain('Go back')
  })
})

describe('AuthShellSplit', () => {
  it('renders its children (row + optional footer sibling) and forwards className', () => {
    const markup = html(
      createElement(AuthShellSplit, {
        className: 'split-cls',
        children: [
          createElement('div', { 'data-row': '', key: 'r' }),
          createElement('footer', { 'data-site-footer': '', key: 'f' }),
        ],
      }),
    )
    expect(markup).toContain('data-row=""')
    expect(markup).toContain('data-site-footer=""')
    expect(markup).toContain('split-cls')
  })
})

describe('AuthShellSplitRow', () => {
  it('renders its two column children and forwards className', () => {
    const markup = html(
      createElement(AuthShellSplitRow, {
        className: 'row-cls',
        children: [
          createElement('div', { 'data-panel': '', key: 'p' }),
          createElement('div', { 'data-col': '', key: 'c' }),
        ],
      }),
    )
    expect(markup).toContain('data-panel=""')
    expect(markup).toContain('data-col=""')
    expect(markup).toContain('row-cls')
  })
})

describe('AuthShellPanel', () => {
  it('renders its children inside a hidden lg:flex aside by default', () => {
    const markup = html(
      createElement(AuthShellPanel, { children: createElement('div', { 'data-brand': '' }) }),
    )
    expect(markup).toContain('<aside')
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('hidden lg:flex')
  })

  it('appends className alongside the shared hidden lg:flex collapse', () => {
    const markup = html(createElement(AuthShellPanel, { children: 'x', className: 'my-panel' }))
    expect(markup).toContain('my-panel')
    // `hidden lg:flex` is the one universally-shared concern and always
    // applies; the app's className (width / gradient / padding) appends.
    expect(markup).toContain('hidden lg:flex')
  })
})

describe('AuthShellCardColumn', () => {
  it('renders its children inside a centered section and appends className', () => {
    const markup = html(
      createElement(AuthShellCardColumn, {
        children: createElement('div', { 'data-card': '' }),
        className: 'col-cls',
      }),
    )
    expect(markup).toContain('<section')
    expect(markup).toContain('data-card=""')
    expect(markup).toContain('col-cls')
  })
})

describe('AuthShell (preset)', () => {
  it('renders the heading, children, and back link by default', () => {
    const markup = html(
      createElement(AuthShell, {
        heading: 'Welcome',
        subheading: 'sign in to continue',
        children: createElement('form', { 'data-form': '' }),
      }),
    )
    expect(markup).toContain('Welcome')
    expect(markup).toContain('sign in to continue')
    expect(markup).toContain('data-form=""')
    expect(markup).toContain('Back to home')
  })

  it('renders the brand, decoration, and footer slots when supplied', () => {
    const markup = html(
      createElement(AuthShell, {
        heading: 'H',
        subheading: 'S',
        children: 'x',
        brand: createElement('div', { 'data-brand': '' }),
        decoration: createElement('div', { 'data-decoration': '' }),
        footer: createElement('div', { 'data-footer': '' }),
      }),
    )
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('data-decoration=""')
    expect(markup).toContain('data-footer=""')
  })

  it('hides the back link when showBackLink is false', () => {
    const markup = html(
      createElement(AuthShell, {
        heading: 'H',
        subheading: 'S',
        children: 'x',
        showBackLink: false,
      }),
    )
    expect(markup).not.toContain('Back to home')
  })
})
