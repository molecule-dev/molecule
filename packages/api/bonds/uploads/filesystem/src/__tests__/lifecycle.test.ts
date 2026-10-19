import { beforeEach, describe, expect, it } from 'vitest'

import { clearProviders } from '@molecule/api-bond'
import { resetRegistrationsForTests, setProvider } from '@molecule/api-process-lifecycle'
import { createProcessLifecycleProvider } from '@molecule/api-process-lifecycle-express'

import { registerLifecycleIntegration } from '../lifecycle.js'

/** Let the dynamic import inside the integration resolve. */
async function settleImport(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
}

describe('filesystem uploads bond lifecycle integration', () => {
  beforeEach(() => {
    clearProviders()
    resetRegistrationsForTests()
  })

  it('registers a non-critical storage check that reflects the probe', async () => {
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)
    registerLifecycleIntegration({ ping: async () => {} })
    await settleImport()
    lifecycle.markReady()

    const report = await lifecycle.isReady()
    const check = report.checks.find((entry) => entry.name === 'storage')
    expect(check).toBeDefined()
    expect(check?.critical).toBe(false)
    expect(check?.ok).toBe(true)
  })

  it('reports a read-only or missing upload directory as not ready', async () => {
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)
    registerLifecycleIntegration({
      ping: async () => {
        throw new Error('EACCES: permission denied')
      },
    })
    await settleImport()
    lifecycle.markReady()

    const report = await lifecycle.isReady()
    expect(report.checks.find((entry) => entry.name === 'storage')?.ok).toBe(false)
  })
})
