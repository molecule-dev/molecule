// @vitest-environment jsdom
/**
 * What a mounted page does when its document is invalidated or a mutation
 * lands, driven through the real hook and both query bonds. Ported from
 * `@molecule/app-query-react`'s own suite.
 *
 * `invalidate()` marks documents stale; it does not start a request for a page
 * that is already mounted. A failed load therefore stays failed (and a mutation
 * leaves the page showing what it showed) until the app retries explicitly with
 * `fetch()`, or the page subscribes again by re-mounting. `set()` is what shows
 * a mutation's own server answer at once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions, QueryProvider } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryProvider } from '@molecule/app-query-memory'
import { provider as tanstackProvider } from '@molecule/app-query-tanstack'

import { type MountedQuery, renderHook, settle } from './helpers/harness.js'

/** The mounted hooks, unmounted after every test the way React's roots are. */
const mounted: MountedQuery<unknown>[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
})

/** Mounts the hook under the given options and tracks it for cleanup. */
function mountHook<T>(options: QueryOptions<T> | null): MountedQuery<T> {
  const mountedQuery = renderHook<T>(options)
  mounted.push(mountedQuery as MountedQuery<unknown>)
  return mountedQuery
}

describe.each([
  ['memory', memoryProvider],
  ['tanstack', tanstackProvider],
] as const)('mutation and error refresh over the %s bond', (_name, bond: QueryProvider) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(bond)
  })

  it('invalidates a mounted error without refetching it, and an explicit fetch retries into it', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('recovered')
    const options = { key: ['article', 'hello'], fetch }
    const page = mountHook<string>(options)
    await settle()
    expect(page.value().status).toBe('error')
    expect(page.value().error).toBeInstanceOf(Error)
    expect(fetch).toHaveBeenCalledTimes(1)

    getQueryClient().invalidate(['article'])
    await settle()
    // Stale only: nothing starts a request for the page that is already mounted.
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(page.value().status).toBe('error')

    await getQueryClient().fetch(options)
    await settle()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(page.value().status).toBe('success')
    expect(page.value().data).toBe('recovered')
  })

  it('refetches a document invalidated while mounted on the next mount', async () => {
    const fetch = vi.fn().mockResolvedValue('one')
    const options = { key: ['profile', 'u1'], fetch }
    const first = mountHook<string>(options)
    await settle()
    expect(first.value().data).toBe('one')

    getQueryClient().invalidate(['profile'])
    await settle()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(first.value().data).toBe('one')
    await first.unmount()

    fetch.mockResolvedValue('two')
    const second = mountHook<string>(options)
    await settle()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(second.value().data).toBe('two')
  })

  it('shows the mutation result now with set(), and invalidate() refreshes future reads', async () => {
    const client = getQueryClient()
    // The key carries the real dependencies of the document: principal, filter, page.
    const key = ['feed', 'u1', 'following', 1]
    const fetch = vi.fn().mockResolvedValue('from-server')
    client.set(key, 'cached-page')
    const page = mountHook<string>({ key, fetch })
    expect(page.value().data).toBe('cached-page')
    expect(fetch).not.toHaveBeenCalled()

    // The mutation response is the exact document: paint it without a round trip.
    client.set(key, 'after-mutation')
    await settle()
    expect(page.value().data).toBe('after-mutation')

    // Future reads of this principal's feeds are stale; the mounted page is not refetched.
    client.invalidate(['feed', 'u1'])
    await settle()
    expect(fetch).not.toHaveBeenCalled()
    expect(page.value().data).toBe('after-mutation')

    await page.unmount()
    const remount = mountHook<string>({ key, fetch })
    await settle()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(remount.value().data).toBe('from-server')
  })

  it('keeps another principal’s documents out of a scoped invalidation', async () => {
    const client = getQueryClient()
    const mine = ['feed', 'u1', 'following', 1]
    const theirs = ['feed', 'u2', 'following', 1]
    const fetchMine = vi.fn().mockResolvedValue('fresh-mine')
    const fetchTheirs = vi.fn().mockResolvedValue('fresh-theirs')
    client.set(mine, 'mine')
    client.set(theirs, 'theirs')
    const page = mountHook<string>({ key: mine, fetch: fetchMine })
    const other = mountHook<string>({ key: theirs, fetch: fetchTheirs })
    expect(page.value().data).toBe('mine')
    expect(other.value().data).toBe('theirs')

    client.invalidate(['feed', 'u1'])
    await settle()
    expect(fetchMine).not.toHaveBeenCalled()
    expect(fetchTheirs).not.toHaveBeenCalled()

    await page.unmount()
    const remount = mountHook<string>({ key: mine, fetch: fetchMine })
    await settle()
    expect(fetchMine).toHaveBeenCalledTimes(1)
    expect(remount.value().data).toBe('fresh-mine')
    expect(fetchTheirs).not.toHaveBeenCalled()
    expect(other.value().data).toBe('theirs')
  })
})
