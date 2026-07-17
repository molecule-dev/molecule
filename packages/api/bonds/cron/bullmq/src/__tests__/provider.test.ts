const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
}

vi.mock('@molecule/api-bond', () => ({
  getLogger: vi.fn(() => mockLogger),
}))

const { queueInstances, workerInstances } = vi.hoisted(() => {
  return { queueInstances: [] as MockQueueInstance[], workerInstances: [] as MockWorkerInstance[] }
})

interface MockRedisClient {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<string>
  del: (...keys: string[]) => Promise<number>
}

/** The shape of the `connection` the provider hands BullMQ's Queue/Worker. */
interface CapturedConnection {
  host?: string
  port?: number
  password?: string
  db?: number
  url?: string
  tls?: unknown
}

interface MockQueueInstance {
  upsertJobScheduler: ReturnType<typeof vi.fn>
  removeJobScheduler: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  store: Map<string, string>
  client: Promise<MockRedisClient>
  /** The options object passed to `new Queue(name, opts)` — carries `connection`. */
  opts: { connection?: CapturedConnection }
}

interface MockWorkerInstance {
  on: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  processor: (job: { name: string }) => Promise<void>
  /** The options object passed to `new Worker(name, processor, opts)` — carries `connection`. */
  opts: { connection?: CapturedConnection }
}

