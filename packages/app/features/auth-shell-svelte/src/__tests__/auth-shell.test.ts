// @vitest-environment jsdom
/**
 * Unit tests for the Svelte auth-shell components — a port of
 * `@molecule/app-auth-shell-react/src/__tests__/auth-shell.test.tsx`: the same
 * behavioral assertions, rendered with Svelte in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `authShellCardSurface`), the same mock the React tests use.
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

// React's test mocks react-router's `Link`; the Svelte counterpart mocks the
// binding's `Link` (a plain anchor) and `useTranslation`.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const MockLink = (await import('./mock-link.svelte')).default
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: MockLink,
    useTranslation: () => ({
      // A marker provider: every key renders as «key», so text that bypassed
      // t() (a hardcoded default or literal) shows up as plain English.
      t: (key: string) => `«${key}»`,
    }),
  }
})

const {
  AuthShell,
  AuthShellBackLink,
  AuthShellCard,
  AuthShellCardColumn,
  AuthShellContainer,
  AuthShellDecoration,
  AuthShellFooter,
  AuthShellHeading,
  AuthShellPanel,
  AuthShellSplit,
  AuthShellSplitRow,
} = await import('../components.js')

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts a component with props and returns the markup it produced.
 *
 * @param component - The component.
 * @param props - Its props.
 * @returns The rendered markup.
 */
const render = <P extends Record<string, unknown>>(component: Component<P>, props: P): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

describe('AuthShellContainer', () => {
  it('renders its children and forwards className + style', () => {
    const markup = render(AuthShellContainer, {
      children: raw('<div data-c=""></div>'),
      className: 'cont-cls',
      style: { background: 'red' },
    })
    expect(markup).toContain('data-c=""')
    expect(markup).toContain('cont-cls')
    expect(markup).toContain('background')
    expect(markup).toContain('red')
  })
})

describe('AuthShellDecoration', () => {
  it('renders its children inside the non-interactive decoration layer', () => {
    const markup = render(AuthShellDecoration, { children: raw('<div data-orb=""></div>') })
    expect(markup).toContain('data-orb=""')
    expect(markup).toContain('authShellDecoration')
  })
})

describe('AuthShellCard', () => {
  it('renders its children and the dataMolId', () => {
    const markup = render(AuthShellCard, {
      children: raw('<div data-body=""></div>'),
      dataMolId: 'auth-card',
    })
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('data-mol-id="auth-card"')
  })

  it('uses the default glass surface unless surfaceClassName overrides it', () => {
    const def = render(AuthShellCard, { children: raw('x') })
    expect(def).toContain('authShellCardSurface')
    const custom = render(AuthShellCard, { children: raw('x'), surfaceClassName: 'my-surface' })
    expect(custom).toContain('my-surface')
    expect(custom).not.toContain('authShellCardSurface')
  })
})

