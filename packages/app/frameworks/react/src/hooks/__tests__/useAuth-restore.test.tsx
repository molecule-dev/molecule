import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { AuthProvider } from '../../providers.js'
import { useAuth } from '../useAuth.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }

/** An in-memory adapter that can carry a stored session into a new client. */
function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

/** A response for the client's real fetch boundary. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** A token whose lifetime does not require a refresh during this test. */
function createJWT(): string {
  return [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('test-signature'),
  ].join('.')
}

/** A new client with a token and profile persisted by an earlier client. */
function createStoredSessionClient(): AuthClient<UserProfile> {
  const storage = createStorage()
  const earlier = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  earlier.setSession({ accessToken: createJWT(), user })
  return createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
}

/** A public page and a signed-in section making the documented three-way decision. */
function LibraryPage() {
  const { status, user: currentUser } = useAuth<UserProfile>()
  return (
    <>
      <h1>Public library</h1>
      <output data-testid="session-status">{status}</output>
      <section>
        {status === 'loading'
          ? 'Restoring session'
          : status === 'unauthenticated'
            ? 'Redirect to sign in'
            : `Signed in as ${currentUser?.name}`}
      </section>
    </>
  )
}

/** Render the page against a real auth client and provider. */
function renderPage(client: AuthClient<UserProfile>) {
  return render(
    <AuthProvider client={client} awaitSession={false}>
      <LibraryPage />
    </AuthProvider>,
  )
}

/** The JSDoc block immediately before an exported declaration. */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`Missing ${marker}`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('useAuth during session restore', () => {
  it('keeps public content visible and does not redirect before a restore is rejected', async () => {
    let answerRestore!: (response: Response) => void
    const fetchBoundary = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          answerRestore = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })

    renderPage(client)

    expect(screen.getByRole('heading', { name: 'Public library' })).toBeTruthy()
    expect(screen.getByTestId('session-status').textContent).toBe('loading')
    expect(screen.getByText('Restoring session')).toBeTruthy()
    expect(screen.queryByText('Redirect to sign in')).toBeNull()

    await act(async () => {
      answerRestore(jsonResponse({ error: 'expired' }, 401))
      await client.whenRestored!()
    })

    expect(screen.getByRole('heading', { name: 'Public library' })).toBeTruthy()
    expect(screen.getByTestId('session-status').textContent).toBe('unauthenticated')
    expect(screen.getByText('Redirect to sign in')).toBeTruthy()
  })

  it.each([
    ['a 5xx', () => Promise.resolve(jsonResponse({ error: 'down' }, 503))],
    ['a network error', () => Promise.reject(new Error('network down'))],
  ] as const)('keeps a stored session signed in after %s', async (_label, answer) => {
    const fetchBoundary = vi.fn<typeof fetch>(answer)
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createStoredSessionClient()
    renderPage(client)

    expect(screen.getByTestId('session-status').textContent).toBe('authenticated')
    expect(screen.getByText('Signed in as Reader')).toBeTruthy()

    await act(async () => {
      await client.validateSession?.()
    })

    expect(fetchBoundary).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Public library' })).toBeTruthy()
    expect(screen.getByTestId('session-status').textContent).toBe('unavailable')
    expect(screen.getByText('Signed in as Reader')).toBeTruthy()
    expect(client.getAccessToken()).not.toBeNull()
  })
})

describe('useAuth restore guidance', () => {
  it('teaches the three-way decision instead of a boolean signed-out branch', () => {
    const hookSource = readFileSync(join(import.meta.dirname, '../useAuth.ts'), 'utf8')
    const moduleSource = readFileSync(join(import.meta.dirname, '../../index.ts'), 'utf8')
    const hookDoc = docFor(hookSource, 'export function useAuth<')
    const quickStart = moduleSource.slice(0, moduleSource.indexOf('@remarks'))

    for (const doc of [hookDoc, quickStart]) {
      expect(doc).toContain("status === 'loading'")
      expect(doc).toContain("status === 'unauthenticated'")
      expect(doc).toContain("'unavailable'")
      expect(doc).toContain('401/403')
      expect(doc).not.toContain('if (isAuthenticated)')
      expect(doc).not.toContain('if (!isAuthenticated)')
    }
  })
})
