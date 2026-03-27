import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CronProvider } from '@molecule/api-cron'

import { createProvider, provider } from '../provider.js'

describe('node-cron provider', () => {
  const createdProviders: CronProvider[] = []

  afterEach(async () => {
    for (const p of createdProviders) {
      const jobs = await p.list()
      for (const job of jobs) {
        await p.cancel(job.id).catch(() => {})
      }
    }
    createdProviders.length = 0
  })

  /**
   * Creates a tracked provider that gets cleaned up after each test.
   */
  const tracked = (p: CronProvider = createProvider()): CronProvider => {
    createdProviders.push(p)
    return p
  }

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = tracked()
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
    it('should schedule a job and return an ID', async () => {
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('test-job', '* * * * *', handler)
      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')
    })

    it('should add job to list', async () => {
      const p = tracked()
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
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('init-job', '0 0 * * *', handler, { runOnInit: true })
      const jobs = await p.list()
      expect(jobs[0].runCount).toBe(1)
      expect(jobs[0].lastRun).toBeDefined()
    })
  })

  describe('cancel', () => {
    it('should cancel a scheduled job', async () => {
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('to-cancel', '* * * * *', handler)
      await p.cancel(jobId)
      const jobs = await p.list()
      expect(jobs).toHaveLength(0)
    })

    it('should throw for unknown job ID', async () => {
      const p = tracked()
      await expect(p.cancel('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })
  })

  describe('list', () => {
    it('should return empty array initially', async () => {
      const p = tracked()
      const jobs = await p.list()
      expect(jobs).toEqual([])
    })

    it('should list multiple jobs', async () => {
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      await p.schedule('job1', '* * * * *', handler)
      await p.schedule('job2', '0 * * * *', handler)
      const jobs = await p.list()
      expect(jobs).toHaveLength(2)
      expect(jobs.map((j) => j.name).sort()).toEqual(['job1', 'job2'])
    })
  })

  describe('pause', () => {
    it('should pause a running job', async () => {
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('to-pause', '* * * * *', handler)
      await p.pause(jobId)
      const jobs = await p.list()
      expect(jobs[0].status).toBe('paused')
    })

    it('should throw for unknown job ID', async () => {
      const p = tracked()
      await expect(p.pause('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })
  })

  describe('resume', () => {
    it('should resume a paused job', async () => {
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('to-resume', '* * * * *', handler)
      await p.pause(jobId)
      await p.resume(jobId)
      const jobs = await p.list()
      expect(jobs[0].status).toBe('active')
    })

    it('should throw for unknown job ID', async () => {
      const p = tracked()
      await expect(p.resume('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })
  })

  describe('runNow', () => {
    it('should execute the handler immediately', async () => {
      const p = tracked()
      const handler = vi.fn().mockResolvedValue(undefined)
      const jobId = await p.schedule('manual-run', '0 0 * * *', handler)
      await p.runNow(jobId)
      expect(handler).toHaveBeenCalledOnce()
      const jobs = await p.list()
      expect(jobs[0].runCount).toBe(1)
      expect(jobs[0].lastRun).toBeDefined()
    })

    it('should throw for unknown job ID', async () => {
      const p = tracked()
      await expect(p.runNow('nonexistent')).rejects.toThrow('Cron job not found: nonexistent')
    })
  })

  describe('default provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.schedule).toBeInstanceOf(Function)
    })

    it('should conform to CronProvider interface', () => {
      const p: CronProvider = provider
      expect(p.schedule).toBeInstanceOf(Function)
      expect(p.cancel).toBeInstanceOf(Function)
      expect(p.list).toBeInstanceOf(Function)
      expect(p.pause).toBeInstanceOf(Function)
      expect(p.resume).toBeInstanceOf(Function)
      expect(p.runNow).toBeInstanceOf(Function)
    })
  })
})
