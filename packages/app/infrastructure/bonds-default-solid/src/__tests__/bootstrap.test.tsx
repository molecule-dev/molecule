// @vitest-environment jsdom
/**
 * Behavior tests for `bootstrapApp` — the contract every
 * `@molecule/app-bonds-default-*` package's `bootstrapApp` shares: await
 * `setupProviders()` BEFORE the first render, kick off
 * `authClient.initialize()` best-effort, mount on `#root`, then register the
 * PWA — and surface a setup failure instead of a silent blank page.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { bootstrapApp } from '../bootstrap.js'

/** A trivial root component marking that it rendered. */
const App: Component = () => <p data-boot-mounted="">mounted</p>

afterEach(() => {
  document.body.innerHTML = ''
})

/** Waits one macrotask so the bootstrap chain can settle. */
const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('bootstrapApp', () => {
  it('awaits setupProviders() before mounting, then registerPWA() after the mount', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const order: string[] = []
    let markupAtPWA = 'never-called'
    bootstrapApp({
      App,
      authClient: { initialize: vi.fn(async () => undefined) },
      setupProviders: async () => {
        order.push('setup:start')
        await gate
        order.push('setup:done')
      },
      registerPWA: () => {
        order.push('pwa')
        markupAtPWA = document.getElementById('root')?.innerHTML ?? ''
      },
    })
    await settle()

    // The gate is still closed: the setup started, nothing mounted, no PWA.
    expect(order).toEqual(['setup:start'])
    expect(document.getElementById('root')?.innerHTML).toBe('')

    release()
    await settle()

    expect(order).toEqual(['setup:start', 'setup:done', 'pwa'])
    expect(document.getElementById('root')?.innerHTML).toContain('data-boot-mounted')
    // Solid renders synchronously, so the PWA registration sees the mounted app.
    expect(markupAtPWA, 'the PWA registers after the mount').toContain('data-boot-mounted')
  })

  it('calls authClient.initialize() and keeps mounting when it rejects', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const initialize = vi.fn(async () => {
      throw new Error('session restore failed')
    })
    try {
      bootstrapApp({
        App,
        authClient: { initialize },
        setupProviders: () => undefined,
      })
      await settle()

      expect(initialize).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        'bootstrapApp: authClient.initialize() failed',
        expect.objectContaining({ message: 'session restore failed' }),
      )
      // Best-effort only: the app still mounts logged-out.
      expect(document.getElementById('root')?.innerHTML).toContain('data-boot-mounted')
    } finally {
      warn.mockRestore()
    }
  })

  it('logs and rethrows a setupProviders() failure instead of mounting', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    try {
      const failure = new Error('bond wiring failed')
      bootstrapApp({
        App,
        authClient: { initialize: vi.fn(async () => undefined) },
        setupProviders: () => Promise.reject(failure),
      })
      await settle()

      expect(error).toHaveBeenCalledWith(
        'bootstrapApp: setupProviders() failed; app not mounted',
        failure,
      )
      expect(document.getElementById('root')?.innerHTML).toBe('')
      // bootstrapApp returns void; the rethrown failure surfaces as the
      // promise chain's rejection — an unhandled one, since no caller awaits it.
      expect(unhandled).toEqual([failure])
    } finally {
      process.off('unhandledRejection', onUnhandled)
      error.mockRestore()
    }
  })
})
