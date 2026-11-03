// @vitest-environment jsdom

/**
 * `MoleculeProvider awaitSession` / `SessionReady` against the real restoring auth client.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page load.
 * Pages that rendered before it answered read `user === null`: returning visitors lost a follow
 * test to a Follow button whose handler checked `!user` (a no-op or a redirect to `/login`) on
 * the profile page the suite opened with `page.goto`.
 *
 * @module
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import { useAuth } from '../hooks/useAuth.js'
import { useTheme } from '../hooks/useTheme.js'
import { useTranslation } from '../hooks/useTranslation.js'
import { MoleculeProvider } from '../providers.js'
import { SessionReady } from '../session-ready.js'

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

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(initialize = true): {
  client: AuthClient<UserProfile>
  answer: () => Promise<void>
} {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((url) =>
      String(url).endsWith('/users/me')
        ? new Promise<Response>((resolve) => {
            respond = resolve
          })
        : Promise.resolve(
            Response.json({ accessToken: 'new-token', user: { ...reader, id: 'new-reader' } }),
          ),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  if (initialize) void client.initialize()
  return {
    client,
    answer: async () => {
      await act(async () => {
        respond?.(
          new Response(JSON.stringify({ user: reader }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
        await client.whenRestored!()
      })
    },
  }
}

/** The handler shape the runs wrote: a signed-in action that bails out when `user` is null. */
function FollowButton({ onFollow }: { onFollow: (by: string) => void }) {
  const { user } = useAuth<UserProfile>()
  return (
    <button
      type="button"
      onClick={() => {
        if (!user) return
        onFollow(user.id)
      }}
    >
      Follow
    </button>
  )
}

