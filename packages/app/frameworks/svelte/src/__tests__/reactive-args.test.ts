// @vitest-environment jsdom
/**
 * Lasting coverage for the reactive hook arguments, below the conformance
 * suite: the maybe-readable helper (a molecule store is a VALUE, never a
 * source), a hook following its argument source on the SAME mount, and the
 * fresh start of a component mounted after a settled one (the cross-mount
 * hand-offs are gone).
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, readable, writable } from 'svelte/store'
import { describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { FullRequestConfig, HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'

import { setMoleculeContext } from '../context.js'
import { isReadable, toReadable } from '../hooks/maybe-readable.js'
import { useHttp } from '../hooks/useHttp.js'

/** A molecule store: `getState` AND `subscribe`, so a VALUE for `useStore`. */
const moleculeStore = {
  getState: (): { count: number } => ({ count: 0 }),
  subscribe:
    (_listener: () => void): (() => void) =>
    () => {},
}

describe('isReadable', () => {
  it('accepts a Svelte store', () => {
    expect(isReadable(writable(1))).toBe(true)
    expect(isReadable(readable('a'))).toBe(true)
  })

  it('rejects a molecule store, plain values and nothing', () => {
    expect(isReadable(moleculeStore)).toBe(false)
    expect(isReadable('url')).toBe(false)
    expect(isReadable({ subscribe: 'not a function' })).toBe(false)
    expect(isReadable(null)).toBe(false)
    expect(isReadable(undefined)).toBe(false)
  })
})

describe('toReadable', () => {
  it('passes a store through and holds a plain value still', () => {
    const source = writable('a')
    expect(toReadable(source)).toBe(source)
    expect(get(toReadable('a'))).toBe('a')

    const seen: string[] = []
    const stop = toReadable(source).subscribe((value) => seen.push(value))
    source.set('b')
    stop()
    expect(seen).toEqual(['a', 'b'])
  })
})

/**
 * A scripted HTTP client: records every requested url and answers each with
 * `{ url }`.
 *
 * @returns The client and its recorded urls.
 */
const scriptedClient = (): { client: HttpClient; calls: string[] } => {
  const calls: string[] = []
  const respond = async <T>(config: FullRequestConfig): Promise<HttpResponse<T>> => {
    calls.push(config.url)
    return {
      data: { url: config.url } as T,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  const client: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    request: async <T>(config: FullRequestConfig) => respond<T>(config),
    get: async <T>(url: string, config?: RequestConfig) =>
      respond<T>({ ...config, method: 'GET', url }),
    post: async <T>(url: string, data?: unknown, config?: RequestConfig) =>
      respond<T>({ ...config, method: 'POST', url, data }),
    put: async <T>(url: string, data?: unknown, config?: RequestConfig) =>
      respond<T>({ ...config, method: 'PUT', url, data }),
    patch: async <T>(url: string, data?: unknown, config?: RequestConfig) =>
      respond<T>({ ...config, method: 'PATCH', url, data }),
    delete: async <T>(url: string, config?: RequestConfig) =>
      respond<T>({ ...config, method: 'DELETE', url }),
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
  return { client, calls }
}

/**
 * Mounts a host that calls `run` once during a child's init, under the given
 * HTTP client, and resolves what `run` returned.
 *
 * @param client - The HTTP client the context provides.
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
const mountHook = <T>(
  client: HttpClient,
  run: () => T,
): Promise<{ result: T; unmountHost: () => Promise<void> }> => {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: { http: client },
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  return Promise.resolve({
    result,
    unmountHost: async () => {
      await unmount(app)
      container.remove()
    },
  })
}

/** Lets pending promise continuations (the scripted answers) land. */
const settlePromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('reactive arguments on the same mount', () => {
  it('useHttp reads the url source when execute runs', async () => {
    const { client, calls } = scriptedClient()
    const url = writable('/first')
    const { result, unmountHost } = await mountHook(client, () => useHttp('GET', url))
    await result.execute()
    url.set('/second')
    await result.execute()
    expect(calls).toEqual(['/first', '/second'])
    await unmountHost()
  })
})

describe('a component mounted after a settled one starts fresh', () => {
  it('an immediate fetch on the new mount runs, with fresh state', async () => {
    const { client, calls } = scriptedClient()
    const first = await mountHook(client, () => useHttp('GET', '/a', { immediate: true }))
    await settlePromises()
    expect(get(first.result.data)).toEqual({ url: '/a' })
    await first.unmountHost()

    // No hand-off survives the teardown, not even in the same turn: the next
    // component's mount-time fetch runs and its state starts fresh (the old
    // lane used to adopt here and suppress the fetch, keeping '/a' as the
    // data).
    const second = await mountHook(client, () => useHttp('GET', '/b', { immediate: true }))
    await settlePromises()
    expect(calls).toEqual(['/a', '/b'])
    expect(get(second.result.data)).toEqual({ url: '/b' })
    await second.unmountHost()
  })
})
