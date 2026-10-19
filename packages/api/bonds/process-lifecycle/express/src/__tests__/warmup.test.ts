import { describe, expect, it, vi } from 'vitest'

import { createWarmupGate, DEFAULT_CONSECUTIVE_READY_PASSES } from '../warmup.js'

describe('createWarmupGate', () => {
  it('runs every registered step once and reports it', async () => {
    const gate = createWarmupGate()
    const order: string[] = []
    gate.registerStep({ name: 'modules', run: () => void order.push('modules') })
    gate.registerStep({ name: 'indexes', run: async () => void order.push('indexes') })

    const first = gate.run()
    const second = gate.run()

    expect(second).toBe(first)
    await expect(first).resolves.toMatchObject({
      ok: true,
      steps: [
        { name: 'modules', ok: true },
        { name: 'indexes', ok: true },
      ],
    })
    expect(order.sort()).toEqual(['indexes', 'modules'])
    expect(gate.isSettled()).toBe(true)
  })

  it('reports a throwing step, logs it, and still settles', async () => {
    const error = vi.fn()
    const gate = createWarmupGate({ logger: { warn: vi.fn(), error } })
    gate.registerStep({
      name: 'broken',
      run: () => {
        throw new Error('preload failed')
      },
    })

    const report = await gate.run()

    expect(report).toMatchObject({
      ok: false,
      steps: [{ name: 'broken', ok: false, error: 'preload failed' }],
    })
    expect(error).toHaveBeenCalledTimes(1)
    expect(gate.isSettled()).toBe(true)
  })

  it('bounds a hanging step at its timeout and settles anyway', async () => {
    const warn = vi.fn()
    const gate = createWarmupGate({ timeoutMs: 20, logger: { warn, error: vi.fn() } })
    gate.registerStep({ name: 'stuck', run: () => new Promise<void>(() => {}) })

    const report = await gate.run()

    expect(report.steps[0]).toMatchObject({ name: 'stuck', ok: false, timedOut: true })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(gate.isSettled()).toBe(true)
  })

  it('accepts a one-off step alongside the registered ones', async () => {
    const gate = createWarmupGate()
    gate.registerStep({ name: 'registered', run: () => {} })

    const report = await gate.run([{ name: 'one-off', run: () => {} }])

    expect(report.steps.map((step) => step.name)).toEqual(['registered', 'one-off'])
  })

  it('requires the gate to settle and N consecutive passing probes', async () => {
    const gate = createWarmupGate({ consecutivePasses: DEFAULT_CONSECUTIVE_READY_PASSES })

    // Not settled: a passing probe is not enough.
    expect(gate.observe(true)).toBe(false)
    gate.markSettled()

    expect(gate.observe(true)).toBe(false)
    expect(gate.observe(true)).toBe(true)

    // A failed probe resets the streak.
    expect(gate.observe(false)).toBe(false)
    expect(gate.observe(true)).toBe(false)
    expect(gate.observe(true)).toBe(true)
  })

  it('closes the gate again on reset, and a stale pass does not settle the new instance', async () => {
    const gate = createWarmupGate()
    gate.markSettled()
    expect(gate.isSettled()).toBe(true)

    let release: () => void = () => {}
    const deferred = new Promise<void>((resolve) => {
      release = resolve
    })
    gate.registerStep({ name: 'slow', run: () => deferred })
    const pending = gate.run()

    gate.reset()
    expect(gate.isSettled()).toBe(false)

    release()
    await pending
    // The pass belongs to the previous instance; it must not open the gate.
    expect(gate.isSettled()).toBe(false)

    // The new instance can run its own pass.
    await gate.run()
    expect(gate.isSettled()).toBe(true)
  })

  it('markSettled opens the gate without running work', () => {
    const gate = createWarmupGate()
    const work = vi.fn()
    gate.registerStep({ name: 'unused', run: work })

    gate.markSettled()

    expect(gate.isSettled()).toBe(true)
    expect(work).not.toHaveBeenCalled()
  })
})
