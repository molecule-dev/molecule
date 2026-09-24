// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import { AuthProvider, useAuth } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { StorefrontAnnouncementBar, StorefrontFooter, StorefrontTopNav } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @param props - Layout props.
 * @param props.cartCount - Items in the cart.
 * @returns The storefront chrome around the routed page.
 */
function StorefrontLayout({ cartCount }: { cartCount: number }): React.JSX.Element {
  const { isAuthenticated, user, logout } = useAuth<UserProfile>()
  return (
    <>
      <StorefrontAnnouncementBar
        message="Free shipping on orders over $75"
        cta={{ to: '/shop', label: 'Shop now' }}
      />
      <StorefrontTopNav
        brand="Bazaar"
        links={[
          { to: '/shop', label: 'Shop', active: true },
          { to: '/sale', label: 'Sale' },
        ]}
        actions={[{ to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: cartCount }]}
        isAuthenticated={isAuthenticated}
        profileImageUrl={user?.avatar}
        authedMenu={[{ to: '/orders', label: 'Orders' }]}
        unauthedMenu={[
          { to: '/login', label: 'Sign in' },
          { to: '/signup', label: 'Create account' },
        ]}
        onSignOut={() => void logout()}
      />
      <main>
        <Outlet />
      </main>
      <StorefrontFooter
        brand="Bazaar"
        tagline="Everyday goods, fairly priced."
        columns={[
          {
            heading: 'Help',
            links: [
              { to: '/shipping', label: 'Shipping' },
              { to: '/returns', label: 'Returns' },
            ],
          },
        ]}
        copyright="© 2026 Bazaar"
      />
    </>
  )
}

/**
 * Mounts the layout as a layout route with a real JWT auth client.
 *
 * @param client - The auth client.
 * @returns The testing-library render result.
 */
function renderShop(client: ReturnType<typeof createJWTAuthClient>): ReturnType<typeof render> {
  return render(
    <AuthProvider client={client}>
      <MemoryRouter initialEntries={['/shop']}>
        <Routes>
          <Route element={<StorefrontLayout cartCount={3} />}>
            <Route path="/shop" element={<h1>All products</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the chrome around the page with the cart badge and the sign-in menu', () => {
    const view = renderShop(createJWTAuthClient({ baseURL: '/api', autoRefresh: false }))
    expect(view.getByRole('heading', { name: 'All products' })).toBeTruthy()
    expect(view.getByText('Free shipping on orders over $75')).toBeTruthy()
    expect(view.getByRole('link', { name: 'Shop now' }).getAttribute('href')).toBe('/shop')
    const cart = view.getByRole('link', { name: 'Cart' })
    expect(cart.getAttribute('href')).toBe('/cart')
    expect(cart.textContent).toContain('3')
    expect(view.getByText('© 2026 Bazaar')).toBeTruthy()
    expect(view.getByRole('link', { name: 'Returns' }).getAttribute('href')).toBe('/returns')

    fireEvent.click(view.getByRole('button', { name: 'Account menu' }))
    expect(view.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login')
    expect(view.queryByRole('button', { name: 'Sign Out' })).toBeNull()
  })

  it('shows the avatar and signs out through the auth client', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/api/auth/login'
        ? Response.json({
            user: { id: 'u1', name: 'Ada', avatar: 'https://cdn.example.com/ada.png' },
            accessToken: 'test-token',
          })
        : Response.json({}),
    )
    vi.stubGlobal('fetch', fetchMock)
    const client = createJWTAuthClient({ baseURL: '/api', autoRefresh: false })
    await client.login({ email: 'ada@example.com', password: 'test-password' })
    const view = renderShop(client)

    expect(view.getByAltText('User profile').getAttribute('src')).toBe(
      'https://cdn.example.com/ada.png',
    )
    fireEvent.click(view.getByRole('button', { name: 'Account menu' }))
    expect(view.getByRole('link', { name: 'Orders' }).getAttribute('href')).toBe('/orders')
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Sign Out' }))
    })
    await waitFor(() => expect(client.isAuthenticated()).toBe(false))
    expect(fetchMock).toHaveBeenCalledWith('/api/users/logout', expect.anything())
    expect(view.queryByAltText('User profile')).toBeNull()
  })
})
