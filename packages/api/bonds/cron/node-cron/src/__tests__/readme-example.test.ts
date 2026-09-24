/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — against the real node-cron, no mocks.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { close, list, runNow, schedule, setProvider } from '@molecule/api-cron'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(async () => {
    await close()
    vi.restoreAllMocks()
  })

  it('schedules a job, runs it on demand and lists it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(createProvider({ timezone: 'UTC' }))

    const jobId = await schedule(
      'nightly-cleanup',
      '0 3 * * *',
      async () => {
        console.log('nightly cleanup ran at', new Date().toISOString())
      },
      { noOverlap: true },
    )
    expect(jobId).not.toBe('nightly-cleanup')

    await runNow(jobId)
    expect(log).toHaveBeenCalledWith('nightly cleanup ran at', expect.any(String))

    const [job] = await list()
    expect(job).toMatchObject({
      id: jobId,
      name: 'nightly-cleanup',
      cron: '0 3 * * *',
      status: 'active',
      runCount: 1,
    })
    expect(job?.nextRun?.getUTCHours()).toBe(3)

    await expect(runNow('nightly-cleanup')).rejects.toThrow('Cron job not found')
  })
})
