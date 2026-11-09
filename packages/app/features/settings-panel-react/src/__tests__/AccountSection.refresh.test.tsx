// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import type * as AppReact from '@molecule/app-react'
import { AuthProvider } from '@molecule/app-react'

import { AccountSection } from '../AccountSection.js'

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@molecule/app-react', async (importOriginal) => {
  const actual = await importOriginal<typeof AppReact>()
  return {
    ...actual,
    useHttpClient: () => http,
    useTranslation: () => ({
      t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  }
})
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    sp: () => '',
    cn: (...parts: string[]) => parts.join(' '),
    stack: () => '',
    sectionHeading: '',
    formLabelSmall: '',
    textSize: () => '',
    textError: '',
  }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Flex: (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Spinner: () => <output aria-label="Saving" />,
}))

const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const cleanups: (() => void)[] = []
function clientFor() {
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
const control = (label: string): HTMLInputElement =>
  screen.getByLabelText(label) as HTMLInputElement
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
})
afterEach(() => {
  cleanup()
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
    render(
      <AuthProvider client={clientFor()}>
        <AccountSection />
      </AuthProvider>,
    )
    fireEvent.change(control('Name'), { target: { value: 'Typed name' } })
    await waitFor(() => expect(control('settings.email').value).toBe('fresh@example.test'))
    expect(control('Name').value).toBe('Typed name')
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
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    await waitFor(() => expect(client.getState().status).toBe('unavailable'))
    expect(control('Name').value).toBe('Alice')
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(control('Name'), { target: { value: 'Alice edited' } })
    fireEvent.blur(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenLastCalledWith(
      '/configured-profile',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Alice edited' }) }),
    )
    expect(http.patch).not.toHaveBeenCalled()
  })

  it('a read started before saving cannot replace the saved user or the next form', async () => {
    const { read } = pendingRead()
    const client = clientFor()
    const view = render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    fireEvent.change(control('Name'), { target: { value: 'Alice edited' } })
    fireEvent.blur(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    await act(async () => {
      read.resolve({ props: first })
      await read.promise
    })
    expect(client.getUser()?.name).toBe('Alice edited')
    view.unmount()
    const fresh = { ...first, name: 'Alice edited' }
    http.get.mockResolvedValue({ data: { props: fresh } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ props: fresh })),
    )
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    expect(control('Name').value).toBe('Alice edited')
  })

  it('a pending read cannot publish the previous account after a session switch', async () => {
    const { read } = pendingRead()
    const client = clientFor()
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    const other = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }
    act(() => client.setSession({ accessToken: 'other-token', user: other }))
    await act(async () => {
      read.resolve({ props: first })
      await read.promise
    })
    expect(client.getUser()).toEqual(other)
    expect(control('Name').value).toBe('Bob')
  })

  it('counterexample: a provider without optional validation still edits its cached account', async () => {
    const client = clientFor()
    Reflect.deleteProperty(client, 'validateSession')
    http.get.mockReturnValue(new Promise(() => {}))
    const fetch = vi.fn(async () => Response.json({ props: { ...first, name: 'Alice edited' } }))
    vi.stubGlobal('fetch', fetch)
    render(
      <AuthProvider client={client}>
        <AccountSection />
      </AuthProvider>,
    )
    expect(control('Name').value).toBe('Alice')
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.change(control('Name'), { target: { value: 'Alice edited' } })
    fireEvent.blur(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenCalledOnce()
  })
})