vi.mock('bullmq', () => {
  class MockQueue implements MockQueueInstance {
    upsertJobScheduler = vi.fn().mockResolvedValue({ id: 'mock-job-id' })
    removeJobScheduler = vi.fn().mockResolvedValue(true)
    close = vi.fn().mockResolvedValue(undefined)
    on = vi.fn()
    store = new Map<string, string>()
    client: Promise<MockRedisClient>
    opts: { connection?: CapturedConnection }

    constructor(_name: string, opts: { connection?: CapturedConnection }) {
      this.opts = opts
      this.client = Promise.resolve({
        get: vi.fn(async (key: string) => this.store.get(key) ?? null),
        set: vi.fn(async (key: string, value: string) => {
          this.store.set(key, String(value))
          return 'OK'
        }),
        del: vi.fn(async (...keys: string[]) => {
          let removed = 0
          for (const key of keys) {
            if (this.store.delete(key)) removed++
          }
          return removed
        }),
      })
      queueInstances.push(this)
    }
  }

  class MockWorker implements MockWorkerInstance {
    on = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
    processor: (job: { name: string }) => Promise<void>
    opts: { connection?: CapturedConnection }

    constructor(
      _name: string,
      processor: (job: { name: string }) => Promise<void>,
      opts: { connection?: CapturedConnection },
    ) {
      this.processor = processor
      this.opts = opts
      workerInstances.push(this)
    }
  }

  return { Queue: MockQueue, Worker: MockWorker }
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CronProvider } from '@molecule/api-cron'

describe('bullmq cron provider', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let createProvider: typeof import('../provider.js').createProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    queueInstances.length = 0
    workerInstances.length = 0
    const mod = await import('../provider.js')
    createProvider = mod.createProvider
  })

  const defaultConfig = { connection: { host: 'localhost', port: 6379 } }

  /** Returns the most recently constructed mock Queue/Worker for the last createProvider() call. */
  const lastMocks = (): { queue: MockQueueInstance; worker: MockWorkerInstance } => ({
    queue: queueInstances[queueInstances.length - 1],
    worker: workerInstances[workerInstances.length - 1],
  })

  /** Extracts the listener registered for `event` on a mocked `.on()` (e.g. worker/queue 'error'). */
  const findListener = (
    onMock: ReturnType<typeof vi.fn>,
    event: string,
  ): ((error: Error) => void) => {
    const call = onMock.mock.calls.find((c: unknown[]) => c[0] === event)
    if (!call) throw new Error(`No '${event}' listener was registered`)
    return call[1] as (error: Error) => void
  }

  describe('createProvider', () => {
    it('should create a provider with required config', () => {
      const p = createProvider(defaultConfig)
      expect(p).toBeDefined()
      expect(p.schedule).toBeInstanceOf(Function)
      expect(p.cancel).toBeInstanceOf(Function)
      expect(p.list).toBeInstanceOf(Function)
      expect(p.pause).toBeInstanceOf(Function)
      expect(p.resume).toBeInstanceOf(Function)
      expect(p.runNow).toBeInstanceOf(Function)
    })
  })

  describe('TLS connection (BUG FIX: the documented tls option must reach the connection BullMQ builds)', () => {
    it('threads an explicit tls options object through to BOTH the queue and worker connection', () => {
      const tls = { rejectUnauthorized: false, servername: 'redis.internal' }
      createProvider({ connection: { host: 'redis.internal', port: 6380, tls } })
      const { queue, worker } = lastMocks()
      // The whole point of the fix: tls is no longer dropped between the bond
      // config and the ioredis connection BullMQ constructs for each side.
      expect(queue.opts.connection?.tls).toEqual(tls)
      expect(worker.opts.connection?.tls).toEqual(tls)
    })

    it('normalizes `tls: true` to `{}` (ioredis enables TLS with defaults)', () => {
      createProvider({ connection: { host: 'h', port: 6379, tls: true } })
      const { queue, worker } = lastMocks()
      expect(queue.opts.connection?.tls).toEqual({})
      expect(worker.opts.connection?.tls).toEqual({})
    })

    it('enables TLS on the connection when the url uses the rediss:// scheme', () => {
      const url = 'rediss://redis.example.com:6380'
      createProvider({ connection: { url } })
      const { queue, worker } = lastMocks()
      expect(queue.opts.connection?.url).toBe(url)
      expect(queue.opts.connection?.tls).toEqual({})
      expect(worker.opts.connection?.tls).toEqual({})
    })

    it('an explicit tls config wins even when a rediss:// url is also present', () => {
      const tls = { ca: 'ROOT_CA_PEM' }
      createProvider({ connection: { url: 'rediss://redis.internal:6380', tls } })
      const { queue } = lastMocks()
      expect(queue.opts.connection?.tls).toEqual(tls)
    })

    it('a plaintext host/port config does NOT set tls (no accidental TLS negotiation)', () => {
      createProvider(defaultConfig)
      const { queue, worker } = lastMocks()
      expect(queue.opts.connection?.tls).toBeUndefined()
      expect(worker.opts.connection?.tls).toBeUndefined()
    })

    it('a plaintext redis:// url does NOT enable tls', () => {
      createProvider({ connection: { url: 'redis://localhost:6379' } })
      const { queue } = lastMocks()
      expect(queue.opts.connection?.url).toBe('redis://localhost:6379')
      expect(queue.opts.connection?.tls).toBeUndefined()
    })

    it('`tls: false` is respected as an explicit plaintext opt-out', () => {
      createProvider({ connection: { host: 'h', port: 6379, tls: false } })
      const { queue } = lastMocks()
      expect(queue.opts.connection?.tls).toBeUndefined()
    })
  })

  describe('schedule', () => {
    it('should schedule a job and return a name-based ID', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('cleanup', '0 3 * * *', handler)
      expect(jobId).toBe('cleanup')
    })

    it('should add job to list', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('cleanup', '0 3 * * *', handler)
      const jobs = await p.list()
      expect(jobs).toHaveLength(1)
      expect(jobs[0].name).toBe('cleanup')
      expect(jobs[0].cron).toBe('0 3 * * *')
      expect(jobs[0].status).toBe('active')
      expect(jobs[0].runCount).toBe(0)
    })

    it('should run handler immediately with runOnInit', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('init-job', '0 0 * * *', handler, { runOnInit: true })
      expect(handler).toHaveBeenCalledOnce()
      const jobs = await p.list()
      expect(jobs[0].runCount).toBe(1)
      expect(jobs[0].lastRun).toBeDefined()
    })

    it('CONTRACT: a runOnInit handler that throws is logged AND rethrown, not swallowed', async () => {
      const p = createProvider(defaultConfig)
      const error = new Error('init boom')
      const handler = vi.fn().mockRejectedValue(error)
      await expect(
        p.schedule('init-job', '0 0 * * *', handler, { runOnInit: true }),
      ).rejects.toThrow('init boom')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Cron job handler threw for 'init-job'"),
        expect.objectContaining({ error }),
      )
    })
  })

  describe('cancel', () => {
    it('should cancel a scheduled job', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('to-cancel', '* * * * *', handler)
      await p.cancel(jobId)
      const jobs = await p.list()
      expect(jobs).toHaveLength(0)
    })

    it('should throw for a job unknown to BOTH the local record and Redis', async () => {
      const p = createProvider(defaultConfig)
      const { queue } = lastMocks()
      queue.removeJobScheduler.mockResolvedValueOnce(false)
      await expect(p.cancel('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })

    it('DOC-DRIFT FIX: falls through to Redis and does NOT throw when the local record is missing but the queue still confirms removal (post-restart cancel)', async () => {
      // The bug this pins: after a restart, in-memory handler records are
      // gone, but the repeatable job scheduler is still live in Redis.
      // cancel() must still be able to remove it instead of unconditionally
      // throwing 'Cron job not found' for a job that IS still scheduled.
      const p = createProvider(defaultConfig)
      const { queue } = lastMocks()
      // removeJobScheduler resolving true (the default mock) simulates
      // Redis confirming a real repeatable job scheduler was removed, even
      // though this process never called schedule() for it.
      await expect(p.cancel('scheduled-before-restart')).resolves.toBeUndefined()
      expect(queue.removeJobScheduler).toHaveBeenCalledWith('scheduled-before-restart')
    })

    it('clears any dangling pause flag on cancel so a future reschedule under the same name does not start paused', async () => {
      const p = createProvider(defaultConfig)
      const { queue } = lastMocks()
      const jobId = await p.schedule('to-cancel', '* * * * *', vi.fn().mockResolvedValue(undefined))
      await p.pause(jobId)
      expect(queue.store.has('molecule-cron:cron-paused:to-cancel')).toBe(true)

      await p.cancel(jobId)

      expect(queue.store.has('molecule-cron:cron-paused:to-cancel')).toBe(false)
    })
  })

  describe('list', () => {
    it('should return empty array initially', async () => {
      const p = createProvider(defaultConfig)
      const jobs = await p.list()
      expect(jobs).toEqual([])
    })

    it('should list multiple jobs', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('job1', '* * * * *', handler)
      await p.schedule('job2', '0 * * * *', handler)
      const jobs = await p.list()
      expect(jobs).toHaveLength(2)
    })
  })

  describe('pause / resume — cluster-wide via Redis (AMBIGUOUS-FAILURE FIX)', () => {
    it('pause() should throw for unknown job ID', async () => {
      const p = createProvider(defaultConfig)
      await expect(p.pause('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })

    it('resume() should throw for unknown job ID', async () => {
      const p = createProvider(defaultConfig)
      await expect(p.resume('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })

    it('pause() writes a Redis-visible flag, not just a local in-memory status', async () => {
      const p = createProvider(defaultConfig)
      const { queue } = lastMocks()
      const jobId = await p.schedule('to-pause', '* * * * *', vi.fn().mockResolvedValue(undefined))

      await p.pause(jobId)

      const jobs = await p.list()
      expect(jobs[0].status).toBe('paused')
      expect(queue.store.get('molecule-cron:cron-paused:to-pause')).toBe('1')
    })

    it('resume() clears the Redis flag', async () => {
      const p = createProvider(defaultConfig)
      const { queue } = lastMocks()
      const jobId = await p.schedule('to-resume', '* * * * *', vi.fn().mockResolvedValue(undefined))

      await p.pause(jobId)
      await p.resume(jobId)

      const jobs = await p.list()
      expect(jobs[0].status).toBe('active')
      expect(queue.store.has('molecule-cron:cron-paused:to-resume')).toBe(false)
    })

    it('CONSUMER PROPERTY: a tick is skipped once paused, even simulating a DIFFERENT worker process (fresh record, Redis flag already set)', async () => {
      // Simulates the exact trap the finding describes: another worker's
      // tick used to be consumed as a silent, healthy no-op. Now the worker
      // processor itself consults the Redis flag on every tick.
      const p = createProvider(defaultConfig)
      const { queue, worker } = lastMocks()
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('cross-worker-pause', '* * * * *', handler)

      await p.pause('cross-worker-pause')

      // Simulate a real BullMQ tick reaching the worker's processor directly.
      await worker.processor({ name: 'cross-worker-pause' })

      expect(handler).not.toHaveBeenCalled()
      const [job] = await p.list()
      expect(job.status).toBe('paused')
      expect(queue.store.get('molecule-cron:cron-paused:cross-worker-pause')).toBe('1')
    })

    it('a tick runs normally once resumed', async () => {
      const p = createProvider(defaultConfig)
      const { worker } = lastMocks()
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('resumable', '* * * * *', handler)

      await p.pause('resumable')
      await p.resume('resumable')
      await worker.processor({ name: 'resumable' })

      expect(handler).toHaveBeenCalledOnce()
    })
  })

  describe('worker processor — job errors and unmatched handlers (CONTRACT: never swallow worker/job errors)', () => {
    it('DOC-DRIFT FIX: warns (not silently no-ops) when a tick arrives for a job with no registered handler in this process', async () => {
      createProvider(defaultConfig)
      const { worker } = lastMocks()

      await expect(
        worker.processor({ name: 'ghost-job-from-before-restart' }),
      ).resolves.toBeUndefined()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "BullMQ cron job 'ghost-job-from-before-restart' ticked but has no registered handler",
        ),
      )
    })

    it('a handler that throws is logged AND rethrown so BullMQ marks the occurrence failed', async () => {
      const p = createProvider(defaultConfig)
      const { worker } = lastMocks()
      const error = new Error('handler exploded')
      await p.schedule('flaky', '* * * * *', vi.fn().mockRejectedValue(error))

      await expect(worker.processor({ name: 'flaky' })).rejects.toThrow('handler exploded')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Cron job handler threw for 'flaky'"),
        expect.objectContaining({ error, jobId: 'flaky' }),
      )
    })

    it('a failed run still increments runCount and clears the running flag so the NEXT tick is not blocked', async () => {
      const p = createProvider(defaultConfig)
      const { worker } = lastMocks()
      await p.schedule('flaky', '* * * * *', vi.fn().mockRejectedValueOnce(new Error('x')), {
        noOverlap: true,
      })

      await expect(worker.processor({ name: 'flaky' })).rejects.toThrow()
      const [job] = await p.list()
      expect(job.runCount).toBe(1)

      // A second tick must not be blocked by a stuck `running` flag left
      // over from the failed first run.
      const handler2 = vi.fn().mockResolvedValue(undefined)
      await p.cancel('flaky')
      await p.schedule('flaky', '* * * * *', handler2, { noOverlap: true })
      await worker.processor({ name: 'flaky' })
      expect(handler2).toHaveBeenCalledOnce()
    })
  })

  describe('connection error handling (AMBIGUOUS-FAILURE FIX — never swallow worker/queue errors)', () => {
    it('registers real error listeners on both the worker and the queue (not an empty no-op)', () => {
      createProvider(defaultConfig)
      const { queue, worker } = lastMocks()
      expect(worker.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(queue.on).toHaveBeenCalledWith('error', expect.any(Function))
      // Regression guard: the old code registered `worker.on('error', () => {})`
      // — an empty arrow function. Assert the registered handler actually DOES
      // something observable (logs) rather than merely existing.
      const handler = findListener(worker.on, 'error')
      handler(new Error('ECONNREFUSED'))
      expect(mockLogger.error).toHaveBeenCalled()
    })

    it('logs an actionable, host:port-bearing message naming the source (worker vs queue) on a connection error', () => {
      createProvider({ connection: { host: 'redis.internal', port: 6380 } })
      const { queue, worker } = lastMocks()

      findListener(worker.on, 'error')(new Error('ECONNREFUSED'))
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/BullMQ cron worker error.*redis\.internal:6380/),
        expect.objectContaining({ error: expect.any(Error) }),
      )

      findListener(queue.on, 'error')(new Error('ECONNREFUSED'))
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/BullMQ cron queue error.*redis\.internal:6380/),
        expect.objectContaining({ error: expect.any(Error) }),
      )
    })

    it('invokes the optional onError callback in addition to logging', () => {
      const onError = vi.fn()
      createProvider({ ...defaultConfig, onError })
      const { worker } = lastMocks()
      const error = new Error('ECONNREFUSED')

      findListener(worker.on, 'error')(error)

      expect(onError).toHaveBeenCalledWith(error)
    })
  })

  describe('noOverlap (per-process emulation)', () => {
    it('skips a tick while the previous invocation on this worker is still running', async () => {
      const p = createProvider(defaultConfig)
      const { worker } = lastMocks()
      let resolveFirst: () => void
      const handler = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve
          }),
      )
      await p.schedule('slow', '* * * * * *', handler, { noOverlap: true })

      const firstRun = worker.processor({ name: 'slow' })
      // A second tick arrives while the first is still in flight.
      await worker.processor({ name: 'slow' })

      expect(handler).toHaveBeenCalledOnce()
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("BullMQ cron job 'slow' skipped: previous execution still running"),
      )

      resolveFirst!()
      await firstRun
    })

    it('without noOverlap, a second tick runs concurrently (unchanged default behavior)', async () => {
      const p = createProvider(defaultConfig)
      const { worker } = lastMocks()
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('concurrent-ok', '* * * * * *', handler)

      await Promise.all([
        worker.processor({ name: 'concurrent-ok' }),
        worker.processor({ name: 'concurrent-ok' }),
      ])

      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('runNow', () => {
    it('should execute the handler immediately', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('manual-run', '0 0 * * *', handler)
      await p.runNow(jobId)
      expect(handler).toHaveBeenCalledOnce()
      const jobs = await p.list()
      expect(jobs[0].runCount).toBe(1)
      expect(jobs[0].lastRun).toBeDefined()
    })

    it('should throw for unknown job ID', async () => {
      const p = createProvider(defaultConfig)
      await expect(p.runNow('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })

    it('logs AND rethrows when the handler throws, instead of swallowing the error', async () => {
      const p = createProvider(defaultConfig)
      const error = new Error('manual run boom')
      const jobId = await p.schedule('manual-run', '0 0 * * *', vi.fn().mockRejectedValue(error))

      await expect(p.runNow(jobId)).rejects.toThrow('manual run boom')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Cron job handler threw for 'manual-run' during runNow"),
        expect.objectContaining({ error, jobId: 'manual-run' }),
      )
    })
  })

  describe('interface conformance', () => {
    it('should conform to CronProvider interface', () => {
      const p: CronProvider = createProvider(defaultConfig)
      expect(p.schedule).toBeInstanceOf(Function)
      expect(p.cancel).toBeInstanceOf(Function)
      expect(p.list).toBeInstanceOf(Function)
      expect(p.pause).toBeInstanceOf(Function)
      expect(p.resume).toBeInstanceOf(Function)
      expect(p.runNow).toBeInstanceOf(Function)
    })
  })
})
