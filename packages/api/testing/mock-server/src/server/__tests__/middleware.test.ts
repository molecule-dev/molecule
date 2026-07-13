import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ResponseState } from '../../types.js'
import { applyDelay, MAX_MOCK_DELAY_MS } from '../middleware.js'

describe('applyDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resolves immediately when no delay is set', async () => {
    const spy = vi.fn()
    void applyDelay({ state: 'success' }).then(spy)
    await vi.advanceTimersByTimeAsync(0)
    expect(spy).toHaveBeenCalledOnce()
  })

  it('waits the requested delay when under the cap, without warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const spy = vi.fn()
    void applyDelay({ state: 'success', delay: 300 }).then(spy)

    await vi.advanceTimersByTimeAsync(299)
    expect(spy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(spy).toHaveBeenCalledOnce()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('HOSTILE-DEFAULT FIX: clamps a delay above MAX_MOCK_DELAY_MS instead of hanging indefinitely', async () => {
    // Simulates the trap the finding describes: a units mistake (seconds*1000
    // applied twice) requesting an ~8.3 HOUR delay. Pre-fix, this would hang
    // the request until the CLIENT gave up — in an E2E harness that reads as
    // an inexplicable page timeout, not a mock misconfiguration.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const oversized: ResponseState = { state: 'success', delay: 30_000 * 1000 }
    const spy = vi.fn()
    void applyDelay(oversized).then(spy)

    // Not resolved just before the cap.
    await vi.advanceTimersByTimeAsync(MAX_MOCK_DELAY_MS - 1)
    expect(spy).not.toHaveBeenCalled()

    // Resolved AT the cap — proves the oversized value was clamped, not honored.
    await vi.advanceTimersByTimeAsync(1)
    expect(spy).toHaveBeenCalledOnce()
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('FAILURE DISAMBIGUATION: logs a warning the moment an oversized delay is requested, not after waiting', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    void applyDelay({ state: 'success', delay: MAX_MOCK_DELAY_MS + 5_000 })

    // The warning must be synchronous/immediate (before any timer advances) —
    // a human watching server logs needs the signal right away, not 60s later.
    expect(warnSpy).toHaveBeenCalledOnce()
    const [message] = warnSpy.mock.calls[0] as [string]
    expect(message).toContain(String(MAX_MOCK_DELAY_MS + 5_000))
    expect(message).toContain(String(MAX_MOCK_DELAY_MS))
    expect(message).toMatch(/clamp/i)

    await vi.advanceTimersByTimeAsync(MAX_MOCK_DELAY_MS)
  })

  it('a delay exactly at the cap is honored as-is, with no warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const spy = vi.fn()
    void applyDelay({ state: 'success', delay: MAX_MOCK_DELAY_MS }).then(spy)

    await vi.advanceTimersByTimeAsync(MAX_MOCK_DELAY_MS - 1)
    expect(spy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(spy).toHaveBeenCalledOnce()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
