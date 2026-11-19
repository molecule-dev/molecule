// @vitest-environment jsdom
/**
 * `useAuth` during a session restore: a public page stays visible while the
 * restore is undecided and redirects only once the server rejects it, and the
 * guidance in the source teaches the three-way `status` decision rather than a
 * boolean signed-out branch.
 *
 * The React cases render under an `AuthProvider`; a Vue composable is injected
 * through `moleculePlugin`, so a `Probe` page component does the same job
 * against the same real client.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { moleculePlugin } from '../../plugin.js'
import { useAuth } from '../useAuth.js'

const user: UserProfile = { id: 'reader', name: 'Reader' }
const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

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
const LibraryPage = defineComponent({
  setup() {
    const { status, user: currentUser } = useAuth<UserProfile>()
    return () =>
      h('div', [
        h('h1', 'Public library'),
        h('output', { 'data-testid': 'session-status' }, status.value),
        h(
          'section',
          status.value === 'loading'
            ? 'Restoring session'
            : status.value === 'unauthenticated'
              ? 'Redirect to sign in'
              : `Signed in as ${currentUser.value?.name ?? ''}`,
        ),
      ])
  },
})

/**
 * Render the page against a real auth client and provider.
 *
 * @param client - The auth client the plugin injects.
 * @returns The mounted wrapper.
 */
function renderPage(client: AuthClient<UserProfile>): VueWrapper {
  const wrapper = mount(LibraryPage, {
    global: { plugins: [[moleculePlugin, { auth: client }]] },
  })
  wrappers.push(wrapper)
  return wrapper
}

/** The JSDoc block immediately before an exported declaration. */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`Missing ${marker}`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

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

    const wrapper = renderPage(client)

    expect(wrapper.get('h1').text()).toBe('Public library')
    expect(wrapper.get('[data-testid="session-status"]').text()).toBe('loading')
    expect(wrapper.text()).toContain('Restoring session')
    expect(wrapper.text()).not.toContain('Redirect to sign in')

    answerRestore(jsonResponse({ error: 'expired' }, 401))
    await client.whenRestored?.()

    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="session-status"]').text()).toBe('unauthenticated'),
    )
    expect(wrapper.get('h1').text()).toBe('Public library')
    expect(wrapper.text()).toContain('Redirect to sign in')
  })

  it.each([
    ['a 5xx', () => Promise.resolve(jsonResponse({ error: 'down' }, 503))],
    ['a network error', () => Promise.reject(new Error('network down'))],
  ] as const)('keeps a stored session signed in after %s', async (_label, answer) => {
    const fetchBoundary = vi.fn<typeof fetch>(answer)
    vi.stubGlobal('fetch', fetchBoundary)
    const client = createStoredSessionClient()
    const wrapper = renderPage(client)

    expect(wrapper.get('[data-testid="session-status"]').text()).toBe('authenticated')
    expect(wrapper.text()).toContain('Signed in as Reader')

    await client.validateSession?.()
    await nextTick()

    expect(fetchBoundary).toHaveBeenCalledOnce()
    expect(wrapper.get('h1').text()).toBe('Public library')
    expect(wrapper.get('[data-testid="session-status"]').text()).toBe('unavailable')
    expect(wrapper.text()).toContain('Signed in as Reader')
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
