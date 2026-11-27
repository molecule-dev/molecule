import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, unbond } from '@molecule/app-bond'

import { createCapacitorApp } from '../capacitor.js'

describe('createCapacitorApp', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    unbond('push')
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

  it('registers the push provider already bonded by the Capacitor app', async () => {
    const register = vi.fn().mockResolvedValue({ value: 'test-token', platform: 'ios' })
    bond('push', { register })
    const app = createCapacitorApp({ pushNotifications: true })

    await app.initialize()

    expect(register).toHaveBeenCalledOnce()
    expect(app.getState()).toMatchObject({ ready: true, pushReady: true })
  })

  it('allows the app to supply its own push registration callback', async () => {
    const register = vi.fn().mockResolvedValue({ value: 'test-token', platform: 'web' })
    const app = createCapacitorApp({ pushNotifications: register })

    await app.initialize()

    expect(register).toHaveBeenCalledOnce()
    expect(app.getState()).toMatchObject({ ready: true, pushReady: true })
  })

  it('handles push init failure gracefully', async () => {
    const register = vi.fn().mockRejectedValue(new Error('permission denied'))
    bond('push', { register })
    const app = createCapacitorApp({ pushNotifications: true })

    await app.initialize()

    expect(register).toHaveBeenCalledOnce()
    expect(app.getState()).toMatchObject({ ready: true, pushReady: true, error: null })
  })

  it('becomes ready with push enabled and no bonded push provider', async () => {
    const app = createCapacitorApp({ pushNotifications: true })

    await app.initialize()

    expect(app.getState()).toMatchObject({ ready: true, pushReady: true, error: null })
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
