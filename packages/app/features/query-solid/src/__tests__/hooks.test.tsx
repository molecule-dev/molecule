// @vitest-environment jsdom
/**
 * The `useQuery` and prefetch lifecycle contract of `useQuery`, driven through
 * the real Solid primitives and the memory query bond — the counterparts of
 * the React package's own hook tests.
 */
import { createSignal } from 'solid-js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { intentPrefetchProps, usePrefetch } from '../use-prefetch.js'
import { useQuery } from '../use-query.js'
import { deferred, renderHook, settle } from './helpers.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})

describe('useQuery', () => {
  it('returns cached data on the first render without a loading state', async () => {
    getQueryClient().set(['doc', 1], 'cached')
    const fetch = vi.fn(async () => 'fresh')
    const h = renderHook(() => useQuery({ key: ['doc', 1], fetch }))
    expect(h.value().data).toBe('cached')
    expect(h.value().status).toBe('success')
    await h.rerender()
    expect(fetch).not.toHaveBeenCalled()
    await h.unmount()
  })

  it('fetches a missing document and re-renders with it', async () => {
    let resolve!: (v: string) => void
    const fetch = vi.fn(() => new Promise<string>((r) => (resolve = r)))
    const h = renderHook(() => useQuery({ key: ['doc', 2], fetch }))
    expect(h.value().data).toBeUndefined()
    await h.rerender()
    expect(h.value().status).toBe('loading')
    resolve('loaded')
    await h.rerender()
    expect(h.value().data).toBe('loaded')
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
    await h.unmount()
  })

  it("never hands a caller another key's document", async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    const [key, setKey] = createSignal('a')
    const answer = deferred<string>()
    const fetch = vi.fn(() => answer.promise)
    const h = renderHook(() =>
      useQuery((): QueryOptions<string> => ({ key: ['doc', key()], fetch })),
    )
    expect(h.value().data).toBe('A')
    setKey('b')
    await h.rerender()
    expect(h.value().data).toBeUndefined()
    answer.resolve('B')
    await h.rerender()
    expect(h.value().data).toBe('B')
    await h.unmount()
  })

  it('reports an error without throwing', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('down')
    })
    const h = renderHook(() => useQuery({ key: ['doc', 'x'], fetch }))
    await h.rerender()
    await h.rerender()
    expect(h.value().status).toBe('error')
    expect((h.value().error as Error).message).toBe('down')
    await h.unmount()
  })

  it('observes nothing for null', async () => {
    const h = renderHook(() => useQuery<string>(null))
    expect(h.value().status).toBe('idle')
    await h.rerender()
    expect(h.value().data).toBeUndefined()
    await h.unmount()
  })

  it('lands a response that arrives after a re-render', async () => {
    let resolve!: (value: string) => void
    const fetch = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    const h = renderHook(() => useQuery({ key: ['doc', 'late'], fetch }))
    await h.rerender()
    expect(h.value().status).toBe('loading')
    // The page re-renders (a parent state change) while the request is still in flight: the
    // hook must not resubscribe or restart it, so the answer still paints.
    await h.rerender()
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(1)
    resolve('arrived')
    await h.rerender()
    expect(h.value().data).toBe('arrived')
    expect(h.value().status).toBe('success')
    await h.unmount()
  })

  it('aborts the previous request when the key changes', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const [key, setKey] = createSignal('a')
    const h = renderHook(() =>
      useQuery((): QueryOptions<string> => ({ key: ['doc', key()], fetch })),
    )
    await h.rerender()
    expect(signals).toHaveLength(1)
    expect(signals[0].aborted).toBe(false)
    setKey('b')
    await h.rerender()
    expect(signals[0].aborted).toBe(true)
    expect(signals).toHaveLength(2)
    await h.unmount()
  })

  it('aborts the in-flight request on unmount', async () => {
    const signals: AbortSignal[] = []
    const fetch = vi.fn((signal: AbortSignal) => {
      signals.push(signal)
      return new Promise<string>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    const h = renderHook(() => useQuery({ key: ['doc', 'unmount'], fetch }))
    await h.rerender()
    expect(signals).toHaveLength(1)
    await h.unmount()
    expect(signals[0].aborted).toBe(true)
  })
})

describe('prefetch', () => {
  it('warms the cache from a stable function and from intent handlers', async () => {
    const fetch = vi.fn(async () => 'warm')
    const h = renderHook(() => usePrefetch())
    const first = h.value()
    await h.rerender()
    expect(h.value()).toBe(first)
    first({ key: ['doc', 'p'], fetch })
    await h.rerender()
    expect(getQueryClient().get(['doc', 'p'])).toBe('warm')
    const props = intentPrefetchProps({ key: ['doc', 'q'], fetch: async () => 'q' })
    expect(Object.keys(props).sort()).toEqual(['onFocus', 'onPointerEnter', 'onTouchStart'])
    props.onPointerEnter()
    await h.rerender()
    expect(getQueryClient().get(['doc', 'q'])).toBe('q')
    await h.unmount()
  })

  it('does nothing under data-saver', async () => {
    const nav = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { connection: { saveData: true } },
      configurable: true,
    })
    try {
      const fetch = vi.fn(async () => 'x')
      intentPrefetchProps({ key: ['doc', 's'], fetch }).onFocus()
      await settle()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
    }
  })
})
