// @vitest-environment jsdom
/**
 * Ports of `query-react/src/__tests__/hooks.test.tsx`: the cache-first read,
 * load/error/null states, re-render stability, key-change aborts and unmount
 * aborts, and the prefetch composable and intent handlers.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { intentPrefetchProps } from '../usePrefetch.js'
import { deferred, mountPrefetch, mountQuery, settle, unmountAll } from './helpers.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})
afterEach(async () => {
  await unmountAll()
})

describe('useQuery', () => {
  it('returns cached data on the first render without a loading state', async () => {
    getQueryClient().set(['doc', 1], 'cached')
    const fetch = vi.fn(async () => 'fresh')
    const h = mountQuery<string>({ key: ['doc', 1], fetch })
    expect(h.value().data).toBe('cached')
    expect(h.value().status).toBe('success')
    await settle()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches a missing document and re-renders with it', async () => {
    const request = deferred<string>()
    const fetch = vi.fn(() => request.promise)
    const h = mountQuery<string>({ key: ['doc', 2], fetch })
    expect(h.value().data).toBeUndefined()
    await settle()
    expect(h.value().status).toBe('loading')
    request.resolve('loaded')
    await settle()
    expect(h.value().data).toBe('loaded')
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("never hands a caller another key's document", async () => {
    getQueryClient().set(['doc', 'a'], 'A')
    const fetch = vi.fn(async () => 'B')
    const h = mountQuery<string>({ key: ['doc', 'a'], fetch })
    expect(h.value().data).toBe('A')
    await h.setOptions({ key: ['doc', 'b'], fetch })
    expect(h.value().data).toBeUndefined()
    await settle()
    await settle()
    expect(h.value().data).toBe('B')
  })

  it('reports an error without throwing', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('down')
    })
    const h = mountQuery<string>({ key: ['doc', 'x'], fetch })
    await settle()
    await settle()
    expect(h.value().status).toBe('error')
    expect((h.value().error as Error).message).toBe('down')
  })

  it('observes nothing for null', async () => {
    const h = mountQuery<string>(null)
    expect(h.value().status).toBe('idle')
    await settle()
    expect(h.value().data).toBeUndefined()
  })

  it('lands a response that arrives after a re-render', async () => {
    const request = deferred<string>()
    const fetch = vi.fn(() => request.promise)
    const h = mountQuery<string>({ key: ['doc', 'late'], fetch })
    await settle()
    expect(h.value().status).toBe('loading')
    // The page re-renders (a parent state change) while the request is still in flight: the
    // composable must not resubscribe or restart it, so the answer still paints.
    await h.rerender()
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(1)
    request.resolve('arrived')
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
    const h = mountQuery<string>({ key: ['doc', 'a'], fetch })
    await settle()
    expect(signals).toHaveLength(1)
    expect(signals[0].aborted).toBe(false)
    await h.setOptions({ key: ['doc', 'b'], fetch })
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
    const h = mountQuery<string>({ key: ['doc', 'unmount'], fetch })
    await settle()
    expect(signals).toHaveLength(1)
    await h.unmount()
    expect(signals[0].aborted).toBe(true)
  })
})

describe('prefetch', () => {
  it('warms the cache from a stable function and from intent handlers', async () => {
    const fetch = vi.fn(async () => 'warm')
    const h = mountPrefetch()
    const first = h.value()
    await h.rerender()
    expect(h.value()).toBe(first)
    first({ key: ['doc', 'p'], fetch })
    await settle()
    expect(getQueryClient().get(['doc', 'p'])).toBe('warm')
    const props = intentPrefetchProps({ key: ['doc', 'q'], fetch: async () => 'q' })
    expect(Object.keys(props).sort()).toEqual(['onFocus', 'onPointerenter', 'onTouchstart'])
    props.onPointerenter()
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
      intentPrefetchProps({ key: ['doc', 's'], fetch }).onFocus()
      await settle()
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
    }
  })
})
