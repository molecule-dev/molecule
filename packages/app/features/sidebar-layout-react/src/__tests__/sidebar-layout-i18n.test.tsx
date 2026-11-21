// @vitest-environment jsdom
/**
 * SidebarLayout's nav-region label goes through i18n, and follows a locale
 * switch.
 *
 * The label used to be the hardcoded English `aria-label="Primary navigation"`,
 * which no provider could translate. It now flows through `useTranslation()`
 * from `@molecule/app-react` (the `sidebarLayout.aria.primaryNavigation` key),
 * which subscribes through `useSyncExternalStore`, so the nav re-renders on a
 * locale switch. A provider whose `t` marks every string proves a default that
 * bypassed `t()`.
 *
 * @module
 */
import { act, createElement, type ReactElement, type ReactNode, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

// Class tokens echo their own name — the same mock the other tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))

// The router stubs the other tests use: `Link` renders an anchor and the
// location is a fixed page path.
vi.mock('react-router', () => ({
  Link: ({ to, children, className }: { to: string; children?: ReactNode; className?: string }) =>
    createElement('a', { href: to, 'data-link': '', className }, children),
  Outlet: () => createElement('div', { 'data-outlet': '' }),
  useLocation: () => ({ pathname: '/dashboard' }),
}))

// The provider's locale, switchable from the tests (the hook re-renders
// through the store subscription, the way the real useTranslation does).
const i18n = vi.hoisted(() => ({ locale: 'en', listeners: new Set<() => void>() }))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => {
    useSyncExternalStore(
      (onChange) => {
        i18n.listeners.add(onChange)
        return () => {
          i18n.listeners.delete(onChange)
        }
      },
      () => i18n.locale,
      () => i18n.locale,
    )
    return {
      t: (key: string) => `«${i18n.locale}:${key}»`,
    }
  },
}))

const { SidebarLayout } = await import('../SidebarLayout.js')

const navItems = [{ to: '/dashboard', key: 'dashboard', label: 'Dashboard' }]

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  i18n.locale = 'en'
})

/**
 * Mounts a component in jsdom, kept until the test's cleanup so a locale
 * switch re-renders in place.
 *
 * @param element - The element to render.
 * @returns The container.
 */
async function mount(element: ReactElement): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(element)
  })
  return host
}

/**
 * Switches the mock provider's locale and flushes the re-render.
 *
 * @param locale - The locale to switch to.
 */
async function switchLocale(locale: string): Promise<void> {
  await act(async () => {
    i18n.locale = locale
    i18n.listeners.forEach((listener) => listener())
  })
}

describe('SidebarLayout i18n', () => {
  it('takes the nav region label through t with its key', async () => {
    const container = await mount(createElement(SidebarLayout, { appName: 'Acme', navItems }))
    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('«en:sidebarLayout.aria.primaryNavigation»')
  })

  it('lets an explicit navAriaLabel prop override the translated default', async () => {
    const container = await mount(
      createElement(SidebarLayout, { appName: 'Acme', navItems, navAriaLabel: 'Nav override' }),
    )
    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Nav override')
    expect(nav?.getAttribute('aria-label')).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', async () => {
    const container = await mount(createElement(SidebarLayout, { appName: 'Acme', navItems }))
    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('«en:sidebarLayout.aria.primaryNavigation»')

    // The switch itself: the label must re-render in the new locale. Against
    // the old hardcoded attribute this stayed English — nothing subscribed it.
    await switchLocale('de')
    expect(nav?.getAttribute('aria-label')).toBe('«de:sidebarLayout.aria.primaryNavigation»')
  })
})
