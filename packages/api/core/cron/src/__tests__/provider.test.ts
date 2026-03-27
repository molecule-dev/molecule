import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { CronProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let schedule: typeof ProviderModule.schedule
let cancel: typeof ProviderModule.cancel
let list: typeof ProviderModule.list
let pause: typeof ProviderModule.pause
let resume: typeof ProviderModule.resume
let runNow: typeof ProviderModule.runNow

const createMockProvider = (overrides?: Partial<CronProvider>): CronProvider => ({
  schedule: vi.fn().mockResolvedValue('job-1'),
  cancel: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue([]),
  pause: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  runNow: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('cron provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    schedule = providerModule.schedule
    cancel = providerModule.cancel
    list = providerModule.list
    pause = providerModule.pause
    resume = providerModule.resume
    runNow = providerModule.runNow
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Cron provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: CronProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate schedule to provider', async () => {
      const handler = vi.fn().mockResolvedValue(undefined)
      const options = { timezone: 'America/New_York' }
      const jobId = await schedule('cleanup', '0 3 * * *', handler, options)
      expect(mockProvider.schedule).toHaveBeenCalledWith('cleanup', '0 3 * * *', handler, options)
      expect(jobId).toBe('job-1')
    })

    it('should delegate cancel to provider', async () => {
      await cancel('job-1')
      expect(mockProvider.cancel).toHaveBeenCalledWith('job-1')
    })

    it('should delegate list to provider', async () => {
      const jobs = await list()
      expect(mockProvider.list).toHaveBeenCalled()
      expect(jobs).toEqual([])
    })

    it('should delegate pause to provider', async () => {
      await pause('job-1')
      expect(mockProvider.pause).toHaveBeenCalledWith('job-1')
    })

    it('should delegate resume to provider', async () => {
      await resume('job-1')
      expect(mockProvider.resume).toHaveBeenCalledWith('job-1')
    })

    it('should delegate runNow to provider', async () => {
      await runNow('job-1')
      expect(mockProvider.runNow).toHaveBeenCalledWith('job-1')
    })
  })

  describe('error handling', () => {
    it('should throw on schedule when no provider is set', async () => {
      await expect(
        schedule('test', '* * * * *', async () => {}),
      ).rejects.toThrow('Cron provider not configured. Call setProvider() first.')
    })

    it('should throw on cancel when no provider is set', async () => {
      await expect(cancel('job-1')).rejects.toThrow(
        'Cron provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on list when no provider is set', async () => {
      await expect(list()).rejects.toThrow(
        'Cron provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on pause when no provider is set', async () => {
      await expect(pause('job-1')).rejects.toThrow(
        'Cron provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on resume when no provider is set', async () => {
      await expect(resume('job-1')).rejects.toThrow(
        'Cron provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on runNow when no provider is set', async () => {
      await expect(runNow('job-1')).rejects.toThrow(
        'Cron provider not configured. Call setProvider() first.',
      )
    })
  })
})
