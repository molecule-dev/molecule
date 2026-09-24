// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RouterProvider, useLocation, useNavigate } from '@molecule/app-react'
import { createMemoryRouter } from '@molecule/app-routing'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AppShellFooter, AppShellTopNav, type NavItem } from '../index.js'

const navItems: NavItem[] = [
  { id: '/', label: 'Home', to: '/' },
  { id: '/projects', label: 'Projects', to: '/projects', badge: <span>3</span> },
  { id: '/settings', label: 'Settings', to: '/settings' },
]

/**
 * The README example, verbatim.
 *
 * @param props - Layout props.
 * @param props.children - Page content.
 * @returns The rendered app layout.
 */
function AppLayout({ children }: { children: ReactNode }): React.JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <>
      <AppShellTopNav
        logo={<strong>Acme</strong>}
        items={navItems}
        activeId={pathname}
        onItemClick={(item) => item.to && navigate(item.to)}
        right={
          <button type="button" onClick={() => navigate('/account')}>
            Account
          </button>
        }
      />
      <main>{children}</main>
      <AppShellFooter
        copyright={`© ${new Date().getFullYear()} Acme Inc.`}
        links={[
          { label: 'Privacy', to: '/privacy' },
          { label: 'Terms', to: '/terms' },
        ]}
      />
    </>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('highlights the current route and navigates through the router on click', () => {
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const view = render(
      <RouterProvider router={router}>
        <AppLayout>
          <p>Dashboard</p>
        </AppLayout>
      </RouterProvider>,
    )
    expect(view.getByText('Dashboard')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(view.getByRole('button', { name: /^Projects/ }))
    expect(router.getLocation().pathname).toBe('/projects')
    expect(view.getByRole('button', { name: /^Projects/ }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(view.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBeNull()
    fireEvent.click(view.getByRole('button', { name: 'Account' }))
    expect(router.getLocation().pathname).toBe('/account')
    expect(view.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy')
    expect(view.getByText(`© ${new Date().getFullYear()} Acme Inc.`)).toBeTruthy()
  })
})
