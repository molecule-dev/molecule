// @vitest-environment jsdom

/**
 * Server rendering of the session hold: `MoleculeProvider` with `awaitSession`
 * renders its shell without starting a restore, and renders the fallback while
 * a cookie restore is still pending.
 *
 * Solid's SSR is a different runtime, so both entrypoints under test resolve to
 * the server builds here, and the pages are static template strings — what
 * vite-plugin-solid's SSR transform hands the renderer for a static element.
 *
 * Mirrors the React package's `session-ready.integration.test.tsx` server cases.
 *
 * @module
 */

vi.mock('solid-js', () => vi.importActual('solid-js/dist/server.js'))

vi.mock('solid-js/web', () => vi.importActual('solid-js/web/dist/server.js'))

import { createComponent, type JSX } from 'solid-js'
import { renderToString } from 'solid-js/web'
import { afterEach, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { MoleculeProvider } from '../provider.jsx'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []

function memoryStorage(): StorageAdapter {
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

afterEach(() => {
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

/**
 * A real client for a returning visitor whose restore request answers when the
 * returned responder is called.
 *
 * @returns The client and the responder.
 */
function returningVisitor(): { client: AuthClient<UserProfile>; answer: () => Promise<void> } {
  document.cookie = 'mol_auth=1; path=/'
  const responders: Array<(response: Response) => void> = []
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          responders.push(resolve)
        }),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  return {
    client,
    answer: async () => {
      for (const respond of responders.splice(0)) {
        respond(
          new Response(JSON.stringify({ user: reader }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      await client.whenRestored!()
    },
  }
}

it('allows an explicit ungated synchronous server shell without starting restoration', () => {
  const { client } = returningVisitor()
  const fetchSpy = vi.mocked(fetch)
  const html = String(
    renderToString(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: false },
        get children(): JSX.Element {
          return 'Server page'
        },
      }),
    ),
  )
  expect(html).toContain('Server page')
  expect(fetchSpy).not.toHaveBeenCalled()
})

it('server-renders the fallback while a cookie restore is pending', async () => {
  const { client, answer } = returningVisitor()
  const fetchSpy = vi.mocked(fetch)
  const app = (): string =>
    String(
      renderToString(() =>
        createComponent(MoleculeProvider, {
          config: {
            auth: client,
            awaitSession: true,
            get sessionFallback(): JSX.Element {
              return 'Restoring'
            },
          },
          get children(): JSX.Element {
            return 'Server page'
          },
        }),
      ),
    )
  expect(app()).toContain('Restoring')
  await answer()
  expect(app()).toContain('Server page')
  expect(fetchSpy).toHaveBeenCalledTimes(1)
})
