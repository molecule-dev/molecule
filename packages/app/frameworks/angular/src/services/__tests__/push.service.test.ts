import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPushService } from '../push.service.js'

vi.mock('@molecule/app-push', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-push'

const mockGetProvider = vi.mocked(getProvider)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockProvider = () => ({
  checkPermission: vi.fn().mockResolvedValue('default' as const),
  requestPermission: vi.fn().mockResolvedValue('granted' as const),
  register: vi.fn().mockResolvedValue({
    value: 'test-token-123',
    platform: 'web' as const,
    timestamp: Date.now(),
  }),
  unregister: vi.fn().mockResolvedValue(undefined),
  getToken: vi.fn().mockResolvedValue(null),
  onNotificationReceived: vi.fn().mockReturnValue(() => {}),
  onNotificationAction: vi.fn().mockReturnValue(() => {}),
  onTokenChange: vi.fn().mockReturnValue(() => {}),
  scheduleLocal: vi.fn().mockResolvedValue('notif-1'),
  cancelLocal: vi.fn().mockResolvedValue(undefined),
  cancelAllLocal: vi.fn().mockResolvedValue(undefined),
  getPendingLocal: vi.fn().mockResolvedValue([]),
  getDelivered: vi.fn().mockResolvedValue([]),
  removeDelivered: vi.fn().mockResolvedValue(undefined),
  removeAllDelivered: vi.fn().mockResolvedValue(undefined),
  setBadge: vi.fn().mockResolvedValue(undefined),
  getBadge: vi.fn().mockResolvedValue(0),
  clearBadge: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
})

describe('createPushService', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    mockGetProvider.mockReturnValue(mockProvider as never)
  })

  it('should initialize with null permission and token', async () => {
    const service = createPushService()

    const permission = await firstValueFrom(service.permission$)
    const token = await firstValueFrom(service.token$)

    expect(permission).toBeNull()
    expect(token).toBeNull()
  })

  it('should return null from getPermission and getToken initially', () => {
    const service = createPushService()

    expect(service.getPermission()).toBeNull()
    expect(service.getToken()).toBeNull()
  })

  it('should update permission$ after checkPermission', async () => {
    const service = createPushService()

    const status = await service.checkPermission()

    expect(status).toBe('default')
    expect(mockProvider.checkPermission).toHaveBeenCalled()

    const permission = await firstValueFrom(service.permission$)
    expect(permission).toBe('default')
  })

  it('should update permission$ after requestPermission', async () => {
    const service = createPushService()

    const status = await service.requestPermission()

    expect(status).toBe('granted')
    expect(mockProvider.requestPermission).toHaveBeenCalled()

    const permission = await firstValueFrom(service.permission$)
    expect(permission).toBe('granted')
  })

  it('should update token$ after register', async () => {
    const service = createPushService()

    const token = await service.register()

    expect(token.value).toBe('test-token-123')
    expect(token.platform).toBe('web')
    expect(mockProvider.register).toHaveBeenCalled()

    const currentToken = await firstValueFrom(service.token$)
    expect(currentToken).toEqual(token)
  })

  it('should clear token$ after unregister', async () => {
    const service = createPushService()

    await service.register()
    await service.unregister()

    expect(mockProvider.unregister).toHaveBeenCalled()

    const token = await firstValueFrom(service.token$)
    expect(token).toBeNull()
  })

  it('should delegate onNotificationReceived to provider', () => {
    const service = createPushService()
    const listener = vi.fn()

    service.onNotificationReceived(listener)
    expect(mockProvider.onNotificationReceived).toHaveBeenCalledWith(listener)
  })

  it('should delegate onNotificationAction to provider', () => {
    const service = createPushService()
    const listener = vi.fn()

    service.onNotificationAction(listener)
    expect(mockProvider.onNotificationAction).toHaveBeenCalledWith(listener)
  })

  it('should delegate onTokenChange to provider', () => {
    const service = createPushService()
    const listener = vi.fn()

    service.onTokenChange(listener)
    expect(mockProvider.onTokenChange).toHaveBeenCalledWith(listener)
  })

  it('should delegate setBadge to provider', async () => {
    const service = createPushService()

    await service.setBadge(5)
    expect(mockProvider.setBadge).toHaveBeenCalledWith(5)
  })

  it('should delegate clearBadge to provider', async () => {
    const service = createPushService()

    await service.clearBadge()
    expect(mockProvider.clearBadge).toHaveBeenCalled()
  })

  it('should complete subjects on destroy', () => {
    const service = createPushService()

    let permissionCompleted = false
    let tokenCompleted = false

    service.permission$.subscribe({ complete: () => (permissionCompleted = true) })
    service.token$.subscribe({ complete: () => (tokenCompleted = true) })

    service.destroy()

    expect(permissionCompleted).toBe(true)
    expect(tokenCompleted).toBe(true)
  })
})
