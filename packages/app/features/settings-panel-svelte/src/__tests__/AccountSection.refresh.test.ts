// @vitest-environment jsdom

/**
 * The AccountSection configured-session-refresh tests, ported from
 * `@molecule/app-settings-panel-react/src/__tests__/AccountSection.refresh.test.tsx`:
 * the same behavioral assertions, mounted through the Svelte binding's own
 * composition root (`setMoleculeContext`) with the real auth client.
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import { fakeHttpClient } from './http-client.js'
import TestHost from './TestHost.svelte'

const { client: http, ...httpMock } = fakeHttpClient()

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
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []
function render(client = clientFor()): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(TestHost, {
    target: container,
    props: { client, http },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
}
const control = (label: string): HTMLInputElement => {
  const labels = [...document.querySelectorAll('label')]
  const match = labels.find((labelEl) => labelEl.textContent?.trim() === label)
  const id = match?.getAttribute('for')
  if (!id) throw new Error(`no labeled control "${label}"`)
  return document.getElementById(id) as HTMLInputElement
}
const typed = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const blurred = (input: HTMLInputElement): void => {
  input.blur()
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}
const waitFor = (assertion: () => void): Promise<void> =>
  vi.waitFor(() => {
    flushSync()
    assertion()
  })

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
  httpMock.get.mockImplementation(() => read.promise.then((data) => ({ data })))
  const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'GET') return Response.json(await read.promise)
    const patch = JSON.parse(String(options?.body)) as Partial<UserProfile>
    return Response.json({ props: { ...first, ...patch } })
  })
  vi.stubGlobal('fetch', fetch)
  return { read, fetch }
}

beforeEach(() => {
  httpMock.get.mockReset()
  httpMock.patch.mockReset()
  setI18nProvider(createSimpleI18nProvider())
})
afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  // Give the binding's same-turn handoff lane its disarm turn before the next test mounts.
  await new Promise((resolve) => setTimeout(resolve, 0))
  document.body.innerHTML = ''
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AccountSection configured session refresh', () => {
  it('refreshes pristine fields through the configured auth route without overwriting a dirty field', async () => {
    const body = { props: { ...first, name: 'Server name', email: 'fresh@example.test' } }
    httpMock.get.mockResolvedValue({ data: body })
    const fetch = vi.fn(async () => Response.json(body))
    vi.stubGlobal('fetch', fetch)
    render()
    typed(control('Name'), 'Typed name')
    await waitFor(() => expect(control('Email').value).toBe('fresh@example.test'))
    expect(control('Name').value).toBe('Typed name')
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      '/configured-current',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(httpMock.get).not.toHaveBeenCalled()
  })

  it('keeps a cached profile editable and saves through auth when the refresh is unavailable', async () => {
    httpMock.get.mockRejectedValue(new Error('refresh unavailable'))
    const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'GET') return Response.json({ error: 'Unavailable' }, { status: 503 })
      return Response.json({ props: { ...first, ...JSON.parse(String(options?.body)) } })
    })
    vi.stubGlobal('fetch', fetch)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const client = clientFor()
    const instance = mount(TestHost, {
      target: container,
      props: { client, http },
    }) as Record<string, unknown>
    flushSync()
    mounted.push({ instance, container })
    await waitFor(() => expect(client.getState().status).toBe('unavailable'))
    expect(control('Name').value).toBe('Alice')
    expect(document.querySelector('[role="alert"]')).toBeNull()
    typed(control('Name'), 'Alice edited')
    blurred(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenLastCalledWith(
      '/configured-profile',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Alice edited' }) }),
    )
    expect(httpMock.patch).not.toHaveBeenCalled()
  })

  it('a read started before saving cannot replace the saved user or the next form', async () => {
    const { read } = pendingRead()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const client = clientFor()
    const instance = mount(TestHost, {
      target: container,
      props: { client, http },
    }) as Record<string, unknown>
    flushSync()
    typed(control('Name'), 'Alice edited')
    blurred(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    read.resolve({ props: first })
    await read.promise
    expect(client.getUser()?.name).toBe('Alice edited')
    await unmount(instance)
    container.remove()
    document.body.innerHTML = ''
    const fresh = { ...first, name: 'Alice edited' }
    httpMock.get.mockResolvedValue({ data: { props: fresh } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ props: fresh })),
    )
    // The same session client, as React's test renders the same AuthProvider client again.
    render(client)
    expect(control('Name').value).toBe('Alice edited')
  })

  it('a pending read cannot publish the previous account after a session switch', async () => {
    const { read } = pendingRead()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const client = clientFor()
    const instance = mount(TestHost, {
      target: container,
      props: { client, http },
    }) as Record<string, unknown>
    flushSync()
    mounted.push({ instance, container })
    const other = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }
    client.setSession({ accessToken: 'other-token', user: other })
    flushSync()
    read.resolve({ props: first })
    await read.promise
    expect(client.getUser()).toEqual(other)
    await waitFor(() => expect(control('Name').value).toBe('Bob'))
  })

  it('counterexample: a provider without optional validation still edits its cached account', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const client = clientFor()
    Reflect.deleteProperty(client, 'validateSession')
    httpMock.get.mockReturnValue(new Promise(() => {}))
    const fetch = vi.fn(async () => Response.json({ props: { ...first, name: 'Alice edited' } }))
    vi.stubGlobal('fetch', fetch)
    const instance = mount(TestHost, {
      target: container,
      props: { client, http },
    }) as Record<string, unknown>
    flushSync()
    mounted.push({ instance, container })
    expect(control('Name').value).toBe('Alice')
    expect(fetch).not.toHaveBeenCalled()
    typed(control('Name'), 'Alice edited')
    blurred(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenCalledOnce()
  })
})
