import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as NCModule from '../notification-center.js'
import type * as ProviderModule from '../provider.js'
import type {
  CreateNotification,
  Notification,
  NotificationCenterProvider,
  NotificationPreferences,
  PaginatedResult,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let send: typeof NCModule.send
let sendBulk: typeof NCModule.sendBulk
let getAll: typeof NCModule.getAll
let getUnreadCount: typeof NCModule.getUnreadCount
let markRead: typeof NCModule.markRead
let markAllRead: typeof NCModule.markAllRead
let deleteNotification: typeof NCModule.deleteNotification
let getPreferences: typeof NCModule.getPreferences
let setPreferences: typeof NCModule.setPreferences

describe('notification center provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const ncModule = await import('../notification-center.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    send = ncModule.send
    sendBulk = ncModule.sendBulk
    getAll = ncModule.getAll
    getUnreadCount = ncModule.getUnreadCount
    markRead = ncModule.markRead
    markAllRead = ncModule.markAllRead
    deleteNotification = ncModule.deleteNotification
    getPreferences = ncModule.getPreferences
    setPreferences = ncModule.setPreferences
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Notification center provider not configured. Call setProvider() first.',
      )
    })

    it('should report no provider via hasProvider', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should report provider via hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('send', () => {
    it('should throw when no provider is set', async () => {
      await expect(send('user-1', { type: 'test', title: 'Test', body: 'Hello' })).rejects.toThrow(
        'Notification center provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const notification = createMockNotification()
      const mockProvider = createMockProvider({
        send: vi.fn().mockResolvedValue(notification),
      })
      setProvider(mockProvider)

      const input: CreateNotification = { type: 'system', title: 'Test', body: 'Hello' }
      const res = await send('user-1', input)
      expect(res).toBe(notification)
      expect(mockProvider.send).toHaveBeenCalledWith('user-1', input)
    })
  })

  describe('sendBulk', () => {
    it('should delegate to provider', async () => {
      const notifications = [createMockNotification(), createMockNotification({ id: 'notif-2' })]
      const mockProvider = createMockProvider({
        sendBulk: vi.fn().mockResolvedValue(notifications),
      })
      setProvider(mockProvider)

      const res = await sendBulk([
        { userId: 'user-1', notification: { type: 'test', title: 'A', body: 'B' } },
      ])
      expect(res).toEqual(notifications)
    })
  })

  describe('getAll', () => {
    it('should delegate to provider', async () => {
      const result: PaginatedResult<Notification> = {
        items: [createMockNotification()],
        total: 1,
        offset: 0,
        limit: 50,
      }
      const mockProvider = createMockProvider({
        getAll: vi.fn().mockResolvedValue(result),
      })
      setProvider(mockProvider)

      const res = await getAll('user-1', { read: false })
      expect(res).toEqual(result)
      expect(mockProvider.getAll).toHaveBeenCalledWith('user-1', { read: false })
    })
  })

  describe('getUnreadCount', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        getUnreadCount: vi.fn().mockResolvedValue(5),
      })
      setProvider(mockProvider)

      const count = await getUnreadCount('user-1')
      expect(count).toBe(5)
      expect(mockProvider.getUnreadCount).toHaveBeenCalledWith('user-1')
    })
  })

  describe('markRead', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        markRead: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await markRead('notif-1')
      expect(mockProvider.markRead).toHaveBeenCalledWith('notif-1')
    })
  })

  describe('markAllRead', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        markAllRead: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await markAllRead('user-1')
      expect(mockProvider.markAllRead).toHaveBeenCalledWith('user-1')
    })
  })

  describe('deleteNotification', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        delete: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await deleteNotification('notif-1')
      expect(mockProvider.delete).toHaveBeenCalledWith('notif-1')
    })
  })

  describe('getPreferences', () => {
    it('should delegate to provider', async () => {
      const prefs: NotificationPreferences = {
        email: true,
        push: true,
        sms: false,
        channels: { marketing: false },
      }
      const mockProvider = createMockProvider({
        getPreferences: vi.fn().mockResolvedValue(prefs),
      })
      setProvider(mockProvider)

      const res = await getPreferences('user-1')
      expect(res).toEqual(prefs)
    })
  })

  describe('setPreferences', () => {
    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        setPreferences: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await setPreferences('user-1', { email: false })
      expect(mockProvider.setPreferences).toHaveBeenCalledWith('user-1', { email: false })
    })
  })
})

describe('notification center types', () => {
  it('should export Notification type', () => {
    const notification: Notification = createMockNotification()
    expect(notification.id).toBe('notif-1')
    expect(notification.read).toBe(false)
  })

  it('should export CreateNotification type with channels', () => {
    const input: CreateNotification = {
      type: 'alert',
      title: 'Alert',
      body: 'Something happened',
      channels: ['inApp', 'email'],
    }
    expect(input.channels).toEqual(['inApp', 'email'])
  })

  it('should export NotificationPreferences type', () => {
    const prefs: NotificationPreferences = {
      email: true,
      push: false,
      sms: false,
      channels: {},
    }
    expect(prefs.email).toBe(true)
  })

  it('should export PaginatedResult type', () => {
    const result: PaginatedResult<Notification> = {
      items: [],
      total: 0,
      offset: 0,
      limit: 50,
    }
    expect(result.total).toBe(0)
  })
})

function createMockNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: 'system',
    title: 'Test Notification',
    body: 'This is a test.',
    read: false,
    createdAt: new Date('2026-03-28T00:00:00Z'),
    ...overrides,
  }
}

function createMockProvider(
  overrides?: Partial<NotificationCenterProvider>,
): NotificationCenterProvider {
  return {
    send: vi.fn().mockResolvedValue(createMockNotification()),
    sendBulk: vi.fn().mockResolvedValue([]),
    getAll: vi.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 50 }),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getPreferences: vi
      .fn()
      .mockResolvedValue({ email: true, push: true, sms: false, channels: {} }),
    setPreferences: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
