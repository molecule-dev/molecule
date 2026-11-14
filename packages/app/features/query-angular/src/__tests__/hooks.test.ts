// @vitest-environment jsdom
/**
 * `useQuery` and `usePrefetch` through a real zoneless Angular component, over
 * the in-memory query bond — the counterpart of `query-react`'s hooks.test.
 *
 * @module
 */
import '@angular/compiler'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { intentPrefetchProps, usePrefetch } from '../index.js'
import { drain } from './harness.js'
import { destroyQueryMounts, mountQuery, mountTracked } from './query-harness.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})
afterEach(async () => {
  await destroyQueryMounts()
})

describe('useQuery', () => {
  it('returns cached data on the first render without a loading state', async () => {
    getQueryClient().set(['doc', 1], 'cached')
    const fetch = vi.fn(async () => 'fresh')
    const h = await mountQuery(() => ({ key: ['doc', 1], fetch }))
    expect(h.value().data).toBe('cached')
    expect(h.value().status).toBe('success')
    await drain()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches a missing document and re-renders with it', async () => {
    let resolve!: (v: string) => void
    const fetch = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    const h = await mountQuery(() => ({ key: ['doc', 2], fetch }))
    expect(h.value().data).toBeUndefined()
    await drain()
    expect(h.value().status).toBe('loading')
    resolve('loaded')
    await drain()
    expect(h.value().data).toBe('loaded')
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("never hands a caller another key's document", async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    let key = 'a'
    const fetch = vi.fn(async () => 'B')
    const h = await mountQuery(() => ({ key: ['doc', key], fetch }))
    expect(h.value().data).toBe('A')
    key = 'b'
    expect(h.value().data).toBe('A')
    // The change-detection pass that follows the options change: the observer
    // resubscribes to the new key and must not keep the old document.
    h.rerenderOnce()
    expect(h.value().data).toBeUndefined()
    await drain()
    await drain()
    expect(h.value().data).toBe('B')
  })

  it('reports an error without throwing', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('down')
    })
    const h = await mountQuery(() => ({ key: ['doc', 'x'], fetch }))
    await drain()
    await drain()
    expect(h.value().status).toBe('error')
    expect((h.value().error as Error).message).toBe('down')
  })

  it('observes nothing for null', async () => {
    const h = await mountQuery<string>(() => null)
    expect(h.value().status).toBe('idle')
    await drain()
    expect(h.value().data).toBeUndefined()
  })

  it('lands a response that arrives after a re-render', async () => {
    let resolve!: (value: string) => void
    const fetch = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    const h = await mountQuery(() => ({ key: ['doc', 'late'], fetch }))
    await drain()
    expect(h.value().status).toBe('loading')
    // The page refreshes (a parent state change) while the request is still in
    // flight: the hook must not resubscribe or restart it, so the answer still paints.
    await h.rerender()
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(1)
    resolve('arrived')
    await drain()
    expect(h.value().data).toBe('arrived')
    expect(h.value().status).toBe('success')
  })

  it('aborts the previous request when the key changes', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn((theSignal: AbortSignal) => {
      signals.push(theSignal)
      return new Promise<string>((_resolve, reject) => {
        theSignal.addEventListener('abort', () => reject(new Error('Aborted')))
      })
    })
    let key = 'a'
    const h = await mountQuery(() => ({ key: ['doc', key], fetch }))
    await drain()
    expect(signals).toHaveLength(1)
    expect(signals[0].aborted).toBe(false)
    key = 'b'
    await h.rerender()
    await drain()
    expect(signals[0].aborted).toBe(true)
    expect(signals).toHaveLength(2)
  })

  it('aborts the in-flight request on unmount', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn((theSignal: AbortSignal) => {
      signals.push(theSignal)
      return new Promise<string>((_resolve, reject) => {
        theSignal.addEventListener('abort', () => reject(new Error('Aborted')))
      })
    })
    const h = await mountQuery(() => ({ key: ['doc', 'unmount'], fetch }))
    await drain()
    expect(signals).toHaveLength(1)
    await h.destroy()
    expect(signals[0].aborted).toBe(true)
  })
})

describe('prefetch', () => {
  it('warms the cache from a stable function and from intent handlers', async () => {
    const fetch = vi.fn(async () => 'warm')
    const h = await mountTracked(() => usePrefetch())
    const first = h.result()
    await h.settle()
    expect(h.result()).toBe(first)
    first({ key: ['doc', 'p'], fetch })
    await drain()
    expect(getQueryClient().get(['doc', 'p'])).toBe('warm')
    const props = intentPrefetchProps({ key: ['doc', 'q'], fetch: async () => 'q' })
    // The handler names are the DOM events an Angular template binds.
    expect(Object.keys(props).sort()).toEqual(['focus', 'pointerenter', 'touchstart'])
    props.pointerenter()
    await drain()
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
      intentPrefetchProps({ key: ['doc', 's'], fetch }).focus()
      await drain()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
    }
  })
})
