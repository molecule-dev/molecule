/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — against the real node-cron bond, no
 * mocks (it is in-process; `runNow` avoids waiting for a real tick).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-cron-node-cron'

import { close, list, pause, runNow, schedule, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(async () => {
    await close()
    vi.restoreAllMocks()
  })

  it('schedules a job, runs it on demand, pauses it and lists it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(createProvider({ timezone: 'UTC' }))

    const jobId = await schedule(
      'nightly-cleanup',
      '0 3 * * *',
      async () => {
        console.log('nightly cleanup ran')
      },
      { noOverlap: true },
    )
    expect(jobId).not.toBe('nightly-cleanup')

    await runNow(jobId)
    expect(log).toHaveBeenCalledWith('nightly cleanup ran')

    await pause(jobId)
    const [job] = await list()
    expect(job).toMatchObject({
      id: jobId,
      name: 'nightly-cleanup',
      cron: '0 3 * * *',
      status: 'paused',
      runCount: 1,
    })

    await expect(runNow('nightly-cleanup')).rejects.toThrow('Cron job not found')
  })
})
