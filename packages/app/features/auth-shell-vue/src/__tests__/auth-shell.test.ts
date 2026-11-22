// @vitest-environment jsdom
/**
 * Unit tests for the Vue auth-shell components — a port of
 * `@molecule/app-auth-shell-react/src/__tests__/auth-shell.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the components produce.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `authShellCardSurface`), the same mock the React tests use.
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

// React's test mocks react-router's `Link`; the Vue counterpart mocks the
// binding's `Link` and `useTranslation`.
vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link: defineComponent({
      name: 'Link',
      props: { to: { type: String, default: '/' } },
      setup(props, { slots }) {
        return () => h('a', { href: props.to, 'data-link': '' }, slots.default?.())
      },
    }),
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
} = await import('../AuthShell.js')

/**
 * Renders a component with props and slots and returns its markup.
 *
 * @param Comp - The component.
 * @param props - Props.
 * @param slots - Slot render functions.
 * @returns The rendered markup.
 */
const render = (
  component: Component,
  props: Record<string, unknown> = {},
  slots: Record<string, () => VNodeChild[]> = {},
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('AuthShellContainer', () => {
  it('renders its children and forwards className + style', () => {
    const markup = render(
      AuthShellContainer,
      { className: 'cont-cls', style: { background: 'red' } },
      { default: () => [h('div', { 'data-c': '' })] },
    )
    expect(markup).toContain('data-c=""')
    expect(markup).toContain('cont-cls')
    expect(markup).toContain('background')
    expect(markup).toContain('red')
  })
})

describe('AuthShellDecoration', () => {
  it('renders its children inside the non-interactive decoration layer', () => {
    const markup = render(
      AuthShellDecoration,
      {},
      { default: () => [h('div', { 'data-orb': '' })] },
    )
    expect(markup).toContain('data-orb=""')
    expect(markup).toContain('authShellDecoration')
  })
})

describe('AuthShellCard', () => {
  it('renders its children and the dataMolId', () => {
    const markup = render(
      AuthShellCard,
      { dataMolId: 'auth-card' },
      { default: () => [h('div', { 'data-body': '' })] },
    )
    expect(markup).toContain('data-body=""')
    expect(markup).toContain('data-mol-id="auth-card"')
  })

  it('uses the default glass surface unless surfaceClassName overrides it', () => {
    const def = render(AuthShellCard, {}, { default: () => ['x'] })
    expect(def).toContain('authShellCardSurface')
    const custom = render(
      AuthShellCard,
      { surfaceClassName: 'my-surface' },
      { default: () => ['x'] },
    )
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
    const markup = render(AuthShellFooter, {}, { default: () => [h('span', { 'data-f': '' })] })
    expect(markup).toContain('<footer')
    expect(markup).toContain('data-f=""')
  })
})

describe('AuthShellBackLink', () => {
  it('renders a Link to "/" with the default "Back to home" label', () => {
    const markup = render(AuthShellBackLink)
    expect(markup).toContain('data-link=""')
    expect(markup).toContain('href="/"')
    expect(markup).toContain('«auth.backHome»')
  })

  it('takes the default label through i18n by default', () => {
    const markup = render(AuthShellBackLink)
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
    const markup = render(AuthShellBackLink)
    // The glyph is a Material Symbols ligature name — "arrow_back" paints a
    // left arrow — not text a screen reader should announce. The link's
    // accessible name is its t() label alone.
    expect(markup).toContain('aria-hidden="true">arrow_back</span>')
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
    const markup = render(
      AuthShellSplit,
      { className: 'split-cls' },
      {
        default: () => [
          h('div', { 'data-row': '', key: 'r' }),
          h('footer', { 'data-site-footer': '', key: 'f' }),
        ],
      },
    )
    expect(markup).toContain('data-row=""')
    expect(markup).toContain('data-site-footer=""')
    expect(markup).toContain('split-cls')
  })
})

describe('AuthShellSplitRow', () => {
  it('renders its two column children and forwards className', () => {
    const markup = render(
      AuthShellSplitRow,
      { className: 'row-cls' },
      {
        default: () => [
          h('div', { 'data-panel': '', key: 'p' }),
          h('div', { 'data-col': '', key: 'c' }),
        ],
      },
    )
    expect(markup).toContain('data-panel=""')
    expect(markup).toContain('data-col=""')
    expect(markup).toContain('row-cls')
  })
})

describe('AuthShellPanel', () => {
  it('renders its children inside the panel aside (hidden below lg) by default', () => {
    const markup = render(AuthShellPanel, {}, { default: () => [h('div', { 'data-brand': '' })] })
    expect(markup).toContain('<aside')
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('authShellPanel')
  })

  it('appends className alongside the shared panel collapse', () => {
    const markup = render(AuthShellPanel, { className: 'my-panel' }, { default: () => ['x'] })
    expect(markup).toContain('my-panel')
    // The panel's below-lg collapse is the one universally-shared concern and always
    // applies; the app's className (width / gradient / padding) appends.
    expect(markup).toContain('authShellPanel')
  })
})

describe('AuthShellCardColumn', () => {
  it('renders its children inside a centered section and appends className', () => {
    const markup = render(
      AuthShellCardColumn,
      { className: 'col-cls' },
      { default: () => [h('div', { 'data-card': '' })] },
    )
    expect(markup).toContain('<section')
    expect(markup).toContain('data-card=""')
    expect(markup).toContain('col-cls')
  })

  it('renders as <main> when as="main" is passed', () => {
    const markup = render(AuthShellCardColumn, { as: 'main' }, { default: () => ['x'] })
    expect(markup).toContain('<main')
    expect(markup).not.toContain('<section')
  })
})

describe('AuthShell (preset)', () => {
  it('renders the heading, children, and back link by default', () => {
    const markup = render(
      AuthShell,
      { heading: 'Welcome', subheading: 'sign in to continue' },
      { default: () => [h('form', { 'data-form': '' })] },
    )
    expect(markup).toContain('Welcome')
    expect(markup).toContain('sign in to continue')
    expect(markup).toContain('data-form=""')
    expect(markup).toContain('«auth.backHome»')
  })

  it("renders the back link's arrow glyph aria-hidden", () => {
    const markup = render(
      AuthShell,
      { heading: 'Welcome', subheading: 'sign in to continue' },
      { default: () => [h('form', { 'data-form': '' })] },
    )
    // The composed AuthShellBackLink hides its Material Symbols glyph from
    // the accessibility tree, exactly as the standalone primitive does.
    expect(markup).toContain('aria-hidden="true">arrow_back</span>')
  })

  it('renders the brand, decoration, and footer slots when supplied', () => {
    const markup = render(
      AuthShell,
      { heading: 'H', subheading: 'S' },
      {
        default: () => ['x'],
        brand: () => [h('div', { 'data-brand': '' })],
        decoration: () => [h('div', { 'data-decoration': '' })],
        footer: () => [h('div', { 'data-footer': '' })],
      },
    )
    expect(markup).toContain('data-brand=""')
    expect(markup).toContain('data-decoration=""')
    expect(markup).toContain('data-footer=""')
  })

  it('hides the back link when showBackLink is false', () => {
    const markup = render(
      AuthShell,
      { heading: 'H', subheading: 'S', showBackLink: false },
      { default: () => ['x'] },
    )
    expect(markup).not.toContain('«auth.backHome»')
    expect(markup).not.toContain('arrow_back')
  })
})
