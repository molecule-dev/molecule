// @vitest-environment jsdom
/**
 * The nav region's aria-label follows a locale switch: `useTranslation()`
 * subscribes the component to the bonded provider, so after `setLocale('fr')`
 * the label re-renders in French. Against a hardcoded parameter default it
 * stayed English — the gap the conformance kit's pseudo-locale check records.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

const { TopNavLayout } = await import('../TopNavLayout.js')

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'topNavLayout.aria.primaryNavigation': 'Primary navigation' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'topNavLayout.aria.primaryNavigation': 'Navigation principale' },
    },
  ])
  setProvider(provider)
})

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('TopNavLayout locale switch', () => {
  it("switching the provider's locale changes the nav region's aria-label", async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(createElement(TopNavLayout, { appName: 'Acme', navItems }))
    })
    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Primary navigation')

    await act(async () => {
      await provider.setLocale('fr')
    })

    expect(nav?.getAttribute('aria-label')).toBe('Navigation principale')
  })
})
