/**
 * REAL-DEPENDENCY integration tests — no mocks, the helpers exercised the way a
 * consumer's test suite actually uses them (real timers, real thrown errors).
 *
 * These pin the consumer-experience properties and failure-disambiguation
 * behavior of `@molecule/api-testing`'s helpers:
 *
 * - `waitFor` must not falsely time out on a condition that becomes true during
 *   the final polling interval (the slow-but-legitimate-flow class: a poll
 *   cadence coarser than the timeout used to skip the last check entirely).
 * - `createSpy` must record a call whose implementation THREW — otherwise a
 *   caller asserting `callCount` after catching cannot tell "called and threw"
 *   apart from "never called".
 * - `expectThrows` must not misreport a function that legitimately throws
 *   `new Error('Expected function to throw')` as having not thrown.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { createSpy, expectThrows, waitFor } from '../helpers/index.js'

describe('@molecule/api-testing helpers × real timers/errors', () => {
  it('CONSUMER PROPERTY: waitFor resolves for a condition that flips true inside the last polling interval', async () => {
    // timeout=80ms with interval=100ms: the ONLY re-check happens after the
    // deadline. The flag flips at 90ms — guaranteed to have fired before the
    // 100ms interval wait resolves (same event loop, earlier timer), and after
    // the deadline. Without the final post-deadline check this deterministically
    // threw "waitFor timed out" even though the condition was already true.
    let flag = false
    setTimeout(() => {
      flag = true
    }, 90)

    await expect(waitFor(() => flag, { timeout: 80, interval: 100 })).resolves.toBeUndefined()
  })

  it('waitFor still times out (with the labeled message) when the condition never flips', async () => {
    await expect(waitFor(() => false, { timeout: 50, interval: 10 })).rejects.toThrow(
      'waitFor timed out after 50ms',
    )
  })

  it('waitFor supports async conditions across the deadline boundary', async () => {
    let flag = false
    setTimeout(() => {
      flag = true
    }, 90)

    await expect(waitFor(async () => flag, { timeout: 80, interval: 100 })).resolves.toBeUndefined()
  })

  it('FAILURE DISAMBIGUATION: a spy whose implementation throws still records the call', () => {
    const spy = createSpy((() => {
      throw new Error('downstream boom')
    }) as (...args: unknown[]) => unknown)

    expect(() => spy('arg-1')).toThrow('downstream boom')

    // The call happened — callCount must say so, with args intact, so the
    // caller can tell "invoked and threw" from "never invoked".
    expect(spy.callCount).toBe(1)
    expect(spy.calls[0].args).toEqual(['arg-1'])
    expect(spy.calls[0].result).toBeUndefined()

    // A subsequent successful call records normally alongside it.
    const okSpy = createSpy(((n: unknown) => (n as number) * 2) as (...args: unknown[]) => unknown)
    expect(okSpy(21)).toBe(42)
    expect(okSpy.callCount).toBe(1)
    expect(okSpy.calls[0].result).toBe(42)
  })

  it('FAILURE DISAMBIGUATION: expectThrows tells "did not throw" apart from "threw the same message"', async () => {
    // A function that THROWS an error whose message collides with the internal
    // "did not throw" marker must be reported as having thrown (returned),
    // not re-thrown as a failed expectation.
    const error = await expectThrows(() => {
      throw new Error('Expected function to throw')
    })
    expect(error.message).toBe('Expected function to throw')

    // And a function that truly does not throw still fails the expectation.
    await expect(expectThrows(() => 'ok')).rejects.toThrow('Expected function to throw')
  })
})
