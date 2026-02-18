import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCapacitorApp } from '../capacitor.js'

describe('createCapacitorApp', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with ready=false', () => {
    const app = createCapacitorApp()
    expect(app.isReady()).toBe(false)
    expect(app.getState().ready).toBe(false)
  })

  it('initializes and becomes ready (non-native)', async () => {
    const app = createCapacitorApp()
    await app.initialize()

    expect(app.isReady()).toBe(true)
    expect(app.getState().deviceReady).toBe(true)
  })

  it('calls onReady callback after initialization', async () => {
    const onReady = vi.fn()
    const app = createCapacitorApp({ onReady })

    await app.initialize()

    expect(onReady).toHaveBeenCalledOnce()
  })

  it('fires onReady subscriber immediately if already ready', async () => {
    const app = createCapacitorApp()
    await app.initialize()

    const callback = vi.fn()
    app.onReady(callback)

    expect(callback).toHaveBeenCalledOnce()
  })

  it('fires onReady subscriber when becoming ready', async () => {
    const app = createCapacitorApp()

    const callback = vi.fn()
    app.onReady(callback)

    expect(callback).not.toHaveBeenCalled()

    await app.initialize()

    expect(callback).toHaveBeenCalledOnce()
  })

  it('notifies subscribers on state changes', async () => {
    const subscriber = vi.fn()
    const app = createCapacitorApp()

    app.subscribe(subscriber)
    await app.initialize()

    expect(subscriber).toHaveBeenCalled()
    const lastCall = subscriber.mock.calls[subscriber.mock.calls.length - 1][0]
    expect(lastCall.ready).toBe(true)
  })

  it('unsubscribe stops notifications', async () => {
    const subscriber = vi.fn()
    const app = createCapacitorApp()

    const unsubscribe = app.subscribe(subscriber)
    unsubscribe()

    await app.initialize()

    expect(subscriber).not.toHaveBeenCalled()
  })

  it('unsubscribe from onReady stops callback', async () => {
    const callback = vi.fn()
    const app = createCapacitorApp()

    const unsubscribe = app.onReady(callback)
    unsubscribe()

    await app.initialize()

    expect(callback).not.toHaveBeenCalled()
  })

  it('sets pushReady=true when push not configured', () => {
    const app = createCapacitorApp()
    expect(app.getState().pushReady).toBe(true)
  })

  it('sets pushReady=false initially when push is configured', () => {
    const app = createCapacitorApp({ pushNotifications: true })
    expect(app.getState().pushReady).toBe(false)
  })

  it('handles push init failure gracefully', async () => {
    // Mock the dynamic import to fail
    vi.mock('@molecule/app-push', () => {
      throw new Error('Module not found')
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const app = createCapacitorApp({ pushNotifications: true })

    await app.initialize()

    // Should still become ready despite push failure
    expect(app.isReady()).toBe(true)
    expect(app.getState().pushReady).toBe(true)

    warnSpy.mockRestore()
    vi.unmock('@molecule/app-push')
  })

  it('destroy clears all listeners', async () => {
    const subscriber = vi.fn()
    const readyCallback = vi.fn()
    const app = createCapacitorApp()

    app.subscribe(subscriber)
    app.onReady(readyCallback)
    app.destroy()

    await app.initialize()

    expect(subscriber).not.toHaveBeenCalled()
    expect(readyCallback).not.toHaveBeenCalled()
  })

  it('does not signal ready twice', async () => {
    const onReady = vi.fn()
    const app = createCapacitorApp({ onReady })

    await app.initialize()
    await app.initialize()

    expect(onReady).toHaveBeenCalledOnce()
  })
})
