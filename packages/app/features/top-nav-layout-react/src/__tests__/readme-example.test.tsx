// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type TopNavItem, TopNavLayout } from '../index.js'

// Start the browser history on a child route before the router is created.
window.history.pushState({}, '', '/reports')

const navItems: TopNavItem[] = [
  { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
]

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <TopNavLayout
        appName="Acme"
        navItems={navItems}
        userMenu={<Link to="/account">Account</Link>}
      />
    ),
    children: [
      { path: 'dashboard', element: <h1>Dashboard</h1> },
      { path: 'reports', element: <h1>Reports</h1> },
    ],
  },
])

/**
 * The README example, verbatim.
 *
 * @returns The routed app.
 */
function App(): React.JSX.Element {
  return <RouterProvider router={router} />
}

let root: Root | undefined
let container: HTMLElement

/**
 * Finds a nav link by its href.
 *
 * @param href - Link href.
 * @returns The anchor element.
 */
function link(href: string): HTMLAnchorElement {
  const el = container.querySelector<HTMLAnchorElement>(`nav a[href="${href}"]`)
  if (!el) throw new Error(`no nav link to ${href}`)
  return el
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('renders the shell around the routed page and switches pages via the nav', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root?.render(<App />))

    expect(container.querySelector('header a[href="/"]')?.textContent).toBe('Acme')
    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Primary navigation')
    expect(container.querySelector('header a[href="/account"]')?.textContent).toBe('Account')
    expect(container.querySelector('main h1')?.textContent).toBe('Reports')
    expect(link('/reports').getAttribute('aria-current')).toBe('page')
    expect(link('/dashboard').textContent).toBe('dashboardDashboard')

    await act(async () => {
      link('/dashboard').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
      )
    })
    expect(container.querySelector('main h1')?.textContent).toBe('Dashboard')
    expect(window.location.pathname).toBe('/dashboard')
    expect(link('/dashboard').getAttribute('aria-current')).toBe('page')
    expect(link('/reports').getAttribute('aria-current')).toBeNull()
  })
})
