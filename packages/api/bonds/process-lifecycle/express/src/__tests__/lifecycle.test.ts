import { describe, expect, it } from 'vitest'

import { createProcessLifecycleProvider, provider as defaultProvider } from '../index.js'

describe('createProcessLifecycleProvider', () => {
  it('starts in starting and only reports ready after markReady', async () => {
    const lifecycle = createProcessLifecycleProvider()

    expect(lifecycle.state()).toBe('starting')
    expect((await lifecycle.isReady()).ready).toBe(false)

    lifecycle.markReady()
    expect(lifecycle.state()).toBe('ready')
    expect((await lifecycle.isReady()).ready).toBe(true)
  })

  it('fails readiness on a critical check but stays ready when a non-critical check fails', async () => {
    const lifecycle = createProcessLifecycleProvider()
    lifecycle.markReady()
    lifecycle.registerReadinessCheck({ name: 'db', critical: true, check: () => false })
    lifecycle.registerReadinessCheck({ name: 'cache', critical: false, check: () => false })

    const report = await lifecycle.isReady()
    expect(report.ready).toBe(false)
    expect(report.checks.map((c) => [c.name, c.ok, c.critical])).toEqual([
      ['db', false, true],
      ['cache', false, false],
    ])
  })

  it('treats a thrown check as failed, not as a crash', async () => {
    const lifecycle = createProcessLifecycleProvider()
    lifecycle.markReady()
    lifecycle.registerReadinessCheck({
      name: 'db',
      check: () => {
        throw new Error('connection refused')
      },
    })

    const report = await lifecycle.isReady()
    expect(report.ready).toBe(false)
    expect(report.checks[0]).toMatchObject({ name: 'db', ok: false, detail: 'connection refused' })
  })

  it('times a hanging check out at its own timeout', async () => {
    const lifecycle = createProcessLifecycleProvider()
    lifecycle.markReady()
    lifecycle.registerReadinessCheck({
      name: 'slow',
      timeoutMs: 20,
      check: () => new Promise<boolean>(() => {}),
    })

    const report = await lifecycle.isReady()
    expect(report.ready).toBe(false)
    expect(report.checks[0]).toMatchObject({ name: 'slow', ok: false, timedOut: true })
  })

  it('flips readiness to false and liveness to true the instant draining starts', async () => {
    const lifecycle = createProcessLifecycleProvider()
    lifecycle.markReady()

    lifecycle.startDraining('SIGTERM')

    expect(lifecycle.isDraining()).toBe(true)
    expect(lifecycle.state()).toBe('draining')
    const ready = await lifecycle.isReady()
    expect(ready).toMatchObject({ ready: false, draining: true, state: 'draining' })
    expect((await lifecycle.isLive()).live).toBe(true)
  })

  it('counts in-flight requests and releases idempotently', async () => {
    const lifecycle = createProcessLifecycleProvider()

    const releaseA = lifecycle.beginRequest()
    const releaseB = lifecycle.beginRequest()
    expect(lifecycle.inFlightRequests()).toBe(2)

    releaseA()
    releaseA()
    expect(lifecycle.inFlightRequests()).toBe(1)
    releaseB()
    expect(lifecycle.inFlightRequests()).toBe(0)
  })

  it('resolves waitForRequestsToDrain when the count reaches zero', async () => {
    const lifecycle = createProcessLifecycleProvider()
    const release = lifecycle.beginRequest()

    const waiting = lifecycle.waitForRequestsToDrain(1_000)
    release()

    await expect(waiting).resolves.toBe(true)
  })

  it('reports a drain timeout when a request never finishes', async () => {
    const lifecycle = createProcessLifecycleProvider()
    lifecycle.beginRequest()

    await expect(lifecycle.waitForRequestsToDrain(20)).resolves.toBe(false)
  })

  it('runs shutdown hooks in order and keeps going after a failing hook', async () => {
    const lifecycle = createProcessLifecycleProvider({ defaultHookTimeoutMs: 1000 })
    const ran: string[] = []
    lifecycle.registerShutdownHook({
      name: 'second',
      order: 20,
      run: () => void ran.push('second'),
    })
    lifecycle.registerShutdownHook({ name: 'first', order: 10, run: () => void ran.push('first') })
    lifecycle.registerShutdownHook({
      name: 'broken',
      order: 15,
      run: () => {
        throw new Error('pool already closed')
      },
    })

    const report = await lifecycle.runShutdownHooks('SIGTERM')

    expect(ran).toEqual(['first', 'second'])
    expect(report.state).toBe('stopped')
    expect(report.reason).toBe('SIGTERM')
    expect(report.hooks.map((hook) => [hook.name, hook.ok])).toEqual([
      ['first', true],
      ['broken', false],
      ['second', true],
    ])
    expect(report.hooks[1].error).toBe('pool already closed')
  })

  it('bounds a hanging shutdown hook by its timeout', async () => {
    const lifecycle = createProcessLifecycleProvider({ defaultHookTimeoutMs: 20 })
    lifecycle.registerShutdownHook({
      name: 'stuck',
      run: () => new Promise<void>(() => {}),
    })

    const report = await lifecycle.runShutdownHooks('SIGTERM')

    expect(report.hooks[0]).toMatchObject({ name: 'stuck', ok: false, timedOut: true })
  })

  it('runs shutdown hooks only once across repeated calls', async () => {
    const lifecycle = createProcessLifecycleProvider()
    let calls = 0
    lifecycle.registerShutdownHook({ name: 'pool', run: () => void (calls += 1) })

    const [first, second] = await Promise.all([
      lifecycle.runShutdownHooks('SIGTERM'),
      lifecycle.runShutdownHooks('SIGINT'),
    ])

    expect(calls).toBe(1)
    expect(second).toBe(first)
    expect((await lifecycle.isLive()).live).toBe(false)
  })

  it('removes checks and hooks through the returned unregister functions', async () => {
    const lifecycle = createProcessLifecycleProvider()
    lifecycle.markReady()
    const unregisterCheck = lifecycle.registerReadinessCheck({ name: 'db', check: () => false })
    const unregisterHook = lifecycle.registerShutdownHook({ name: 'pool', run: () => {} })

    unregisterCheck()
    unregisterHook()

    expect((await lifecycle.isReady()).ready).toBe(true)
    expect((await lifecycle.runShutdownHooks()).hooks).toEqual([])
  })

  it('exports a process-wide default provider', () => {
    expect(defaultProvider.state()).toBeTypeOf('string')
    expect(defaultProvider.inFlightRequests()).toBe(0)
  })
})
