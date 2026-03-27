import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createNotificationCenter, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  AppNotification,
  FetchOptions,
  NotificationCenterInstance,
  NotificationCenterOptions,
  NotificationCenterProvider,
  NotificationCenterState,
  NotificationUpdateHandler,
  PaginatedResult,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockNotification(overrides?: Partial<AppNotification>): AppNotification {
  return {
    id: 'notif-1',
    type: 'comment',
    title: 'New comment',
    body: 'Someone commented on your post',
    read: false,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  }
}

function createMockOptions(
  overrides?: Partial<NotificationCenterOptions>,
): NotificationCenterOptions {
  return {
    fetchNotifications: vi.fn<(opts: FetchOptions) => Promise<PaginatedResult<AppNotification>>>(
      async () => ({
        items: [createMockNotification()],
        hasMore: false,
      }),
    ),
    fetchUnreadCount: vi.fn<() => Promise<number>>(async () => 1),
    markAsRead: vi.fn<(id: string) => Promise<void>>(async () => undefined),
    markAllAsRead: vi.fn(async () => undefined),
    ...overrides,
  }
}

function createMockInstance(options: NotificationCenterOptions): NotificationCenterInstance {
  let notifications: AppNotification[] = []
  let unreadCount = 0
  let loading = false
  let moreAvailable = false
  const handlers = new Set<NotificationUpdateHandler>()

  function getState(): NotificationCenterState {
    return { notifications: [...notifications], unreadCount, loading, hasMore: moreAvailable }
  }

  function emit(): void {
    const state = getState()
    for (const handler of handlers) {
      handler(state)
    }
  }

  return {
    getNotifications: () => [...notifications],
    getUnreadCount: () => unreadCount,
    hasMore: () => moreAvailable,
    isLoading: () => loading,
    loadMore: async () => {
      loading = true
      emit()
      const result = await options.fetchNotifications({})
      notifications = [...notifications, ...result.items]
      moreAvailable = result.hasMore
      loading = false
      emit()
    },
    refresh: async () => {
      loading = true
      emit()
      const [result, count] = await Promise.all([
        options.fetchNotifications({}),
        options.fetchUnreadCount(),
      ])
      notifications = result.items
      unreadCount = count
      moreAvailable = result.hasMore
      loading = false
      emit()
    },
    markAsRead: async (id: string) => {
      await options.markAsRead(id)
      notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      unreadCount = Math.max(0, unreadCount - 1)
      emit()
    },
    markAllAsRead: async () => {
      await options.markAllAsRead()
      notifications = notifications.map((n) => ({ ...n, read: true }))
      unreadCount = 0
      emit()
    },
    onUpdate: (handler: NotificationUpdateHandler) => {
      handlers.add(handler)
    },
    offUpdate: (handler: NotificationUpdateHandler) => {
      handlers.delete(handler)
    },
    getState,
    destroy: vi.fn(),
  }
}

function createMockProvider(): NotificationCenterProvider {
  return {
    createNotificationCenter: (opts: NotificationCenterOptions) => createMockInstance(opts),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notification center provider', () => {
  beforeEach(() => {
    unbond('notification-center')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-notification-center')
    })
  })

  describe('createNotificationCenter', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createNotificationCenter')
      setProvider(mock)

      const options = createMockOptions()
      const instance = createNotificationCenter(options)

      expect(spy).toHaveBeenCalledWith(options)
      expect(instance.getNotifications()).toHaveLength(0)
    })

    it('throws when no provider is bonded', () => {
      expect(() => createNotificationCenter(createMockOptions())).toThrow(
        '@molecule/app-notification-center',
      )
    })
  })
})

describe('NotificationCenterInstance (mock conformance)', () => {
  let instance: NotificationCenterInstance

  beforeEach(() => {
    unbond('notification-center')
    setProvider(createMockProvider())
    instance = createNotificationCenter(createMockOptions())
  })

  // -- Initial state -------------------------------------------------------

  it('getNotifications returns empty array initially', () => {
    expect(instance.getNotifications()).toEqual([])
  })

  it('getUnreadCount returns 0 initially', () => {
    expect(instance.getUnreadCount()).toBe(0)
  })

  it('hasMore returns false initially', () => {
    expect(instance.hasMore()).toBe(false)
  })

  it('isLoading returns false initially', () => {
    expect(instance.isLoading()).toBe(false)
  })

  // -- Refresh -------------------------------------------------------------

  it('refresh loads notifications and unread count', async () => {
    await instance.refresh()
    expect(instance.getNotifications()).toHaveLength(1)
    expect(instance.getUnreadCount()).toBe(1)
  })

  it('refresh emits state updates', async () => {
    const handler = vi.fn()
    instance.onUpdate(handler)

    await instance.refresh()

    // loading=true then loading=false
    expect(handler).toHaveBeenCalledTimes(2)
    const finalState = handler.mock.calls[1][0] as NotificationCenterState
    expect(finalState.loading).toBe(false)
    expect(finalState.notifications).toHaveLength(1)
    expect(finalState.unreadCount).toBe(1)
  })

  // -- loadMore ------------------------------------------------------------

  it('loadMore appends notifications', async () => {
    await instance.refresh()
    expect(instance.getNotifications()).toHaveLength(1)

    await instance.loadMore()
    expect(instance.getNotifications()).toHaveLength(2)
  })

  // -- markAsRead ----------------------------------------------------------

  it('markAsRead updates the notification and decrements unread count', async () => {
    await instance.refresh()
    expect(instance.getUnreadCount()).toBe(1)

    await instance.markAsRead('notif-1')
    const notif = instance.getNotifications().find((n) => n.id === 'notif-1')
    expect(notif?.read).toBe(true)
    expect(instance.getUnreadCount()).toBe(0)
  })

  // -- markAllAsRead -------------------------------------------------------

  it('markAllAsRead marks all notifications as read', async () => {
    await instance.refresh()
    await instance.markAllAsRead()

    expect(instance.getUnreadCount()).toBe(0)
    for (const notif of instance.getNotifications()) {
      expect(notif.read).toBe(true)
    }
  })

  // -- Subscriptions -------------------------------------------------------

  it('onUpdate / offUpdate manage subscriptions', async () => {
    const handler = vi.fn()
    instance.onUpdate(handler)

    await instance.refresh()
    expect(handler).toHaveBeenCalled()

    handler.mockClear()
    instance.offUpdate(handler)

    await instance.refresh()
    expect(handler).not.toHaveBeenCalled()
  })

  // -- getState ------------------------------------------------------------

  it('getState returns current state snapshot', async () => {
    await instance.refresh()
    const state = instance.getState()

    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(1)
    expect(state.loading).toBe(false)
    expect(state.hasMore).toBe(false)
  })

  // -- Lifecycle -----------------------------------------------------------

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})
