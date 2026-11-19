// @vitest-environment jsdom
/**
 * AuthGuard with a real restoring client: a cached session paints the
 * protected section on the first render, a signed-out client redirects only
 * after its session decision, and a candidate the server cannot confirm
 * (`'unavailable'`, through a 503) keeps the page instead of bouncing the
 * visitor to the login screen.
 *
 * A port of
 * `@molecule/app-ui-react/src/__tests__/auth-guard-restore.integration.test.tsx`.
 *
 * @module
 */
import { screen } from '@testing-library/dom'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  bearerClient,
  cookieClient,
  type MountedGuard,
  mountGuard,
  signedOutClient,
} from './auth-guard-harness.js'

const mounted: MountedGuard[] = []

/** Mounts the guard at `/private` and registers it for teardown. */
function renderGuard(client: Parameters<typeof mountGuard>[0]): MountedGuard {
  const guard = mountGuard(client, { initialEntries: ['/private'], loginLabel: 'Login page' })
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
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('AuthGuard with a real restoring client', () => {
  it('renders a protected section on the first render of a full-load client with a cached session', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { client } = bearerClient({ id: 'account', email: 'reader@example.test' })

    renderGuard(client)

    expect(client.getState().status).toBe('authenticated')
    expect(screen.getByText('Protected section')).toBeTruthy()
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
    expect(screen.queryByText('Login page')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('redirects a real signed-out full-load client after its session decision', async () => {
    const client = signedOutClient()

    renderGuard(client)
    await client.whenRestored?.()
    await settle()

    expect(client.getState().status).toBe('unauthenticated')
    expect(screen.getByText('Login page')).toBeTruthy()
    expect(screen.queryByText('Protected section')).toBeNull()
  })

  it('does not redirect a cookie-only candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = cookieClient()

    renderGuard(client)
    await client.whenRestored?.()
    await settle()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(screen.getByText('Protected section')).toBeTruthy()
    expect(screen.queryByText('Login page')).toBeNull()
    expect(document.cookie).toContain('mol_auth=1')
  })

  it('does not redirect a Bearer candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const { client, token } = bearerClient()

    renderGuard(client)
    await client.whenRestored?.()
    await settle()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(client.getAccessToken()).toBe(token)
    expect(screen.getByText('Protected section')).toBeTruthy()
    expect(screen.queryByText('Login page')).toBeNull()
    expect(JSON.parse(screen.getByTestId('auth-state').textContent ?? '{}')).toMatchObject({
      status: 'unavailable',
      isAuthenticated: false,
      user: null,
    })
  })
})
