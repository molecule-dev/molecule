// @vitest-environment jsdom
/**
 * An AuthGuard wrapping the whole route tree, login page included, must
 * redirect once and then render the login page. The redirect comparison is
 * against the login path's PATHNAME, so a `loginPath` carrying a query
 * (`/signin?next=%2F`) still matches the rendered `/signin`.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/auth-guard-wraps-login.test.tsx`
 * onto the real in-memory router.
 *
 * @module
 */
import { screen } from '@testing-library/dom'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'

import { type MountedGuard, mountGuard, signedOutClient } from './auth-guard-harness.js'

const mounted: MountedGuard[] = []

/** Mounts the guard and registers it for teardown. */
function renderGuard(...args: Parameters<typeof mountGuard>): MountedGuard {
  const guard = mountGuard(...args)
  mounted.push(guard)
  return guard
}

/** Lets the session notification, redirect and re-render settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await tick()
}

afterEach(() => {
  for (const guard of mounted.splice(0)) guard.destroy()
  document.body.innerHTML = ''
})

describe('AuthGuard around the login route', () => {
  it('redirects once to the login path and renders the login page', async () => {
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const navigate = vi.spyOn(router, 'navigate')
    const client = signedOutClient()

    renderGuard(client, { router })
    await client.whenRestored?.()
    await settle()

    expect(screen.getByText('login page')).toBeTruthy()
    expect(screen.queryByText('protected page')).toBeNull()
    expect(screen.getByTestId('where').textContent).toBe('/login')
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('compares only the pathname of a login path with a query', async () => {
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const navigate = vi.spyOn(router, 'navigate')
    const client = signedOutClient()

    renderGuard(client, { router, loginPath: '/signin?next=%2F' })
    await client.whenRestored?.()
    await settle()

    expect(screen.getByText('signin page')).toBeTruthy()
    expect(screen.getByTestId('where').textContent).toBe('/signin')
    expect(navigate).toHaveBeenCalledTimes(1)
  })
})
