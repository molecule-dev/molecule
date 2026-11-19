// @vitest-environment jsdom

/**
 * `useAuth` during a session restore, React's case in Svelte's idiom: the page
 * under `setMoleculeContext({ auth })` keeps its public content visible while
 * the status is still `loading`, redirects only once the restore is rejected
 * with 401, and teaches the three-way decision in its docs.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, StorageAdapter, UserProfile } from '@molecule/app-auth'
import { createJWTAuthClient } from '@molecule/app-auth'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../context.js'
import LibraryPage from './auth/LibraryPage.svelte'

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

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

/** An in-memory adapter that can carry a stored session into a new client. */
function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
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
  earlier.setSession({ accessToken: createJWT(), user: { id: 'reader', name: 'Reader' } })
  return createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
}

/**
 * Mounts the public library page under a real auth client.
 *
 * @param client - The auth client the context carries.
 * @returns The page's container.
 */
function mountPage(client: AuthClient<UserProfile>): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: { config: { auth: client }, setMoleculeContext, component: LibraryPage, props: {} },
  })
  flushSync()
  hosts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return container
}

/**
 * Finds a required element, failing the test when it is absent.
 *
 * @param container - The tree's container.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function required<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

/**
 * The JSDoc block immediately before an exported declaration.
 *
 * @param source - The source text to search.
 * @param marker - The declaration's opening text.
 * @returns The JSDoc block's text.
 */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`Missing ${marker}`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
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

    const container = mountPage(client)

    expect(required(container, 'h1').textContent).toBe('Public library')
    expect(required(container, '[data-testid="session-status"]').textContent).toBe('loading')
    expect(container.textContent).toContain('Restoring session')
    expect(container.textContent).not.toContain('Redirect to sign in')

    answerRestore(jsonResponse({ error: 'expired' }, 401))
    await client.whenRestored?.()
    flushSync()

    expect(required(container, 'h1').textContent).toBe('Public library')
    expect(required(container, '[data-testid="session-status"]').textContent).toBe(
      'unauthenticated',
    )
    expect(container.textContent).toContain('Redirect to sign in')
  })

  it.each([
    ['a 5xx', () => Promise.resolve(jsonResponse({ error: 'down' }, 503))],
    ['a network error', () => Promise.reject(new Error('network down'))],
  ] as const)('keeps a stored session signed in after %s', async (_label, answer) => {
    const fetchBoundary = vi.fn<typeof fetch>(answer)
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createStoredSessionClient()
    const container = mountPage(client)

    expect(required(container, '[data-testid="session-status"]').textContent).toBe('authenticated')
    expect(container.textContent).toContain('Signed in as Reader')

    await client.validateSession?.()
    flushSync()

    expect(fetchBoundary).toHaveBeenCalledOnce()
    expect(required(container, 'h1').textContent).toBe('Public library')
    expect(required(container, '[data-testid="session-status"]').textContent).toBe('unavailable')
    expect(container.textContent).toContain('Signed in as Reader')
    expect(client.getAccessToken()).not.toBeNull()
  })
})

describe('useAuth restore guidance', () => {
  it('teaches the three-way decision instead of a boolean signed-out branch', () => {
    const hookSource = readFileSync(join(import.meta.dirname, '../hooks/useAuth.ts'), 'utf8')
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
