import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { debounce, retry, sleep, throttle } from '../async.js'

describe('sleep', () => {
  it('resolves after the supplied delay (real timers)', async () => {
    const before = Date.now()
    await sleep(20)
    expect(Date.now() - before).toBeGreaterThanOrEqual(18) // small jitter tolerance
  })

  it('resolves immediately for 0', async () => {
    const before = Date.now()
    await sleep(0)
    expect(Date.now() - before).toBeLessThan(15)
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays invocation by the configured delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('resets the timer on each call (only the last one fires)', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced('a')
    vi.advanceTimersByTime(50)
    debounced('b')
    vi.advanceTimersByTime(50)
    debounced('c')
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledExactlyOnceWith('c')
  })

  it('passes arguments through', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 10)
    debounced('x', 1, true)
    vi.advanceTimersByTime(10)
    expect(fn).toHaveBeenCalledWith('x', 1, true)
  })
})

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires the first call immediately', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    expect(fn).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('drops calls within the limit window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    vi.advanceTimersByTime(50)
    throttled('b') // dropped (< 100ms since 'a')
    vi.advanceTimersByTime(49)
    throttled('c') // still dropped (only 99ms total)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('allows the next call once the window has elapsed', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled('a')
    vi.advanceTimersByTime(100)
    throttled('b')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('retry', () => {
  it('returns the resolved value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    expect(await retry(fn)).toBe('ok')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('retries on rejection and returns the eventually-resolved value', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom1'))
      .mockRejectedValueOnce(new Error('boom2'))
      .mockResolvedValue('ok')
    const result = await retry(fn, { initialDelay: 1, maxDelay: 5 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws the last error after exhausting maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    await expect(retry(fn, { maxAttempts: 2, initialDelay: 1 })).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('honours custom maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'))
    await expect(retry(fn, { maxAttempts: 5, initialDelay: 1 })).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(5)
  })

  it('wraps non-Error throws into Error instances', async () => {
    const fn = vi.fn().mockRejectedValue('string-error')
    await expect(retry(fn, { maxAttempts: 1, initialDelay: 1 })).rejects.toThrow('string-error')
  })

  it('caps delay at maxDelay', async () => {
    let elapsed = 0
    const originalSleep = global.setTimeout
    const fakeSleep = ((cb: () => void, ms: number) => {
      elapsed += ms
      return originalSleep(cb, 0) // run immediately for the test
    }) as typeof global.setTimeout
    global.setTimeout = fakeSleep
    try {
      const fn = vi.fn().mockRejectedValue(new Error('x'))
      await retry(fn, {
        maxAttempts: 4,
        initialDelay: 100,
        backoffFactor: 10, // would explode quickly without cap
        maxDelay: 200,
      }).catch(() => undefined)
      // Each delay should be ≤ 200 (the cap). 3 retries → up to 600 total.
      expect(elapsed).toBeLessThanOrEqual(3 * 200)
    } finally {
      global.setTimeout = originalSleep
    }
  })
})
