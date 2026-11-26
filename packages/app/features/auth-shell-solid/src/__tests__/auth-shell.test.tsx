// @vitest-environment jsdom
/**
 * Unit tests for the Solid auth-shell components — a port of
 * `@molecule/app-auth-shell-react/src/__tests__/auth-shell.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the markup
 * the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// React's test mocks react-router's `Link`; the Solid counterpart mocks the
// binding's `Link` and `useTranslation`.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Link: (props: { to?: string; children?: JSX.Element }) => (
    <a href={props.to ?? '/'} data-link="">
      {props.children}
    </a>
  ),
  useTranslation: () => ({
    // A marker provider: every key renders as «key», so text that bypassed
    // t() (a hardcoded default or literal) shows up as plain English.
    t: (key: string) => `«${key}»`,
  }),
}))

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
} = await import('../AuthShell.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view and returns its markup with the two-way wrapper.
 *
 * @param view - The view factory.
 * @returns The rendered markup.
 */
const html = (view: () => JSX.Element): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('AuthShellContainer', () => {
  it('renders its children and forwards className + style', () => {
    const markup = html(() => (
      <AuthShellContainer className="cont-cls" style={{ background: 'red' }}>
        <div data-c="" />
      </AuthShellContainer>
    ))
    expect(markup).toContain('data-c=""')
    expect(markup).toContain('cont-cls')
    expect(markup).toContain('background')
    expect(markup).toContain('red')
  })
})

describe('AuthShellDecoration', () => {
  it('renders its children inside the non-interactive decoration layer', () => {
    const markup = html(() => (
      <AuthShellDecoration>
        <div data-orb="" />
      </AuthShellDecoration>
    ))
    expect(markup).toContain('data-orb=""')
    expect(markup).toContain('authShellDecoration')
  })
})

describe('AuthShellCard', () => {
  it('renders its children and the dataMolId', () => {
    const markup = html(() => (
      <AuthShellCard dataMolId="auth-card">
        <div data-body="" />
      </AuthShellCard>
    ))
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('data-mol-id="auth-card"')
  })

  it('uses the default glass surface unless surfaceClassName overrides it', () => {
    const def = html(() => <AuthShellCard>x</AuthShellCard>)
    expect(def).toContain('authShellCardSurface')
    const custom = html(() => <AuthShellCard surfaceClassName="my-surface">x</AuthShellCard>)
    expect(custom).toContain('my-surface')
    expect(custom).not.toContain('authShellCardSurface')
  })
})

describe('AuthShellHeading', () => {
  it('renders the heading inside an <h1>', () => {
    const markup = html(() => <AuthShellHeading heading="Sign in" />)
    expect(markup).toContain('<h1')
    expect(markup).toContain('Sign in')
  })

  it('renders the subheading and eyebrow when present and omits them otherwise', () => {
    const full = html(() => (
      <AuthShellHeading heading="H" subheading="welcome back" eyebrow="ACCOUNT" />
    ))
    expect(full).toContain('welcome back')
    expect(full).toContain('ACCOUNT')
    const bare = html(() => <AuthShellHeading heading="H" />)
    expect(bare).not.toContain('welcome back')
    expect(bare).not.toContain('ACCOUNT')
  })
})

describe('AuthShellFooter', () => {
  it('renders its children inside a <footer>', () => {
    const markup = html(() => (
      <AuthShellFooter>
        <span data-f="" />
      </AuthShellFooter>
    ))
    expect(markup).toContain('<footer')
    expect(markup).toContain('data-f=""')
  })
})

describe('AuthShellBackLink', () => {
  it('renders a Link to "/" with the default "Back to home" label', () => {
    const markup = html(() => <AuthShellBackLink />)
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('href="/"')
    expect(markup).toContain('«auth.backHome»')
  })

  it('takes the default label through i18n by default', () => {
    const markup = html(() => <AuthShellBackLink />)
    // The marker provider renders every translated string as «key»; plain
    // English here would mean the label bypassed t().
    expect(markup).toContain('«auth.backHome»')
    expect(markup).not.toContain('Back to home')
  })

  it('falls back to the default label when the label is empty or blank', () => {
    // An empty or blank label would leave the link with no accessible name (the
    // glyph is aria-hidden), so it falls back to the translated default.
    for (const label of ['', '  ']) {
      const markup = html(() => <AuthShellBackLink label={label} />)
      expect(markup).toContain('«auth.backHome»')
    }
  })

  it('renders the arrow glyph aria-hidden so the label alone names the link', () => {
    const markup = html(() => <AuthShellBackLink />)
    // The glyph is a Material Symbols ligature name — "arrow_back" paints a
    // left arrow — not text a screen reader should announce. The link's
    // accessible name is its t() label alone. (Solid orders the span's
    // attributes differently from React and its class mock carries a `>`, so
    // pin the attribute to the span without relying on attribute order.)
    expect(markup).toMatch(/<span [\s\S]*?aria-hidden="true"[\s\S]*?>arrow_back<\/span>/)
  })

  it('honours a custom destination and label', () => {
    const markup = html(() => <AuthShellBackLink to="/welcome" label="Go back" />)
    expect(markup).toContain('href="/welcome"')
    expect(markup).toContain('Go back')
    // An explicit label bypasses t(), so no marker wraps it.
    expect(markup).not.toContain('«')
  })
})

