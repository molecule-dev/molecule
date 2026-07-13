import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { ActivityEvent, ActivitySink } from '../types.js'

let setSink: typeof ProviderModule.setSink
let getSink: typeof ProviderModule.getSink
let hasSink: typeof ProviderModule.hasSink
let record: typeof ProviderModule.record

const sampleEvent: ActivityEvent = {
  id: 'event-1',
  type: 'email',
  status: 'captured',
  recipient: 'user@example.com',
  summary: 'Welcome email',
  timestamp: '2026-05-24T00:00:00.000Z',
}

describe('activity provider', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setSink = providerModule.setSink
    getSink = providerModule.getSink
    hasSink = providerModule.hasSink
    record = providerModule.record
  })

  describe('sink management', () => {
    it('returns null when no sink is set', () => {
      expect(getSink()).toBeNull()
    })

    it('returns false when no sink is configured', () => {
      expect(hasSink()).toBe(false)
    })

    it('sets and gets the sink', () => {
      const sink: ActivitySink = { record: vi.fn() }
      setSink(sink)
      expect(getSink()).toBe(sink)
      expect(hasSink()).toBe(true)
    })

    it('allows replacing the sink', () => {
      const a: ActivitySink = { record: vi.fn() }
      const b: ActivitySink = { record: vi.fn() }
      setSink(a)
      expect(getSink()).toBe(a)
      setSink(b)
      expect(getSink()).toBe(b)
    })
  })

  describe('record', () => {
    it('no-ops when no sink is bonded', async () => {
      await expect(record(sampleEvent)).resolves.toBeUndefined()
    })

    it('delegates to the bonded sink', async () => {
      const sinkRecord = vi.fn(() => Promise.resolve())
      const sink: ActivitySink = { record: sinkRecord }
      setSink(sink)

      await record(sampleEvent)
      expect(sinkRecord).toHaveBeenCalledTimes(1)
      expect(sinkRecord).toHaveBeenCalledWith(sampleEvent)
    })

    it('BEST-EFFORT CONTRACT: a throwing sink does not reject record() and logs a warning', async () => {
      // Regression: a failing sink used to propagate straight out of
      // record(), which would break whatever business operation (send
      // email, enqueue job, ...) the capture provider was wrapping —
      // activity recording is a best-effort side-channel by contract.
      //
      // Bond a mock logger directly (rather than spying on `getLogger()`,
      // which returns a fresh delegating object on every call and so can't
      // be spied on across calls) so the assertion exercises the same
      // `get('logger') ?? console` path `record()` uses internally.
      const { bond } = await import('@molecule/api-bond')
      const warn = vi.fn()
      bond('logger', { trace() {}, debug() {}, info() {}, warn, error() {} })

      const sinkError = new Error('sink unreachable')
      const sink: ActivitySink = { record: vi.fn().mockRejectedValue(sinkError) }
      setSink(sink)

      await expect(record(sampleEvent)).resolves.toBeUndefined()

      expect(warn).toHaveBeenCalledTimes(1)
      const [message, context] = warn.mock.calls[0]!
      expect(String(message)).toMatch(/activity sink/i)
      expect(context).toMatchObject({ eventId: sampleEvent.id, error: sinkError })
    })
  })
})
