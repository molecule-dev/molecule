/**
 * The React `TopNavLayout`'s own text goes through i18n: with a provider whose
 * `t` marks every translated string, the nav region's `aria-label` renders
 * under its key — a plain-English default would bypass `t()` and stay English
 * after a locale switch (the gap the conformance kit's pseudo-locale check
 * records) — and an explicit `navAriaLabel` prop still overrides it.
 *
 * @module
 */

import type { ReactElement, ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'

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

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English. Everything else (the real
// `RouterProvider`, `useLocation`, `RoutedView` and `Link`) stays real.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { TopNavLayout } = await import('../TopNavLayout.js')

/** The page the routing bond renders where the layout puts its routed view. */
const RoutedPage = (): ReactElement => createElement('div', { 'data-outlet': '' })

/**
 * Renders a layout under a memory router at `path`, with {@link RoutedPage} as the routed view.
 *
 * @param el - The layout.
 * @param path - The router's location.
 * @returns The markup.
 */
const html = (el: ReactNode, path = '/'): string =>
  renderToStaticMarkup(
    createElement(RouterProvider, {
      router: createMemoryRouter({ initialEntries: [path] }),
      routedView: RoutedPage,
      children: el,
    }),
  )

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
