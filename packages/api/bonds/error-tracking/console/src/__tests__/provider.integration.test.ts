/**
 * REAL-DEPENDENCY integration tests — no `vi.mock` anywhere: the real
 * `@molecule/api-error-tracking` core, the real bond registry, and a plain
 * in-process capturing logger bonded the way an app would bond one.
 *
 * The unit suite (`provider.test.ts`) calls the provider's methods directly,
 * so it never exercises the path an app actually uses: the core convenience
 * functions (`captureException` / `captureMessage` / `setUser` / `flush`)
 * dispatching through the bond registry to this provider. These tests pin the
 * two consumer-experience contracts of the category end-to-end:
 *
 * 1. UNBONDED = silent no-op (never a throw) — an app that hasn't wired a
 *    tracker must behave exactly as if the capture calls weren't there.
 * 2. BONDED = every capture is delivered as a structured log line with its
 *    own event id, and distinct failure kinds stay distinguishable.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bond, unbond } from '@molecule/api-bond'
import {
  captureException,
  captureMessage,
  flush,
  setProvider,
  setUser,
} from '@molecule/api-error-tracking'

import { provider } from '../provider.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** One captured log line: which severity channel it hit, and its payload. */
interface CapturedLine {
  channel: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  args: unknown[]
}

/** A real in-process logger that records every line (no mocking library involved). */
const makeCapturingLogger = (): { lines: CapturedLine[]; logger: Record<string, unknown> } => {
  const lines: CapturedLine[] = []
  const record =
    (channel: CapturedLine['channel']) =>
    (...args: unknown[]) =>
      void lines.push({ channel, args })
  return {
    lines,
    logger: {
      trace: record('trace'),
      debug: record('debug'),
      info: record('info'),
      warn: record('warn'),
      error: record('error'),
    },
  }
}

describe('@molecule/api-error-tracking-console × REAL core lifecycle', () => {
  let sink: ReturnType<typeof makeCapturingLogger>

  beforeEach(() => {
    sink = makeCapturingLogger()
    bond('logger', sink.logger)
  })

  afterEach(() => {
    // Clear the provider's module-level user scope and unwire everything so
    // no state leaks between tests.
    provider.setUser?.(null)
    unbond('error-tracking')
    unbond('logger')
  })

  it('CONSUMER PROPERTY: unbonded captures are a silent no-op — then bonding delivers the SAME call end-to-end', async () => {
    // Phase 1 — no provider bonded: the documented no-op. The exact calls an
    // app ships must not throw, must return undefined, and must log nothing.
    unbond('error-tracking')
    const boom = new Error('boom')

    expect(captureException(boom, { tags: { source: 'worker' } })).toBeUndefined()
    expect(captureMessage('queue backing up', 'warning')).toBeUndefined()
    await expect(flush(1000)).resolves.toBe(true)
    expect(sink.lines).toEqual([])

    // Phase 2 — bond the provider (the one line setup docs teach) and repeat
    // the identical call: it now returns an event id and lands as a
    // structured line, with the context intact after the full
    // core → registry → provider → logger trip.
    setProvider(provider)

    const eventId = captureException(boom, {
      tags: { source: 'worker' },
      extra: { jobId: 'job-7' },
    })
    expect(eventId).toMatch(UUID_RE)

    expect(sink.lines).toHaveLength(1)
    const [line] = sink.lines
    expect(line.channel).toBe('error')
    expect(line.args[0]).toBe('error-tracking: exception captured')
    const payload = line.args[1] as Record<string, unknown>
    expect(payload.eventId).toBe(eventId)
    expect(payload.error).toBe(boom) // the REAL Error object — message + stack survive
    expect(payload.tags).toEqual({ source: 'worker' })
    expect(payload.extra).toEqual({ jobId: 'job-7' })
  })

  it('FAILURE DISAMBIGUATION: an exception, a warning, and a fatal stay distinguishable by channel, level, and event id', () => {
    setProvider(provider)
    const dbDown = new Error('connection refused')

    const exceptionId = captureException(dbDown)
    const warningId = captureMessage('payment retries backing up', 'warning')
    const fatalId = captureMessage('worker pool exhausted', 'fatal')

    expect(sink.lines).toHaveLength(3)
    const [exception, warning, fatal] = sink.lines

    // Channel tells exception/fatal apart from a mere warning...
    expect(exception.channel).toBe('error')
    expect(warning.channel).toBe('warn')
    expect(fatal.channel).toBe('error')

    // ...and the payload disambiguates the two error-channel lines: an
    // exception capture carries the Error itself, a fatal message carries its
    // level — a triaging caller never has to guess which failure was which.
    const exceptionPayload = exception.args[1] as Record<string, unknown>
    const fatalPayload = fatal.args[1] as Record<string, unknown>
    expect((exceptionPayload.error as Error).message).toBe('connection refused')
    expect((exceptionPayload.error as Error).stack).toContain('connection refused')
    expect(exceptionPayload.level).toBeUndefined()
    expect(fatalPayload.level).toBe('fatal')
    expect(fatalPayload.message).toBe('worker pool exhausted')

    // Every capture got its own id — three reports never blur into one.
    expect(new Set([exceptionId, warningId, fatalId]).size).toBe(3)
  })

  it('setUser scoping flows through the core: scoped user attaches, per-capture user wins, null clears', () => {
    setProvider(provider)

    setUser({ id: 'user-1', email: 'a@example.com' })
    captureException(new Error('scoped'))
    let payload = sink.lines[0].args[1] as Record<string, unknown>
    expect(payload.user).toEqual({ id: 'user-1', email: 'a@example.com' })

    // A capture-specific user beats the scope (per-request context wins).
    captureException(new Error('contextual'), { user: { id: 'context-user' } })
    payload = sink.lines[1].args[1] as Record<string, unknown>
    expect(payload.user).toEqual({ id: 'context-user' })

    // Clearing the scope removes the user from subsequent captures.
    setUser(null)
    captureException(new Error('anonymous'))
    payload = sink.lines[2].args[1] as Record<string, unknown>
    expect(payload.user).toBeUndefined()
  })

  it('flush through the core resolves true (captures are synchronous — nothing can be lost at exit)', async () => {
    setProvider(provider)
    captureException(new Error('pre-exit report'))

    await expect(flush()).resolves.toBe(true)
    // The capture was already on the sink BEFORE flush — proof nothing was buffered.
    expect(sink.lines).toHaveLength(1)
  })
})
