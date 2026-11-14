// @vitest-environment jsdom
/**
 * Unit tests for `useQuery` and the prefetch helpers, ported from
 * `@molecule/app-query-react`'s own suite: the same behavioral assertions,
 * mounted as real Svelte components over the same query bonds.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { intentPrefetchProps, usePrefetch } from '../usePrefetch.js'
import { deferred, renderBare, renderHook, settle } from './helpers/harness.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})

/** The mounted hooks, unmounted after every test the way React's roots are. */
const mounted: { unmount: () => Promise<void> }[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
})

/** Mounts the hook and tracks it for the afterEach cleanup. */
function hook<T>(initial: QueryOptions<T> | null) {
  const mountedQuery = renderHook<T>(initial)
  mounted.push(mountedQuery)
  return mountedQuery
}

describe('useQuery', () => {
  it('returns cached data on the first render without a loading state', async () => {
    getQueryClient().set(['doc', 1], 'cached')
    const fetch = vi.fn(async () => 'fresh')
    const h = hook({ key: ['doc', 1], fetch })
    expect(h.value().data).toBe('cached')
    expect(h.value().status).toBe('success')
    await settle()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches a missing document and re-renders with it', async () => {
    const gate = deferred<string>()
    const fetch = vi.fn(() => gate.promise)
    const h = hook({ key: ['doc', 2], fetch })
    expect(h.value().data).toBeUndefined()
    await settle()
    expect(h.value().status).toBe('loading')
    gate.resolve('loaded')
    await settle()
    expect(h.value().data).toBe('loaded')
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("never hands a caller another key's document", async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    const fetch = vi.fn(async () => 'B')
    const h = hook({ key: ['doc', 'a'], fetch })
    expect(h.value().data).toBe('A')
    h.setOptions({ key: ['doc', 'b'], fetch })
    expect(h.value().data).toBeUndefined()
    await settle()
    expect(h.value().data).toBe('B')
  })

  it('reports an error without throwing', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('down')
    })
    const h = hook({ key: ['doc', 'x'], fetch })
    await settle()
    await settle()
    expect(h.value().status).toBe('error')
    expect((h.value().error as Error).message).toBe('down')
  })

  it('observes nothing for null', async () => {
    const h = hook<string>(null)
    expect(h.value().status).toBe('idle')
    await settle()
    expect(h.value().data).toBeUndefined()
  })

  it('lands a response that arrives after a re-render', async () => {
    const gate = deferred<string>()
    const fetch = vi.fn(() => gate.promise)
    const h = hook({ key: ['doc', 'late'], fetch })
    await settle()
    expect(h.value().status).toBe('loading')
    // The page updates with a fresh options object for the same key (a parent
    // re-render): the hook must not resubscribe or restart it, so the answer
    // still paints.
    h.setOptions({ key: ['doc', 'late'], fetch })
    h.setOptions({ key: ['doc', 'late'], fetch })
    expect(fetch).toHaveBeenCalledTimes(1)
    gate.resolve('arrived')
    await settle()
    expect(h.value().data).toBe('arrived')
    expect(h.value().status).toBe('success')
  })

  it('aborts the previous request when the key changes', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const h = hook({ key: ['doc', 'a'], fetch })
    await settle()
    expect(signals).toHaveLength(1)
    expect(signals[0].aborted).toBe(false)
    h.setOptions({ key: ['doc', 'b'], fetch })
    await settle()
    expect(signals[0].aborted).toBe(true)
    expect(signals).toHaveLength(2)
  })

  it('aborts the in-flight request on unmount', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const h = hook({ key: ['doc', 'unmount'], fetch })
    await settle()
    expect(signals).toHaveLength(1)
    await h.unmount()
    expect(signals[0].aborted).toBe(true)
  })
})

describe('prefetch', () => {
  it('warms the cache from a stable function and from intent handlers', async () => {
    const fetch = vi.fn(async () => 'warm')
    const prefetcher = renderBare(() => usePrefetch())
    mounted.push(prefetcher)
    // The function is a plain value; repeated reads return the same identity,
    // and a second mounted hook gets its own equal-behaving one.
    expect(prefetcher.value()).toBe(prefetcher.value())
    prefetcher.value()({ key: ['doc', 'p'], fetch })
    await settle()
    expect(getQueryClient().get(['doc', 'p'])).toBe('warm')
    const props = intentPrefetchProps({ key: ['doc', 'q'], fetch: async () => 'q' })
    expect(Object.keys(props).sort()).toEqual(['onfocus', 'onpointerenter', 'ontouchstart'])
    props.onpointerenter()
    await settle()
    expect(getQueryClient().get(['doc', 'q'])).toBe('q')
  })

  it('does nothing under data-saver', async () => {
    const nav = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { connection: { saveData: true } },
      configurable: true,
    })
    try {
      const fetch = vi.fn(async () => 'x')
      intentPrefetchProps({ key: ['doc', 's'], fetch }).onfocus()
      await settle()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
    }
  })
})
