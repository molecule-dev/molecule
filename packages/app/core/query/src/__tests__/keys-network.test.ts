import { afterEach, describe, expect, it, vi } from 'vitest'

import { hashQueryKey, keyStartsWith } from '../keys.js'
import { shouldPrefetch, whenIdle } from '../network.js'

describe('hashQueryKey', () => {
  it('hashes by value, with object entries sorted and undefined as null', () => {
    expect(hashQueryKey(['package', 'api-auth'])).toBe(hashQueryKey(['package', 'api-auth']))
    expect(hashQueryKey([{ a: 1, b: 2 }])).toBe(hashQueryKey([{ b: 2, a: 1 }]))
    expect(hashQueryKey(['x', undefined])).toBe(hashQueryKey(['x', null]))
    expect(hashQueryKey(['a'])).not.toBe(hashQueryKey(['b']))
    expect(hashQueryKey([1])).not.toBe(hashQueryKey(['1']))
  })
})

describe('keyStartsWith', () => {
  it('matches a prefix by value, including the key itself', () => {
    expect(keyStartsWith(['package', 'api-auth'], ['package'])).toBe(true)
    expect(keyStartsWith(['package', 'api-auth'], ['package', 'api-auth'])).toBe(true)
    expect(keyStartsWith(['package', { id: 1, v: 2 }], ['package', { v: 2, id: 1 }])).toBe(true)
    expect(keyStartsWith(['package'], ['package', 'api-auth'])).toBe(false)
    expect(keyStartsWith(['template', 'crm'], ['package'])).toBe(false)
    expect(keyStartsWith(['package', 'api-auth'], [])).toBe(true)
  })
})

describe('shouldPrefetch', () => {
  const nav = globalThis.navigator
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
  })

  const withConnection = (connection: unknown) =>
    Object.defineProperty(globalThis, 'navigator', { value: { connection }, configurable: true })

  it('is true with no connection info, false on data-saver or 2G', () => {
    withConnection(undefined)
    expect(shouldPrefetch()).toBe(true)
    withConnection({ saveData: true })
    expect(shouldPrefetch()).toBe(false)
    withConnection({ effectiveType: 'slow-2g' })
    expect(shouldPrefetch()).toBe(false)
    withConnection({ effectiveType: '2g' })
    expect(shouldPrefetch()).toBe(false)
    withConnection({ effectiveType: '4g' })
    expect(shouldPrefetch()).toBe(true)
  })

  it('is false without a navigator', () => {
    Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true })
    expect(shouldPrefetch()).toBe(false)
  })
})

describe('whenIdle', () => {
  it('uses requestIdleCallback when present and can cancel', () => {
    const ric = vi.fn(() => 7)
    const cic = vi.fn()
    Object.defineProperty(globalThis, 'window', {
      value: { requestIdleCallback: ric, cancelIdleCallback: cic },
      configurable: true,
    })
    const fn = vi.fn()
    const cancel = whenIdle(fn, 500)
    expect(ric).toHaveBeenCalledWith(fn, { timeout: 500 })
    cancel()
    expect(cic).toHaveBeenCalledWith(7)
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true })
  })

  it('falls back to a timeout, and is a no-op without a window', () => {
    vi.useFakeTimers()
    try {
      const fn = vi.fn()
      Object.defineProperty(globalThis, 'window', {
        value: { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout },
        configurable: true,
      })
      whenIdle(fn)
      vi.advanceTimersByTime(400)
      expect(fn).toHaveBeenCalledTimes(1)
      Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true })
      expect(typeof whenIdle(fn)).toBe('function')
    } finally {
      vi.useRealTimers()
    }
  })
})
