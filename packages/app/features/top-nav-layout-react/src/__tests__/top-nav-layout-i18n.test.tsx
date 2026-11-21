/**
 * The React `TopNavLayout`'s own text goes through i18n: with a provider whose
 * `t` marks every translated string, the nav region's `aria-label` renders
 * under its key — a plain-English default would bypass `t()` and stay English
 * after a locale switch (the gap the conformance kit's pseudo-locale check
 * records) — and an explicit `navAriaLabel` prop still overrides it.
 *
 * @module
 */

import type { ReactNode } from 'react'
import { createElement } from 'react'
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

vi.mock('react-router', () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) =>
    createElement('a', { href: to, 'data-link': '' }, children),
  NavLink: ({
    to,
    children,
    className,
  }: {
    to: string
    children?: ReactNode
    className?: string | ((s: { isActive: boolean }) => string)
  }) =>
    createElement(
      'a',
      {
        href: to,
        'data-navlink': '',
        className: typeof className === 'function' ? className({ isActive: false }) : className,
      },
      children,
    ),
  Outlet: () => createElement('div', { 'data-outlet': '' }),
}))

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { TopNavLayout } = await import('../TopNavLayout.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

describe('TopNavLayout i18n', () => {
  it('labels the nav region through t with its key', () => {
    const markup = html(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    expect(markup).toContain('aria-label="«topNavLayout.aria.primaryNavigation»"')
    expect(markup).not.toContain('aria-label="Primary navigation"')
  })

  it('an explicit navAriaLabel prop overrides the translated default', () => {
    const markup = html(
      createElement(TopNavLayout, { appName: 'Acme', navItems, navAriaLabel: 'Top nav' }),
    )
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).not.toContain('«topNavLayout.aria.primaryNavigation»')
  })
})
