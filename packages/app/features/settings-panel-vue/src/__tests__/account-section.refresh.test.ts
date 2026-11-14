// @vitest-environment jsdom
/**
 * Configured-session-refresh tests for the Vue `AccountSection` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/AccountSection.refresh.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom against a real
 * `createJWTAuthClient` with a configured `currentUserEndpoint`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { type AuthClient, createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'
import { createAuthPlugin, createHttpPlugin } from '@molecule/app-vue'

import { AccountSection } from '../AccountSection.js'

const http = { get: vi.fn(), patch: vi.fn() }

const first = { id: 'account-a', name: 'Alice', email: 'alice@example.test' }
const cleanups: (() => void)[] = []
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
const control = (label: string): HTMLInputElement => {
  const byAria = document.querySelector(`[aria-label="${label}"]`)
  if (byAria) return byAria as HTMLInputElement
  const labelEl = Array.from(document.querySelectorAll('label')).find(
    (l) => l.textContent?.trim() === label,
  )
  const id = labelEl?.getAttribute('for') ?? ''
  return document.getElementById(id) as HTMLInputElement
}
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function pendingRead(): { read: ReturnType<typeof deferred<{ props: UserProfile }>> } {
  const read = deferred<{ props: UserProfile }>()
  // The auth client's configured read receives the delayed snapshot, so only
  // ownership changes the outcome.
  http.get.mockImplementation(() => read.promise.then((data) => ({ data })))
  const fetch = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
    if (options?.method === 'GET') return Response.json(await read.promise)
    const patch = JSON.parse(String(options?.body)) as Partial<UserProfile>
    return Response.json({ props: { ...first, ...patch } })
  })
  vi.stubGlobal('fetch', fetch)
  return { read }
}
const mounted: { app?: ReturnType<typeof createApp> } = {}
/** Mounts `AccountSection` under the auth plugin and flushes the first render. */
async function renderAccountSection(client: AuthClient<UserProfile>): Promise<void> {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AccountSection) }))
  app.use(createAuthPlugin(client))
  app.use(createHttpPlugin(http as unknown as HttpClient))
  mounted.app = app
  app.mount(host)
  await flush()
}
/** Drains Vue's watcher queue and a macrotask turn, like the conformance flush. */
async function flush(): Promise<void> {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}
const waitFor = async (fn: () => void): Promise<void> => {
  await vi.waitFor(fn, { timeout: 2000, interval: 10 })
}
/** Types like a user: the value, then a bubbling `input` event. */
const typeLikeUser = (el: HTMLInputElement, value: string): void => {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
/** Blurs like a user: focus leaves, then a bubbling `focusout` event. */
const blurLikeUser = (el: HTMLInputElement): void => {
  el.blur()
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

beforeEach(() => {
  http.get.mockReset()
  http.patch.mockReset()
})
afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  cleanups.splice(0).forEach((cleanup) => cleanup())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setI18nProvider(createSimpleI18nProvider())
})

describe('AccountSection configured session refresh', () => {
  it('refreshes pristine fields through the configured auth route without overwriting a dirty field', async () => {
    const body = { props: { ...first, name: 'Server name', email: 'fresh@example.test' } }
    http.get.mockResolvedValue({ data: body })
    const fetch = vi.fn(async () => Response.json(body))
    vi.stubGlobal('fetch', fetch)
    await renderAccountSection(clientFor())
    typeLikeUser(control('Name'), 'Typed name')
    await waitFor(() => expect(control('Email').value).toBe('fresh@example.test'))
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
    await renderAccountSection(client)
    await waitFor(() => expect(client.getState().status).toBe('unavailable'))
    expect(control('Name').value).toBe('Alice')
    expect(document.querySelector('[role="alert"]')).toBeNull()
    typeLikeUser(control('Name'), 'Alice edited')
    blurLikeUser(control('Name'))
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
    await renderAccountSection(client)
    typeLikeUser(control('Name'), 'Alice edited')
    blurLikeUser(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    read.resolve({ props: first })
    await read.promise
    await flush()
    expect(client.getUser()?.name).toBe('Alice edited')
    mounted.app?.unmount()
    mounted.app = undefined
    document.body.innerHTML = ''
    const fresh = { ...first, name: 'Alice edited' }
    http.get.mockResolvedValue({ data: { props: fresh } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ props: fresh })),
    )
    await renderAccountSection(client)
    expect(control('Name').value).toBe('Alice edited')
  })

  it('a pending read cannot publish the previous account after a session switch', async () => {
    const { read } = pendingRead()
    const client = clientFor()
    await renderAccountSection(client)
    const other = { id: 'account-b', name: 'Bob', email: 'bob@example.test' }
    client.setSession({ accessToken: 'other-token', user: other })
    await flush()
    read.resolve({ props: first })
    await read.promise
    await flush()
    expect(client.getUser()).toEqual(other)
    expect(control('Name').value).toBe('Bob')
  })

  it('counterexample: a provider without optional validation still edits its cached account', async () => {
    const client = clientFor()
    Reflect.deleteProperty(client, 'validateSession')
    http.get.mockReturnValue(new Promise(() => {}))
    const fetch = vi.fn(async () => Response.json({ props: { ...first, name: 'Alice edited' } }))
    vi.stubGlobal('fetch', fetch)
    await renderAccountSection(client)
    expect(control('Name').value).toBe('Alice')
    expect(fetch).not.toHaveBeenCalled()
    typeLikeUser(control('Name'), 'Alice edited')
    blurLikeUser(control('Name'))
    await waitFor(() => expect(client.getUser()?.name).toBe('Alice edited'))
    expect(fetch).toHaveBeenCalledOnce()
  })
})