afterEach(() => {
  cleanup()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('MoleculeProvider awaitSession', () => {
  it('renders an existing stored session synchronously without a network request', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const storage = memoryStorage()
    storage.setItem(
      'molecule:auth:accessToken',
      [btoa('{}'), btoa(JSON.stringify({ exp: 4_102_444_800 })), 'signature'].join('.'),
    )
    storage.setItem('molecule:auth:user', JSON.stringify(reader))
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    clients.push(client)
    const onFollow = vi.fn()
    render(
      <MoleculeProvider auth={client} awaitSession>
        <FollowButton onFollow={onFollow} />
      </MoleculeProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }))
    expect(onFollow).toHaveBeenCalledWith(reader.id)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('provides theme and translations to its session fallback', async () => {
    const { client, answer } = returningVisitor()
    const i18n = createSimpleI18nProvider()
    i18n.addTranslations('en', { restoring: 'Translated restore' })
    const theme: ThemeProviderType = {
      getTheme: () => lightTheme,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
      getThemes: () => [lightTheme],
    }
    function Fallback() {
      const { theme } = useTheme()
      const { t } = useTranslation()
      return (
        <p>
          {theme.name}: {t('restoring')}
        </p>
      )
    }
    render(
      <MoleculeProvider
        auth={client}
        theme={theme}
        i18n={i18n}
        awaitSession
        sessionFallback={<Fallback />}
      >
        <p>Public page</p>
      </MoleculeProvider>,
    )
    expect(screen.getByText(`${lightTheme.name}: Translated restore`)).toBeTruthy()
    await answer()
    expect(screen.getByText('Public page')).toBeTruthy()
  })

  it('leaves synchronous server rendering unchanged when the hold is omitted', () => {
    const { client } = returningVisitor(false)
    expect(
      renderToString(
        <MoleculeProvider auth={client}>
          <p>Server page</p>
        </MoleculeProvider>,
      ),
    ).toContain('Server page')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('server-renders the fallback while loading and content after initialization', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient({ storage: memoryStorage(), autoRefresh: false })
    clients.push(client)
    const app = (
      <MoleculeProvider auth={client} awaitSession sessionFallback={<p>Restoring</p>}>
        <p>Server page</p>
      </MoleculeProvider>
    )
    expect(renderToString(app)).toContain('Restoring')
    await client.initialize()
    expect(renderToString(app)).toContain('Server page')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('lazily restores exactly once under StrictMode without initialize()', async () => {
    const { client, answer } = returningVisitor(false)
    render(
      <StrictMode>
        <MoleculeProvider auth={client} awaitSession>
          <p>Public page</p>
        </MoleculeProvider>
      </StrictMode>,
    )
    expect(screen.queryByText('Public page')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
    await answer()
    expect(screen.getByText('Public page')).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each(['login', 'register'] as const)(
    'keeps the page mounted after %s wins a pending restore',
    async (method) => {
      const { client, answer } = returningVisitor()
      function Name() {
        const { user } = useAuth<UserProfile>()
        return <input aria-label="Profile name" defaultValue={user?.name} />
      }
      render(
        <MoleculeProvider auth={client} awaitSession>
          <Name />
        </MoleculeProvider>,
      )
      await act(async () => {
        await client[method]({ email: 'new@example.test', password: 'password' })
      })
      const input = screen.getByRole('textbox', { name: 'Profile name' })
      fireEvent.change(input, { target: { value: 'Unsaved draft' } })
      await answer()
      act(() => client.setUser({ ...reader, id: 'new-reader', name: 'Updated' }))
      expect(screen.getByRole('textbox', { name: 'Profile name' })).toBe(input)
      expect((input as HTMLInputElement).value).toBe('Unsaved draft')
      expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
    },
  )

  it('releases a sign-out during the hold and ignores the late restored user', async () => {
    const { client, answer } = returningVisitor()
    render(
      <MoleculeProvider auth={client} awaitSession>
        <p>Public page</p>
      </MoleculeProvider>,
    )
    expect(screen.queryByText('Public page')).toBeNull()
    await act(async () => client.logout())
    expect(screen.getByText('Public page')).toBeTruthy()
    await answer()
    expect(client.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  it('releases a hung restore instead of leaving a blank page forever', async () => {
    vi.useFakeTimers()
    const { client } = returningVisitor()
    render(
      <MoleculeProvider auth={client} awaitSession>
        <p>Public page</p>
      </MoleculeProvider>,
    )
    expect(screen.queryByText('Public page')).toBeNull()
    await act(async () => vi.advanceTimersByTimeAsync(10_000))
    expect(screen.getByText('Public page')).toBeTruthy()
    expect(client.getState().status).toBe('unavailable')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows no page until a returning visitor is restored, so a first click is signed in', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    render(
      <MoleculeProvider auth={client} awaitSession>
        <FollowButton onFollow={onFollow} />
      </MoleculeProvider>,
    )
    expect(screen.queryByRole('button', { name: 'Follow' })).toBeNull()

    await answer()
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }))
    expect(onFollow).toHaveBeenCalledWith('reader')
  })

  it('without it, the same click lands before the restore and is lost', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    render(
      <MoleculeProvider auth={client}>
        <FollowButton onFollow={onFollow} />
      </MoleculeProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }))
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders a visitor with no session to restore without waiting on a request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's main.tsx does before the first render.
    void client.initialize()
    render(
      <MoleculeProvider auth={client} awaitSession>
        <p>Public page</p>
      </MoleculeProvider>,
    )
    await act(async () => client.whenRestored!())
    expect(client.getState().status).toBe('unauthenticated')
    expect(screen.getByText('Public page')).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders when the restore cannot reach the server', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's main.tsx does before the first render.
    void client.initialize()
    render(
      <MoleculeProvider auth={client} awaitSession sessionFallback={<p>Restoring</p>}>
        <p>Public page</p>
      </MoleculeProvider>,
    )
    expect(screen.getByText('Restoring')).toBeTruthy()
    await act(async () => client.whenRestored!())
    expect(client.getState().status).toBe('unavailable')
    expect(screen.getByText('Public page')).toBeTruthy()
  })

  it('renders at once when no auth client is given', () => {
    render(
      <MoleculeProvider awaitSession>
        <p>Public page</p>
      </MoleculeProvider>,
    )
    expect(screen.getByText('Public page')).toBeTruthy()
  })
})

describe('SessionReady', () => {
  it('renders its fallback, then the children with the restored user', async () => {
    const { client, answer } = returningVisitor()
    function Name() {
      const { user } = useAuth<UserProfile>()
      return <p>{user ? `Signed in as ${user.name}` : 'Signed out'}</p>
    }
    render(
      <MoleculeProvider auth={client}>
        <SessionReady fallback={<p>Restoring</p>}>
          <Name />
        </SessionReady>
      </MoleculeProvider>,
    )
    expect(screen.getByText('Restoring')).toBeTruthy()
    expect(screen.queryByText('Signed out')).toBeNull()
    await answer()
    expect(screen.getByText('Signed in as Reader')).toBeTruthy()
  })
})
