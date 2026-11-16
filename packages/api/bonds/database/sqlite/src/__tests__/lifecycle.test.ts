import { beforeEach, describe, expect, it, vi } from 'vitest'

import { reset } from '@molecule/api-bond'
import type { ProcessLifecycleProvider } from '@molecule/api-process-lifecycle'
import { resetRegistrationsForTests, setProvider } from '@molecule/api-process-lifecycle'
import { createProcessLifecycleProvider } from '@molecule/api-process-lifecycle-express'

import { registerLifecycleIntegration } from '../lifecycle.js'

/**
 * Wait until the integration's dynamic import has resolved and registered its
 * readiness check (it registers the shutdown hook in the same callback).
 * Polls the provider's public report, so a slow import is waited out instead
 * of racing a fixed sleep.
 */
async function waitForRegistration(lifecycle: ProcessLifecycleProvider): Promise<void> {
  await vi.waitUntil(
    async () => (await lifecycle.isReady()).checks.some((entry) => entry.name === 'database'),
    2_000,
  )
}

describe('sqlite bond lifecycle integration', () => {
  beforeEach(() => {
    reset()
    resetRegistrationsForTests()
  })

  it('registers a database readiness check that reflects the probe', async () => {
    const lifecycle = createProcessLifecycleProvider()
    registerLifecycleIntegration({
      ping: async () => {},
      close: async () => {},
      created: () => false,
    })
    setProvider(lifecycle)
    await waitForRegistration(lifecycle)
    lifecycle.markReady()

    const report = await lifecycle.isReady()
    const check = report.checks.find((entry) => entry.name === 'database')
    expect(check).toBeDefined()
    expect(check?.critical).toBe(true)
    expect(check?.ok).toBe(true)
  })

  it('reports not ready when the probe rejects', async () => {
    const lifecycle = createProcessLifecycleProvider()
    registerLifecycleIntegration({
      ping: async () => {
        throw new Error('connection refused')
      },
      close: async () => {},
      created: () => false,
    })
    setProvider(lifecycle)
    await waitForRegistration(lifecycle)
    lifecycle.markReady()

    const report = await lifecycle.isReady()
    expect(report.checks.find((entry) => entry.name === 'database')?.ok).toBe(false)
  })

  it('closes the resource at shutdown only when it was created', async () => {
    const close = vi.fn(async () => {})
    registerLifecycleIntegration({ ping: async () => {}, close, created: () => true })
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)
    await waitForRegistration(lifecycle)

    const report = await lifecycle.runShutdownHooks('SIGTERM')
    expect(report.hooks.find((hook) => hook.name === 'database-pool')?.ok).toBe(true)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('never opens a connection just to close it', async () => {
    const close = vi.fn(async () => {})
    registerLifecycleIntegration({ ping: async () => {}, close, created: () => false })
    const lifecycle = createProcessLifecycleProvider()
    setProvider(lifecycle)
    await waitForRegistration(lifecycle)

    await lifecycle.runShutdownHooks('SIGTERM')
    expect(close).not.toHaveBeenCalled()
  })
})
