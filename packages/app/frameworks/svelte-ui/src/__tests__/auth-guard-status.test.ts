// @vitest-environment jsdom
/**
 * AuthGuard decides from the session status, not from `initialized`: a stored
 * token AND user make the FIRST render `'authenticated'`, so a protected page
 * paints without waiting for a background verification; a retained but
 * unconfirmed candidate (`'unavailable'`) still renders the page; only
 * `'loading'` shows the loading tag, and a settled `'unauthenticated'` session
 * redirects to the login path.
 *
 * A port of `@molecule/app-ui-react/src/__tests__/auth-guard-status.test.tsx`,
 * driven by a real `@molecule/app-auth` client instead of a mocked hook.
 *
 * @module
 */
import { screen } from '@testing-library/dom'
import { mount, tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, I18nError } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'

import {
  bearerClient,
  cookieClient,
  type MountedGuard,
  mountGuard,
  signedOutClient,
} from './auth-guard-harness.js'
import NoChildrenAuthGuardHost from './NoChildrenAuthGuardHost.svelte'

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
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('AuthGuard reads the session status (xr-molecule-flash-m177)', () => {
  it('renders the page when a restored session is authenticated before `initialized`', () => {
    vi.stubGlobal('fetch', vi.fn())
    const { client } = bearerClient({ id: 'ann' })

    renderGuard(client)

    expect(screen.getByText('protected page')).toBeTruthy()
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
  })

  it('renders the page while the session is `unavailable` (stored, unconfirmed)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = cookieClient()

    renderGuard(client)
    await client.whenRestored?.()
    await settle()

    expect(screen.getByText('protected page')).toBeTruthy()
  })

  it('shows the loading fallback only while the status is `loading`', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    const { client } = bearerClient()

    renderGuard(client)

    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).not.toBeNull()
    expect(screen.queryByText('protected page')).toBeNull()
    expect(screen.queryByText('login page')).toBeNull()
  })

  it('redirects an unauthenticated visitor to the login path', async () => {
    const client = signedOutClient()

    renderGuard(client)
    await client.whenRestored?.()
    await settle()

    expect(screen.getByText('login page')).toBeTruthy()
    expect(screen.queryByText('protected page')).toBeNull()
  })

  it('AuthGuard without children throws when there is no routed view', () => {
    const { client } = bearerClient({ id: 'ann' })
    // A real router but no routed view: the guard falls back to `RoutedView`.
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const i18n = createSimpleI18nProvider()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let thrown: unknown
    try {
      mount(NoChildrenAuthGuardHost, { target: host, props: { auth: client, router, i18n } })
    } catch (error) {
      thrown = error
    } finally {
      consoleError.mockRestore()
    }
    host.remove()
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown).toMatchObject({ i18nKey: 'svelte.error.noRoutedView' })
  })
})
