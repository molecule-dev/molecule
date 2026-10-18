import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { intentPrefetchProps, usePrefetch } from '../usePrefetch.js'
import { useQuery } from '../useQuery.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
})

/** Renders a hook and returns a getter for its latest value plus a rerender. */
function renderHook<R>(use: () => R): { value: () => R; rerender: () => void } {
  let latest: R
  let force = () => {}
  function Probe() {
    const [, tick] = useState(0)
    force = () => tick((n) => n + 1)
    latest = use()
    return null
  }
  const container = document.createElement('div')
  root = createRoot(container)
  act(() => root!.render(createElement(Probe)))
  return { value: () => latest, rerender: () => act(() => force()) }
}

const flush = () => act(async () => {})

describe('useQuery', () => {
  it('returns cached data on the first render without a loading state', async () => {
    getQueryClient().set(['doc', 1], 'cached')
    const fetch = vi.fn(async () => 'fresh')
    const h = renderHook(() => useQuery({ key: ['doc', 1], fetch }))
    expect(h.value().data).toBe('cached')
    expect(h.value().status).toBe('success')
    await flush()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches a missing document and re-renders with it', async () => {
    let resolve!: (v: string) => void
    const fetch = vi.fn(() => new Promise<string>((r) => (resolve = r)))
    const h = renderHook(() => useQuery({ key: ['doc', 2], fetch }))
    expect(h.value().data).toBeUndefined()
    await flush()
    expect(h.value().status).toBe('loading')
    await act(async () => {
      resolve('loaded')
      await Promise.resolve()
    })
    expect(h.value().data).toBe('loaded')
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("never hands a caller another key's document", async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    let key = 'a'
    const fetch = vi.fn(async () => 'B')
    const h = renderHook(() => useQuery({ key: ['doc', key], fetch }))
    expect(h.value().data).toBe('A')
    key = 'b'
    h.rerender()
    expect(h.value().data).toBeUndefined()
    await flush()
    await flush()
    expect(h.value().data).toBe('B')
  })

  it('reports an error without throwing', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('down')
    })
    const h = renderHook(() => useQuery({ key: ['doc', 'x'], fetch }))
    await flush()
    await flush()
    expect(h.value().status).toBe('error')
    expect((h.value().error as Error).message).toBe('down')
  })

  it('observes nothing for null', async () => {
    const h = renderHook(() => useQuery<string>(null))
    expect(h.value().status).toBe('idle')
    await flush()
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
    const h = renderHook(() => useQuery({ key: ['doc', 'late'], fetch }))
    await flush()
    expect(h.value().status).toBe('loading')
    // The page re-renders (a parent state change) while the request is still in flight: the
    // hook must not resubscribe or restart it, so the answer still paints.
    h.rerender()
    h.rerender()
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve('arrived')
      await Promise.resolve()
    })
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
    let key = 'a'
    const h = renderHook(() => useQuery({ key: ['doc', key], fetch }))
    await flush()
    expect(signals).toHaveLength(1)
    expect(signals[0].aborted).toBe(false)
    key = 'b'
    h.rerender()
    await flush()
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
    renderHook(() => useQuery({ key: ['doc', 'unmount'], fetch }))
    await flush()
    expect(signals).toHaveLength(1)
    act(() => root!.unmount())
    root = null
    expect(signals[0].aborted).toBe(true)
  })
})

describe('prefetch', () => {
  it('warms the cache from a stable function and from intent handlers', async () => {
    const fetch = vi.fn(async () => 'warm')
    const h = renderHook(() => usePrefetch())
    const first = h.value()
    h.rerender()
    expect(h.value()).toBe(first)
    first({ key: ['doc', 'p'], fetch })
    await flush()
    expect(getQueryClient().get(['doc', 'p'])).toBe('warm')
    const props = intentPrefetchProps({ key: ['doc', 'q'], fetch: async () => 'q' })
    expect(Object.keys(props).sort()).toEqual(['onFocus', 'onPointerEnter', 'onTouchStart'])
    props.onPointerEnter()
    await flush()
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
      intentPrefetchProps({ key: ['doc', 's'], fetch }).onFocus()
      await flush()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
    }
  })
})