describe('AuthShellSplit', () => {
  it('renders its children (row + optional footer sibling) and forwards className', () => {
    const markup = html(() => (
      <AuthShellSplit className="split-cls">
        <div data-row="" />
        <footer data-site-footer="" />
      </AuthShellSplit>
    ))
    expect(markup).toContain('data-row=""')
    expect(markup).toContain('data-site-footer=""')
    expect(markup).toContain('split-cls')
  })
})

describe('AuthShellSplitRow', () => {
  it('renders its two column children and forwards className', () => {
    const markup = html(() => (
      <AuthShellSplitRow className="row-cls">
        <div data-panel="" />
        <div data-col="" />
      </AuthShellSplitRow>
    ))
    expect(markup).toContain('data-panel=""')
    expect(markup).toContain('data-col=""')
    expect(markup).toContain('row-cls')
  })
})

describe('AuthShellPanel', () => {
  it('renders its children inside the panel aside (hidden below lg) by default', () => {
    const markup = html(() => (
      <AuthShellPanel>
        <div data-brand="" />
      </AuthShellPanel>
    ))
    expect(markup).toContain('<aside')
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('authShellPanel')
  })

  it('appends className alongside the shared panel collapse', () => {
    const markup = html(() => <AuthShellPanel className="my-panel">x</AuthShellPanel>)
    expect(markup).toContain('my-panel')
    // The panel's below-lg collapse is the one universally-shared concern and always
    // applies; the app's className (width / gradient / padding) appends.
    expect(markup).toContain('authShellPanel')
  })
})

describe('AuthShellCardColumn', () => {
  it('renders its children inside a centered section and appends className', () => {
    const markup = html(() => (
      <AuthShellCardColumn className="col-cls">
        <div data-card="" />
      </AuthShellCardColumn>
    ))
    expect(markup).toContain('<section')
    expect(markup).toContain('data-card=""')
    expect(markup).toContain('col-cls')
  })

  it('renders as <main> when as="main" is passed', () => {
    const markup = html(() => <AuthShellCardColumn as="main">x</AuthShellCardColumn>)
    expect(markup).toContain('<main')
    expect(markup).not.toContain('<section')
  })
})

describe('AuthShell (preset)', () => {
  it('renders the heading, children, and back link by default', () => {
    const markup = html(() => (
      <AuthShell heading="Welcome" subheading="sign in to continue">
        <form data-form="" />
      </AuthShell>
    ))
    expect(markup).toContain('Welcome')
    expect(markup).toContain('sign in to continue')
    expect(markup).toContain('data-form=""')
    expect(markup).toContain('«auth.backHome»')
  })

  it("renders the back link's arrow glyph aria-hidden", () => {
    const markup = html(() => (
      <AuthShell heading="Welcome" subheading="sign in to continue">
        <form data-form="" />
      </AuthShell>
    ))
    // The composed AuthShellBackLink hides its Material Symbols glyph from
    // the accessibility tree, exactly as the standalone primitive does.
    // (Solid orders the span's attributes differently from React.)
    expect(markup).toMatch(/<span [\s\S]*?aria-hidden="true"[\s\S]*?>arrow_back<\/span>/)
  })

  it('renders the brand, decoration, and footer slots when supplied', () => {
    const markup = html(() => (
      <AuthShell
        heading="H"
        subheading="S"
        brand={<div data-brand="" />}
        decoration={<div data-decoration="" />}
        footer={<div data-footer="" />}
      >
        x
      </AuthShell>
    ))
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('data-decoration=""')
    expect(markup).toContain('data-footer=""')
  })

  it('hides the back link when showBackLink is false', () => {
    const markup = html(() => (
      <AuthShell heading="H" subheading="S" showBackLink={false}>
        x
      </AuthShell>
    ))
    expect(markup).not.toContain('«auth.backHome»')
    expect(markup).not.toContain('arrow_back')
  })
})
