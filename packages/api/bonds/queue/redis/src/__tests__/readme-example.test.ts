/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real queue core. Only
 * `bullmq` (which talks to Redis) is replaced — by a tiny in-memory stand-in
 * whose `add()` hands undelayed jobs to the queue's worker and treats a
 * repeated `jobId` as a no-op, like BullMQ does.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { send, setProvider, subscribe } from '@molecule/api-queue'

import { createProvider } from '../index.js'

interface FakeJob {
  id: string
  data: unknown
  attemptsMade: number
  timestamp: number
  opts: { delay?: number }
}

const bull = vi.hoisted(() => {
  const jobs = new Map<string, FakeJob>()
  const processors = new Map<string, (job: FakeJob) => Promise<void>>()
  const queueOptions: unknown[] = []
  const workerOptions: unknown[] = []
  const closed: string[] = []
  const Queue = vi.fn(function (name: string, options: unknown) {
    queueOptions.push(options)
    return {
      add: vi.fn(
        async (_jobName: string, data: unknown, opts: { jobId: string; delay?: number }) => {
          const existing = jobs.get(opts.jobId)
          if (existing) return existing
          const job: FakeJob = { id: opts.jobId, data, attemptsMade: 0, timestamp: 0, opts }
          jobs.set(opts.jobId, job)
          if (!opts.delay) await processors.get(name)?.(job)
          return job
        },
      ),
      close: vi.fn(async () => void closed.push(`queue:${name}`)),
    }
  })
  const Worker = vi.fn(function (
    name: string,
    processor: (job: FakeJob) => Promise<void>,
    options: unknown,
  ) {
    processors.set(name, processor)
    workerOptions.push(options)
    return {
      on: vi.fn(),
      close: vi.fn(async () => {
        processors.delete(name)
        closed.push(`worker:${name}`)
      }),
    }
  })
  return { Queue, Worker, jobs, queueOptions, workerOptions, closed }
})

vi.mock('bullmq', () => ({ Queue: bull.Queue, Worker: bull.Worker }))

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('consumes jobs, dedupes by deduplicationId, delays in ms, and closes connections', async () => {
    vi.stubEnv('REDIS_URL', 'rediss://redis.example.com:6380')
    const handlers: Array<() => void> = []
    vi.spyOn(process, 'on').mockImplementation(((_event: string, handler: () => void) => {
      handlers.push(handler)
      return process
    }) as typeof process.on)

    const redisQueues = createProvider({ url: process.env.REDIS_URL, prefix: 'myapp:queue:' })
    setProvider(redisQueues)

    interface WelcomeEmailJob {
      to: string
      name: string
    }
    const greeted: string[] = []
    const unsubscribe = subscribe<WelcomeEmailJob>(
      'emails',
      async (message) => {
        greeted.push(`Welcome, ${message.body.name} <${message.body.to}>`)
      },
      { maxMessages: 5 },
    )

    const job = { to: 'ada@example.com', name: 'Ada' }
    await send<WelcomeEmailJob>('emails', { body: job, deduplicationId: 'welcome-user-1' })
    await send<WelcomeEmailJob>('emails', { body: job, deduplicationId: 'welcome-user-1' })
    await send<WelcomeEmailJob>('emails', {
      body: { to: 'grace@example.com', name: 'Grace' },
      delaySeconds: 60,
    })

    process.on('SIGTERM', () => {
      unsubscribe()
      void redisQueues.close?.()
    })

    expect(greeted).toEqual(['Welcome, Ada <ada@example.com>'])
    expect(bull.jobs.size).toBe(2)
    expect([...bull.jobs.values()][1]?.opts.delay).toBe(60_000)
    expect(bull.queueOptions[0]).toMatchObject({
      prefix: 'myapp:queue:',
      connection: { url: 'rediss://redis.example.com:6380', maxRetriesPerRequest: 1 },
    })
    expect(bull.workerOptions[0]).toMatchObject({ prefix: 'myapp:queue:', concurrency: 5 })

    handlers[0]?.()
    await vi.waitFor(() => expect(bull.closed).toEqual(['worker:emails', 'queue:emails']))
  })
})
