import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActivityEvent } from '@molecule/api-activity'

const info = vi.fn()

vi.mock('@molecule/api-logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: (...args: unknown[]) => info(...args),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { createConsoleSink, provider } from '../provider.js'

const sampleEvent: ActivityEvent = {
  id: 'event-1',
  type: 'email',
  status: 'captured',
  recipient: 'user@example.com',
  summary: 'Welcome email',
  timestamp: '2026-05-24T00:00:00.000Z',
}

describe('console activity sink', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('exports a default provider', () => {
    expect(typeof provider.record).toBe('function')
  })

  it('logs the event via the logger', async () => {
    const sink = createConsoleSink()
    await sink.record(sampleEvent)

    expect(info).toHaveBeenCalledTimes(1)
    const [message, event] = info.mock.calls[0]
    expect(message).toContain('email')
    expect(message).toContain('captured')
    expect(message).toContain('user@example.com')
    expect(message).toContain('Welcome email')
    expect(event).toBe(sampleEvent)
  })

  it('handles events without recipient or summary', async () => {
    const sink = createConsoleSink()
    await sink.record({
      id: 'event-2',
      type: 'webhook',
      status: 'sent',
      timestamp: '2026-05-24T00:00:00.000Z',
    })

    expect(info).toHaveBeenCalledTimes(1)
    const [message] = info.mock.calls[0]
    expect(message).toContain('webhook')
    expect(message).toContain('sent')
  })
})
