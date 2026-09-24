/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only `bullmq` (the Redis client) is
 * mocked; the provider's own logic runs for real.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { close, list, schedule, setProvider } from '@molecule/api-cron'

import { createProvider } from '../index.js'

interface CapturedConnection {
  url?: string
  tls?: unknown
}

const { queues, workers } = vi.hoisted(() => ({
  queues: [] as Array<{
    upsertJobScheduler: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    opts: { connection?: CapturedConnection }
  }>,
  workers: [] as Array<{
    processor: (job: { name: string }) => Promise<void>
    close: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('bullmq', () => {
  class Queue {
    upsertJobScheduler = vi.fn().mockResolvedValue({ id: 'job' })
    removeJobScheduler = vi.fn().mockResolvedValue(true)
    close = vi.fn().mockResolvedValue(undefined)
    on = vi.fn()
    client = Promise.resolve({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    })
    opts: { connection?: CapturedConnection }
    constructor(_name: string, opts: { connection?: CapturedConnection }) {
      this.opts = opts
      queues.push(this)
    }
  }
  class Worker {
    on = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
    processor: (job: { name: string }) => Promise<void>
    constructor(_name: string, processor: (job: { name: string }) => Promise<void>) {
      this.processor = processor
      workers.push(this)
    }
  }
  return { Queue, Worker }
})

describe('README @example', () => {
  const originalUrl = process.env.REDIS_URL

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL
    else process.env.REDIS_URL = originalUrl
    vi.restoreAllMocks()
  })

  it('schedules a repeatable job in Redis and runs its handler on a tick', async () => {
    process.env.REDIS_URL = 'rediss://redis.example.com:6380'
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        connection: { url: process.env.REDIS_URL },
        timezone: 'UTC',
      }),
    )

    const jobId = await schedule(
      'nightly-cleanup',
      '0 3 * * *',
      async () => {
        console.log('nightly cleanup ran at', new Date().toISOString())
      },
      { noOverlap: true },
    )
    expect(jobId).toBe('nightly-cleanup')

    const queue = queues.at(-1)
    const worker = workers.at(-1)
    if (!queue || !worker) throw new Error('bullmq Queue/Worker were not constructed')
    expect(queue.opts.connection?.url).toBe('rediss://redis.example.com:6380')
    expect(queue.opts.connection?.tls).toEqual({})
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'nightly-cleanup',
      { pattern: '0 3 * * *', tz: 'UTC' },
      { name: 'nightly-cleanup', data: {} },
    )

    const jobs = await list()
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ id: 'nightly-cleanup', status: 'active', runCount: 0 })

    // Simulate BullMQ delivering the 03:00 tick to this process's worker.
    await worker.processor({ name: 'nightly-cleanup' })
    expect(log).toHaveBeenCalledWith('nightly cleanup ran at', expect.any(String))
    expect((await list())[0]?.runCount).toBe(1)

    await close()
    expect(worker.close).toHaveBeenCalled()
    expect(queue.close).toHaveBeenCalled()
  })
})
