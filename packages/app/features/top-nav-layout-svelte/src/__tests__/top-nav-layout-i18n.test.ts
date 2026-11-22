// @vitest-environment jsdom
/**
 * The Svelte `TopNavLayout`'s own text goes through i18n — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout-i18n.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom).
 * With a provider whose `t` marks every translated string, the nav region's
 * `aria-label` renders under its key — a plain-English prop default would
 * bypass `t()` — and an explicit `navAriaLabel` prop still overrides it.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const { default: Link } = await import('./LinkMock.svelte')
  const { default: RoutedView } = await import('./RoutedViewMock.svelte')
  const { readable } = await import('svelte/store')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Link,
    RoutedView,
    useLocation: () => readable({ pathname: '/', search: '', hash: '' }),
    useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  }
})

import type { TopNavLayoutProps } from '../types.js'

const { TopNavLayout } = await import('../components.js')

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a {@link TopNavLayout} with the given props and returns its markup. */
const render = (props: Omit<TopNavLayoutProps, 'navItems'>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(
    mount(TopNavLayout, {
      target,
      props: { navItems, ...props },
    }),
  )
  flushSync()
  return target.innerHTML
}

describe('TopNavLayout i18n', () => {
  it('labels the nav region through t with its key', () => {
    const markup = render({ appName: 'Acme' })
    expect(markup).toContain('aria-label="«topNavLayout.aria.primaryNavigation»"')
    expect(markup).not.toContain('aria-label="Primary navigation"')
  })

  it('an explicit navAriaLabel prop overrides the translated default', () => {
    const markup = render({ appName: 'Acme', navAriaLabel: 'Top nav' })
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).not.toContain('«topNavLayout.aria.primaryNavigation»')
  })
})
