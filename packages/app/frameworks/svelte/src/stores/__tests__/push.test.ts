import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPushStores } from '../push.js'

vi.mock('@molecule/app-push', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-push'

const mockGetProvider = getProvider as ReturnType<typeof vi.fn>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockProvider() {
  return {
    checkPermission: vi.fn(() => Promise.resolve('default' as const)),
    requestPermission: vi.fn(() => Promise.resolve('granted' as const)),
    register: vi.fn(() =>
      Promise.resolve({ value: 'token-abc', platform: 'web' as const, timestamp: 1000 }),
    ),
    unregister: vi.fn(() => Promise.resolve()),
    getToken: vi.fn(() => Promise.resolve(null)),
    onNotificationReceived: vi.fn(() => vi.fn()),
    onNotificationAction: vi.fn(() => vi.fn()),
    onTokenChange: vi.fn(() => vi.fn()),
    scheduleLocal: vi.fn(() => Promise.resolve('id-1')),
    cancelLocal: vi.fn(() => Promise.resolve()),
    cancelAllLocal: vi.fn(() => Promise.resolve()),
    getPendingLocal: vi.fn(() => Promise.resolve([])),
    getDelivered: vi.fn(() => Promise.resolve([])),
    removeDelivered: vi.fn(() => Promise.resolve()),
    removeAllDelivered: vi.fn(() => Promise.resolve()),
    setBadge: vi.fn(() => Promise.resolve()),
    getBadge: vi.fn(() => Promise.resolve(0)),
    clearBadge: vi.fn(() => Promise.resolve()),
    destroy: vi.fn(),
  }
}

describe('createPushStores', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockGetProvider.mockReturnValue(mockProvider)
  })

  it('should have null initial permission', () => {
    const { permission } = createPushStores()

    expect(get(permission)).toBeNull()
  })

  it('should have null initial token', () => {
    const { token } = createPushStores()

    expect(get(token)).toBeNull()
  })

  it('should update permission store on checkPermission', async () => {
    const { permission, checkPermission } = createPushStores()

    const status = await checkPermission()

    expect(status).toBe('default')
    expect(get(permission)).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalledOnce()
  })

  it('should update permission store on requestPermission', async () => {
    const { permission, requestPermission } = createPushStores()

    const status = await requestPermission()

    expect(status).toBe('granted')
    expect(get(permission)).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalledOnce()
  })

  it('should update token store on register', async () => {
    const { token, register } = createPushStores()

    const pushToken = await register()

    expect(pushToken).toEqual({ value: 'token-abc', platform: 'web', timestamp: 1000 })
    expect(get(token)).toEqual({ value: 'token-abc', platform: 'web', timestamp: 1000 })
    expect(mockProvider.register).toHaveBeenCalledOnce()
  })

  it('should clear token store on unregister', async () => {
    const { token, register, unregister } = createPushStores()

    await register()
    expect(get(token)).not.toBeNull()

    await unregister()
    expect(get(token)).toBeNull()
    expect(mockProvider.unregister).toHaveBeenCalledOnce()
  })

  it('should delegate onNotificationReceived to provider', () => {
    const { onNotificationReceived } = createPushStores()
    const listener = vi.fn()

    onNotificationReceived(listener)

    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
  })

  it('should delegate onNotificationAction to provider', () => {
    const { onNotificationAction } = createPushStores()
    const listener = vi.fn()

    onNotificationAction(listener)

    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
  })

  it('should delegate onTokenChange to provider', () => {
    const { onTokenChange } = createPushStores()
    const listener = vi.fn()

    onTokenChange(listener)

    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
  })

  it('should delegate setBadge to provider', async () => {
    const { setBadge } = createPushStores()

    await setBadge(5)

    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)
  })

  it('should delegate clearBadge to provider', async () => {
    const { clearBadge } = createPushStores()

    await clearBadge()

    expect(mockProvider.clearBadge).toHaveBeenCalledOnce()
  })
})