describe('AuthShellHeading', () => {
  it('renders the heading inside an <h1>', () => {
    const markup = render(AuthShellHeading, { heading: 'Sign in' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Sign in')
  })

  it('renders the subheading and eyebrow when present and omits them otherwise', () => {
    const full = render(AuthShellHeading, {
      heading: 'H',
      subheading: 'welcome back',
      eyebrow: 'ACCOUNT',
    })
    expect(full).toContain('welcome back')
    expect(full).toContain('ACCOUNT')
    const bare = render(AuthShellHeading, { heading: 'H' })
    expect(bare).not.toContain('welcome back')
    expect(bare).not.toContain('ACCOUNT')
  })
})

describe('AuthShellFooter', () => {
  it('renders its children inside a <footer>', () => {
    const markup = render(AuthShellFooter, { children: raw('<span data-f=""></span>') })
    expect(markup).toContain('<footer')
    expect(markup).toContain('data-f=""')
  })
})

describe('AuthShellBackLink', () => {
  it('renders a Link to "/" with the default "Back to home" label', () => {
    const markup = render(AuthShellBackLink, {})
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('href="/"')
    expect(markup).toContain('«auth.backHome»')
  })

  it('takes the default label through i18n by default', () => {
    const markup = render(AuthShellBackLink, {})
    // The marker provider renders every translated string as «key»; plain
    // English here would mean the label bypassed t().
    expect(markup).toContain('«auth.backHome»')
    expect(markup).not.toContain('Back to home')
  })

  it('falls back to the default label when the label is empty or blank', () => {
    // An empty or blank label would leave the link with no accessible name (the
    // glyph is aria-hidden), so it falls back to the translated default.
    for (const label of ['', '  ']) {
      const markup = render(AuthShellBackLink, { label })
      expect(markup).toContain('«auth.backHome»')
    }
  })

  it('renders the arrow glyph aria-hidden so the label alone names the link', () => {
    const markup = render(AuthShellBackLink, {})
    // The glyph is a Material Symbols ligature name — "arrow_back" paints a
    // left arrow — not text a screen reader should announce. The link's
    // accessible name is its t() label alone. (Svelte orders the span's
    // attributes differently from React, so pin the attribute to the span
    // without relying on attribute order.)
    expect(markup).toMatch(/<span [\s\S]*?aria-hidden="true"[\s\S]*?>arrow_back<\/span>/)
  })

  it('honours a custom destination and label', () => {
    const markup = render(AuthShellBackLink, { to: '/welcome', label: 'Go back' })
    expect(markup).toContain('href="/welcome"')
    expect(markup).toContain('Go back')
    // An explicit label bypasses t(), so no marker wraps it.
    expect(markup).not.toContain('«')
  })
})

describe('AuthShellSplit', () => {
  it('renders its children (row + optional footer sibling) and forwards className', () => {
    const markup = render(AuthShellSplit, {
      className: 'split-cls',
      children: raw('<div><div data-row=""></div><footer data-site-footer=""></footer></div>'),
    })
    expect(markup).toContain('data-row=""')
    expect(markup).toContain('data-site-footer=""')
    expect(markup).toContain('split-cls')
  })
})

describe('AuthShellSplitRow', () => {
  it('renders its two column children and forwards className', () => {
    const markup = render(AuthShellSplitRow, {
      className: 'row-cls',
      children: raw('<div><div data-panel=""></div><div data-col=""></div></div>'),
    })
    expect(markup).toContain('data-panel=""')
    expect(markup).toContain('data-col=""')
    expect(markup).toContain('row-cls')
  })
})

describe('AuthShellPanel', () => {
  it('renders its children inside the panel aside (hidden below lg) by default', () => {
    const markup = render(AuthShellPanel, { children: raw('<div data-brand=""></div>') })
    expect(markup).toContain('<aside')
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('authShellPanel')
  })

  it('appends className alongside the shared panel collapse', () => {
    const markup = render(AuthShellPanel, { children: raw('x'), className: 'my-panel' })
    expect(markup).toContain('my-panel')
    // The panel's below-lg collapse is the one universally-shared concern and always
    // applies; the app's className (width / gradient / padding) appends.
    expect(markup).toContain('authShellPanel')
  })
})

describe('AuthShellCardColumn', () => {
  it('renders its children inside a centered section and appends className', () => {
    const markup = render(AuthShellCardColumn, {
      className: 'col-cls',
      children: raw('<div data-card=""></div>'),
    })
    expect(markup).toContain('<section')
    expect(markup).toContain('data-card=""')
    expect(markup).toContain('col-cls')
  })

  it('renders as <main> when as="main" is passed', () => {
    const markup = render(AuthShellCardColumn, { as: 'main', children: raw('x') })
    expect(markup).toContain('<main')
    expect(markup).not.toContain('<section')
  })
})

describe('AuthShell (preset)', () => {
  it('renders the heading, children, and back link by default', () => {
    const markup = render(AuthShell, {
      heading: 'Welcome',
      subheading: 'sign in to continue',
      children: raw('<form data-form=""></form>'),
    })
    expect(markup).toContain('Welcome')
    expect(markup).toContain('sign in to continue')
    expect(markup).toContain('data-form=""')
    expect(markup).toContain('«auth.backHome»')
  })

  it("renders the back link's arrow glyph aria-hidden", () => {
    const markup = render(AuthShell, {
      heading: 'Welcome',
      subheading: 'sign in to continue',
      children: raw('<form data-form=""></form>'),
    })
    // The composed AuthShellBackLink hides its Material Symbols glyph from
    // the accessibility tree, exactly as the standalone primitive does.
    // (Svelte orders the span's attributes differently from React.)
    expect(markup).toMatch(/<span [\s\S]*?aria-hidden="true"[\s\S]*?>arrow_back<\/span>/)
  })

  it('renders the brand, decoration, and footer slots when supplied', () => {
    const markup = render(AuthShell, {
      heading: 'H',
      subheading: 'S',
      children: raw('x'),
      brand: raw('<div data-brand=""></div>'),
      decoration: raw('<div data-decoration=""></div>'),
      footer: raw('<div data-footer=""></div>'),
    })
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('data-decoration=""')
    expect(markup).toContain('data-footer=""')
  })

  it('hides the back link when showBackLink is false', () => {
    const markup = render(AuthShell, {
      heading: 'H',
      subheading: 'S',
      children: raw('x'),
      showBackLink: false,
    })
    expect(markup).not.toContain('«auth.backHome»')
    expect(markup).not.toContain('arrow_back')
  })
})
