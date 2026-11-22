// @vitest-environment jsdom
/**
 * The Solid `TopNavLayout`'s own text goes through i18n — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout-i18n.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom. With a
 * provider whose `t` marks every translated string, the nav region's
 * `aria-label` renders under its key — a plain-English accessor default would
 * bypass `t()` — and an explicit `navAriaLabel` prop still overrides it.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `topNavLayoutRoot`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => {
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
  return { getClassMap: () => new Proxy({}, handler) }
})

// The router markers the React tests mock `react-router` with, plus a
// translation function that marks every key, so a default that bypassed `t()`
// would show up as plain English.
vi.mock('@molecule/app-solid', () => ({
  Link: (props: { to: string; children?: JSX.Element } & Record<string, unknown>) => {
    const { to, children, ...anchor } = props
    return (
      <a {...anchor} href={to} data-link="">
        {children}
      </a>
    )
  },
  RoutedView: () => <div data-outlet="" />,
  useLocation: () => () => ({ pathname: '/', search: '', hash: '' }),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { TopNavLayout } = await import('../TopNavLayout.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a {@link TopNavLayout} and returns the markup it produced. */
function mount(view: () => JSX.Element): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(view, host))
  return host.innerHTML
}

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

describe('TopNavLayout i18n', () => {
  it('labels the nav region through t with its key', () => {
    const markup = mount(() => <TopNavLayout appName="Acme" navItems={navItems} />)
    expect(markup).toContain('aria-label="«topNavLayout.aria.primaryNavigation»"')
    expect(markup).not.toContain('aria-label="Primary navigation"')
  })

  it('an explicit navAriaLabel prop overrides the translated default', () => {
    const markup = mount(() => (
      <TopNavLayout appName="Acme" navItems={navItems} navAriaLabel="Top nav" />
    ))
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).not.toContain('«topNavLayout.aria.primaryNavigation»')
  })
})
