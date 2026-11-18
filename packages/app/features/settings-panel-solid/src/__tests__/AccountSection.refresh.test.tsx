// @vitest-environment jsdom

/**
 * The React package's `AccountSection.refresh.test.tsx`, ported to Solid: the
 * section's background `validateSession` read against a real JWT auth client
 * whose configured route answers on its own schedule.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import type * as AppSolid from '@molecule/app-solid'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AccountSection } from '../AccountSection.jsx'

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof AppSolid>()
  return {
    ...actual,
    useHttpClient: () => http,
  }
})

const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const cleanups: (() => void)[] = []
const disposers: Array<() => void> = []

function clientFor(): AuthClient<UserProfile> {
  const client = createJWTAuthClient<UserProfile>({
    storage: 'memory',
    autoRefresh: false,
    currentUserEndpoint: '/configured-current',
    profileEndpoint: '/configured-profile',
  })
  client.setSession({ accessToken: 'account-token', user: first })
  cleanups.push(() => client.destroy())
  return client
}
const field = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement

/** Let Solid's queued effects and the fetch promises flush before assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/** Render the section under the real auth client, the way the app wires it. */
function mount(client: AuthClient<UserProfile>): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () =>
      (
        <MoleculeProvider config={{ auth: client }}>
          <AccountSection />
        </MoleculeProvider>
      ) as JSX.Element,
    container,
  )
  disposers.push(() => {
    dispose()
    container.remove()
  })
}

/** Types into a native input exactly as a user would (property first, then events). */
function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}
/** Blurs a field exactly as a user would. */
function blur(input: HTMLInputElement): void {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

function deferred() {
  let resolve!: (body: { props: UserProfile }) => void
  const promise = new Promise<{ props: UserProfile }>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function pendingRead() {
  const read = deferred()
  // The old component's unguarded read and the auth client's configured read
  // receive the same delayed snapshot, so only ownership changes the outcome.
  http.get.mockImplementation(() => read.promise.then((data) => ({ data })))
  const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'GET') return Response.json(await read.promise)
    const patch = JSON.parse(String(options?.body)) as Partial<UserProfile>
    return Response.json({ props: { ...first, ...patch } })
  })
  vi.stubGlobal('fetch', fetch)
  return { read, fetch }
}

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
  setClassMap(classMap)
})
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AccountSection configured session refresh', () => {
  it('refreshes pristine fields through the configured auth route without overwriting a dirty field', async () => {
    const body = { props: { ...first, name: 'Server name', email: 'fresh@example.test' } }
    http.get.mockResolvedValue({ data: body })
    const fetch = vi.fn(async () => Response.json(body))
    vi.stubGlobal('fetch', fetch)
    mount(clientFor())
    await settle()
    type(field('settings-name'), 'Typed name')
    await vi.waitFor(() => expect(field('settings-email').value).toBe('fresh@example.test'))
    expect(field('settings-name').value).toBe('Typed name')
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/configured-current',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(http.get).not.toHaveBeenCalled()
  })

  it('keeps a cached profile editable and saves through auth when the refresh is unavailable', async () => {
    http.get.mockRejectedValue(new Error('refresh unavailable'))
    const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'GET') return Response.json({ error: 'Unavailable' }, { status: 503 })
      return Response.json({ props: { ...first, ...JSON.parse(String(options?.body)) } })
    })
    vi.stubGlobal('fetch', fetch)
    const client = clientFor()
    mount(client)
    await vi.waitFor(() => expect(client.getState().status).toBe('unavailable'))
    expect(field('settings-name').value).toBe('Alice')
    expect(document.querySelector('[role="alert"]')).toBeNull()
    type(field('settings-name'), 'Alice edited')
    blur(field('settings-name'))
    await vi.waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenLastCalledWith(
      '/configured-profile',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Alice edited' }) }),
    )
    expect(http.patch).not.toHaveBeenCalled()
  })

  it('a read started before saving cannot replace the saved user or the next form', async () => {
    const { read } = pendingRead()
    const client = clientFor()
    mount(client)
    await settle()
    type(field('settings-name'), 'Alice edited')
    blur(field('settings-name'))
    await vi.waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    read.resolve({ props: first })
    await read.promise
    await settle()
    expect(client.getUser()?.name).toBe('Alice edited')
    disposers.splice(0).forEach((dispose) => dispose())
    const fresh = { ...first, name: 'Alice edited' }
    http.get.mockResolvedValue({ data: { props: fresh } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ props: fresh })),
    )
    mount(client)
    await settle()
    expect(field('settings-name').value).toBe('Alice edited')
  })

  it('a pending read cannot publish the previous account after a session switch', async () => {
    const { read } = pendingRead()
    const client = clientFor()
    mount(client)
    await settle()
    const other = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }
    client.setSession({ accessToken: 'other-token', user: other })
    await settle()
    read.resolve({ props: first })
    await read.promise
    await settle()
    expect(client.getUser()).toEqual(other)
    expect(field('settings-name').value).toBe('Bob')
  })

  it('counterexample: a provider without optional validation still edits its cached account', async () => {
    const client = clientFor()
    Reflect.deleteProperty(client, 'validateSession')
    http.get.mockReturnValue(new Promise(() => {}))
    const fetch = vi.fn(async () => Response.json({ props: { ...first, name: 'Alice edited' } }))
    vi.stubGlobal('fetch', fetch)
    mount(client)
    await settle()
    expect(field('settings-name').value).toBe('Alice')
    expect(fetch).not.toHaveBeenCalled()
    type(field('settings-name'), 'Alice edited')
    blur(field('settings-name'))
    await vi.waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenCalledOnce()
  })
})
