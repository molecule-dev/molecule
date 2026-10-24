import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearProviders } from '@molecule/api-bond'
import { resetRegistrationsForTests, setProvider } from '@molecule/api-process-lifecycle'
import { createProcessLifecycleProvider } from '@molecule/api-process-lifecycle-express'

import { registerLifecycleIntegration } from '../lifecycle.js'

/** Let the dynamic import inside the integration resolve. */
async function settleImport(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
}

describe('duckdb bond lifecycle integration', () => {
  beforeEach(() => {
    clearProviders()
    resetRegistrationsForTests()
  })

  it('registers a database readiness check that reflects the probe', async () => {
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)
    registerLifecycleIntegration({
      ping: async () => {},
      close: async () => {},
      created: () => false,
    })
    await settleImport()
    lifecycle.markReady()

    const report = await lifecycle.isReady()
    const check = report.checks.find((entry) => entry.name === 'database')
    expect(check).toBeDefined()
    expect(check?.critical).toBe(true)
    expect(check?.ok).toBe(true)
  })

  it('reports not ready when the probe rejects', async () => {
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)
    registerLifecycleIntegration({
      ping: async () => {
        throw new Error('could not set lock on file')
      },
      close: async () => {},
      created: () => false,
    })
    await settleImport()
    lifecycle.markReady()

    const report = await lifecycle.isReady()
    expect(report.checks.find((entry) => entry.name === 'database')?.ok).toBe(false)
  })

  it('closes the resource at shutdown only when it was created', async () => {
    const close = vi.fn(async () => {})
    registerLifecycleIntegration({ ping: async () => {}, close, created: () => true })
    await settleImport()
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)

    const report = await lifecycle.runShutdownHooks('SIGTERM')
    expect(report.hooks.find((hook) => hook.name === 'database-pool')?.ok).toBe(true)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('never opens a connection just to close it', async () => {
    const close = vi.fn(async () => {})
    registerLifecycleIntegration({ ping: async () => {}, close, created: () => false })
    await settleImport()
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)

    await lifecycle.runShutdownHooks('SIGTERM')
    expect(close).not.toHaveBeenCalled()
  })
})
