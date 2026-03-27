import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CronProvider } from '@molecule/api-cron'

vi.mock('bullmq', () => {
  class MockQueue {
    upsertJobScheduler = vi.fn().mockResolvedValue({ id: 'mock-job-id' })
    removeJobScheduler = vi.fn().mockResolvedValue(true)
    close = vi.fn().mockResolvedValue(undefined)
  }

  class MockWorker {
    on = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
  }

  return { Queue: MockQueue, Worker: MockWorker }
})

describe('bullmq cron provider', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let createProvider: typeof import('../provider.js').createProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider
  })

  const defaultConfig = { connection: { host: 'localhost', port: 6379 } }

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

    it('should throw for unknown job ID', async () => {
      const p = createProvider(defaultConfig)
      await expect(p.cancel('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
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

  describe('pause', () => {
    it('should pause a running job', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('to-pause', '* * * * *', handler)
      await p.pause(jobId)
      const jobs = await p.list()
      expect(jobs[0].status).toBe('paused')
    })

    it('should throw for unknown job ID', async () => {
      const p = createProvider(defaultConfig)
      await expect(p.pause('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })
  })

  describe('resume', () => {
    it('should resume a paused job', async () => {
      const p = createProvider(defaultConfig)
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('to-resume', '* * * * *', handler)
      await p.pause(jobId)
      await p.resume(jobId)
      const jobs = await p.list()
      expect(jobs[0].status).toBe('active')
    })

    it('should throw for unknown job ID', async () => {
      const p = createProvider(defaultConfig)
      await expect(p.resume('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
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
