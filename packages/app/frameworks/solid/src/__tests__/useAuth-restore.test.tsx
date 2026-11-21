// @vitest-environment jsdom

/**
 * `useAuth` during session restore — the Solid counterpart of React's
 * `hooks/__tests__/useAuth-restore.test.tsx`: public content stays visible
 * while the session decision is unknown, and the documented decision is the
 * three-way one, not a boolean signed-out branch.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { useAuth } from '../primitives/auth.js'
import { MoleculeProvider } from '../provider.jsx'

const user: UserProfile = { id: 'reader', name: 'Reader' }

/**
 * An in-memory adapter that can carry a stored session into a new client.
 *
 * @returns The adapter.
 */
function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

/**
 * A token whose lifetime does not require a refresh during this test.
 *
 * @returns The JWT.
 */
function createJWT(): string {
  return [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    btoa('test-signature'),
  ].join('.')
}

/**
 * A new client with a token and profile persisted by an earlier client.
 *
 * @returns The client.
 */
function createStoredSessionClient(): AuthClient<UserProfile> {
  const storage = createStorage()
  const earlier = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  earlier.setSession({ accessToken: createJWT(), user })
  return createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
}

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * A response for the client's real fetch boundary.
 *
 * @param body - The JSON body.
 * @param status - The HTTP status.
 * @returns The response.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** A public page and a signed-in section making the documented three-way decision. */
function LibraryPage(): JSX.Element {
  const { status, user } = useAuth<UserProfile>()
  return (
    <>
      <h1>Public library</h1>
      <output data-testid="session-status">{status()}</output>
      <section>
        {status() === 'loading'
          ? 'Restoring session'
          : status() === 'unauthenticated'
            ? 'Redirect to sign in'
            : `Signed in as ${user()?.name}`}
      </section>
    </>
  )
}

/**
 * Renders the page against a real auth client and provider.
 *
 * @param client - The auth client to configure.
 * @returns The container the page rendered into.
 */
function renderPage(client: AuthClient<UserProfile>): HTMLElement {
  return mount(() => (
    <MoleculeProvider auth={client} awaitSession={false}>
      <LibraryPage />
    </MoleculeProvider>
  ))
}

/**
 * The text of the page's status element.
 *
 * @param container - The rendered page.
 * @returns The status text.
 */
function statusText(container: HTMLElement): string | null | undefined {
  return container.querySelector('[data-testid="session-status"]')?.textContent
}

/**
 * The JSDoc block immediately before an exported declaration.
 *
 * @param source - The file's text.
 * @param marker - The declaration to find.
 * @returns The JSDoc block before it.
 */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`Missing ${marker}`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
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

    const container = renderPage(client)

    expect(container.querySelector('h1')?.textContent).toBe('Public library')
    expect(statusText(container)).toBe('loading')
    expect(container.textContent).toContain('Restoring session')
    expect(container.textContent).not.toContain('Redirect to sign in')

    answerRestore(jsonResponse({ error: 'expired' }, 401))
    await client.whenRestored?.()
    await settle()

    expect(container.querySelector('h1')?.textContent).toBe('Public library')
    expect(statusText(container)).toBe('unauthenticated')
    expect(container.textContent).toContain('Redirect to sign in')
  })

  it.each([
    ['a 5xx', () => Promise.resolve(jsonResponse({ error: 'down' }, 503))],
    ['a network error', () => Promise.reject(new Error('network down'))],
  ] as const)('keeps a stored session signed in after %s', async (_label, answer) => {
    const fetchBoundary = vi.fn<typeof fetch>(answer)
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createStoredSessionClient()
    const container = renderPage(client)

    expect(statusText(container)).toBe('authenticated')
    expect(container.textContent).toContain('Signed in as Reader')

    await client.validateSession?.()
    await settle()

    expect(fetchBoundary).toHaveBeenCalledOnce()
    expect(container.querySelector('h1')?.textContent).toBe('Public library')
    expect(statusText(container)).toBe('unavailable')
    expect(container.textContent).toContain('Signed in as Reader')
    expect(client.getAccessToken()).not.toBeNull()
  })
})

describe('useAuth restore guidance', () => {
  it('teaches the three-way decision instead of a boolean signed-out branch', () => {
    const hookSource = readFileSync(join(import.meta.dirname, '../primitives/auth.ts'), 'utf8')
    const moduleSource = readFileSync(join(import.meta.dirname, '../index.ts'), 'utf8')
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
