import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AppNotification,
  FetchOptions,
  NotificationCenterOptions,
  NotificationCenterState,
  NotificationRealtimeAdapter,
  PaginatedResult,
} from '@molecule/app-notification-center'

import { createDefaultProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
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

function makePaginatedResult(
  items: AppNotification[] = [makeNotification()],
  overrides: Partial<PaginatedResult<AppNotification>> = {},
): PaginatedResult<AppNotification> {
  return {
    items,
    hasMore: false,
    ...overrides,
  }
}

function createOptions(
  overrides: Partial<NotificationCenterOptions> = {},
): NotificationCenterOptions {
  return {
    fetchNotifications: vi.fn<(opts: FetchOptions) => Promise<PaginatedResult<AppNotification>>>(
      () => Promise.resolve(makePaginatedResult()),
    ),
    fetchUnreadCount: vi.fn(() => Promise.resolve(1)),
    markAsRead: vi.fn(() => Promise.resolve()),
    markAllAsRead: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

function createMockRealtime(): NotificationRealtimeAdapter & {
  handlers: Map<string, Set<(data: unknown) => void>>
  emit: (event: string, data: unknown) => void
} {
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  return {
    handlers,
    on(event: string, handler: (data: unknown) => void): void {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    },
    off(event: string, handler?: (data: unknown) => void): void {
      if (!handler) {
        handlers.delete(event)
      } else {
        handlers.get(event)?.delete(handler)
      }
    },
    emit(event: string, data: unknown): void {
      const set = handlers.get(event)
      if (set) {
        for (const h of set) h(data)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-notification-center-default', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('provider conformance', () => {
    it('exports a typed provider with createNotificationCenter method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createNotificationCenter).toBe('function')
    })

    it('createDefaultProvider returns a NotificationCenterProvider', () => {
      const p = createDefaultProvider()
      expect(typeof p.createNotificationCenter).toBe('function')
    })

    it('createDefaultProvider accepts config', () => {
      const p = createDefaultProvider({ defaultPageSize: 10, refreshUnreadOnPoll: false })
      expect(typeof p.createNotificationCenter).toBe('function')
    })
  })

  describe('initial state', () => {
    it('starts with empty notifications', () => {
      const center = provider.createNotificationCenter(createOptions())
      expect(center.getNotifications()).toEqual([])
      center.destroy()
    })

    it('starts with zero unread count', () => {
      const center = provider.createNotificationCenter(createOptions())
      expect(center.getUnreadCount()).toBe(0)
      center.destroy()
    })

    it('starts with hasMore true', () => {
      const center = provider.createNotificationCenter(createOptions())
      expect(center.hasMore()).toBe(true)
      center.destroy()
    })

    it('starts not loading', () => {
      const center = provider.createNotificationCenter(createOptions())
      expect(center.isLoading()).toBe(false)
      center.destroy()
    })

    it('getState returns full state snapshot', () => {
      const center = provider.createNotificationCenter(createOptions())
      const state = center.getState()
      expect(state).toEqual({
        notifications: [],
        unreadCount: 0,
        loading: false,
        hasMore: true,
      })
      center.destroy()
    })
  })

  describe('loadMore', () => {
    it('fetches first page of notifications', async () => {
      const notifications = [makeNotification({ id: '1' }), makeNotification({ id: '2' })]
      const opts = createOptions({
        fetchNotifications: vi.fn(() => Promise.resolve(makePaginatedResult(notifications))),
      })
      const center = provider.createNotificationCenter(opts)

      await center.loadMore()

      expect(center.getNotifications()).toHaveLength(2)
      expect(center.getNotifications()[0].id).toBe('1')
      expect(center.hasMore()).toBe(false)
      center.destroy()
    })

    it('passes cursor for subsequent pages', async () => {
      const fetchNotifications = vi
        .fn<(opts: FetchOptions) => Promise<PaginatedResult<AppNotification>>>()
        .mockResolvedValueOnce(
          makePaginatedResult([makeNotification({ id: '1' })], {
            hasMore: true,
            nextCursor: 'cursor-1',
          }),
        )
        .mockResolvedValueOnce(
          makePaginatedResult([makeNotification({ id: '2' })], {
            hasMore: false,
          }),
        )

      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      await center.loadMore()
      await center.loadMore()

      expect(fetchNotifications).toHaveBeenCalledTimes(2)
      expect(fetchNotifications).toHaveBeenNthCalledWith(2, {
        cursor: 'cursor-1',
        limit: 20,
      })
      expect(center.getNotifications()).toHaveLength(2)
      center.destroy()
    })

    it('deduplicates notifications', async () => {
      const fetchNotifications = vi
        .fn<(opts: FetchOptions) => Promise<PaginatedResult<AppNotification>>>()
        .mockResolvedValueOnce(
          makePaginatedResult([makeNotification({ id: '1' })], {
            hasMore: true,
            nextCursor: 'c1',
          }),
        )
        .mockResolvedValueOnce(
          makePaginatedResult([makeNotification({ id: '1' }), makeNotification({ id: '2' })], {
            hasMore: false,
          }),
        )

      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      await center.loadMore()
      await center.loadMore()

      expect(center.getNotifications()).toHaveLength(2)
      center.destroy()
    })

    it('does not fetch when already loading', async () => {
      let resolveFirst: (value: PaginatedResult<AppNotification>) => void
      const fetchNotifications = vi
        .fn<(opts: FetchOptions) => Promise<PaginatedResult<AppNotification>>>()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirst = resolve
            }),
        )

      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      const promise1 = center.loadMore()
      center.loadMore() // should be a no-op

      expect(fetchNotifications).toHaveBeenCalledTimes(1)

      resolveFirst!(makePaginatedResult())
      await promise1
      center.destroy()
    })

    it('does not fetch when hasMore is false', async () => {
      const fetchNotifications = vi.fn(() =>
        Promise.resolve(makePaginatedResult([], { hasMore: false })),
      )
      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      await center.loadMore()
      await center.loadMore()

      expect(fetchNotifications).toHaveBeenCalledTimes(1)
      center.destroy()
    })

    it('emits state updates during loading', async () => {
      const updates: NotificationCenterState[] = []
      const center = provider.createNotificationCenter(createOptions())
      center.onUpdate((state) => updates.push(state))

      await center.loadMore()

      // Should have at least 2 updates: loading=true, then loading=false
      expect(updates.length).toBeGreaterThanOrEqual(2)
      expect(updates[0].loading).toBe(true)
      expect(updates[updates.length - 1].loading).toBe(false)
      center.destroy()
    })

    it('handles fetch errors gracefully', async () => {
      const fetchNotifications = vi.fn(() => Promise.reject(new Error('Network error')))
      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      // Should not throw
      await center.loadMore()

      expect(center.getNotifications()).toEqual([])
      expect(center.isLoading()).toBe(false)
      center.destroy()
    })

    it('respects custom page size from config', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult()))
      const p = createDefaultProvider({ defaultPageSize: 5 })
      const center = p.createNotificationCenter(createOptions({ fetchNotifications }))

      await center.loadMore()

      expect(fetchNotifications).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 5,
      })
      center.destroy()
    })
  })

  describe('refresh', () => {
    it('clears existing notifications and fetches fresh', async () => {
      const fetchNotifications = vi
        .fn<(opts: FetchOptions) => Promise<PaginatedResult<AppNotification>>>()
        .mockResolvedValueOnce(makePaginatedResult([makeNotification({ id: '1' })]))
        .mockResolvedValueOnce(makePaginatedResult([makeNotification({ id: '2' })]))
      const fetchUnreadCount = vi.fn().mockResolvedValueOnce(3)

      const center = provider.createNotificationCenter(
        createOptions({ fetchNotifications, fetchUnreadCount }),
      )

      await center.loadMore()
      expect(center.getNotifications()[0].id).toBe('1')

      await center.refresh()
      expect(center.getNotifications()).toHaveLength(1)
      expect(center.getNotifications()[0].id).toBe('2')
      expect(center.getUnreadCount()).toBe(3)
      center.destroy()
    })

    it('handles refresh errors gracefully', async () => {
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications: vi
            .fn()
            .mockResolvedValueOnce(makePaginatedResult([makeNotification({ id: '1' })]))
            .mockRejectedValueOnce(new Error('fail')),
          fetchUnreadCount: vi.fn().mockResolvedValue(0),
        }),
      )

      await center.loadMore()
      await center.refresh()

      // After failed refresh, state is reset
      expect(center.isLoading()).toBe(false)
      center.destroy()
    })
  })

  describe('markAsRead', () => {
    it('marks a notification as read and decrements count', async () => {
      const center = provider.createNotificationCenter(createOptions())
      await center.loadMore()

      // Manually set up state through refresh
      const fetchNotifications = vi.fn(() =>
        Promise.resolve(makePaginatedResult([makeNotification({ id: 'n1', read: false })])),
      )
      const fetchUnreadCount = vi.fn(() => Promise.resolve(1))
      const markAsRead = vi.fn(() => Promise.resolve())

      const center2 = provider.createNotificationCenter(
        createOptions({ fetchNotifications, fetchUnreadCount, markAsRead }),
      )
      await center2.refresh()

      expect(center2.getUnreadCount()).toBe(1)

      await center2.markAsRead('n1')

      expect(markAsRead).toHaveBeenCalledWith('n1')
      expect(center2.getUnreadCount()).toBe(0)
      expect(center2.getNotifications()[0].read).toBe(true)

      center.destroy()
      center2.destroy()
    })

    it('does not decrement unread count for already-read notification', async () => {
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications: vi.fn(() =>
            Promise.resolve(makePaginatedResult([makeNotification({ id: 'n1', read: true })])),
          ),
          fetchUnreadCount: vi.fn(() => Promise.resolve(0)),
        }),
      )
      await center.refresh()

      await center.markAsRead('n1')
      expect(center.getUnreadCount()).toBe(0)
      center.destroy()
    })

    it('emits state update after marking as read', async () => {
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications: vi.fn(() =>
            Promise.resolve(makePaginatedResult([makeNotification({ id: 'n1', read: false })])),
          ),
          fetchUnreadCount: vi.fn(() => Promise.resolve(1)),
        }),
      )
      await center.refresh()

      const updates: NotificationCenterState[] = []
      center.onUpdate((state) => updates.push(state))

      await center.markAsRead('n1')

      expect(updates.length).toBeGreaterThanOrEqual(1)
      const last = updates[updates.length - 1]
      expect(last.unreadCount).toBe(0)
      center.destroy()
    })
  })

  describe('markAllAsRead', () => {
    it('marks all notifications as read and sets unread to 0', async () => {
      const markAllAsRead = vi.fn(() => Promise.resolve())
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications: vi.fn(() =>
            Promise.resolve(
              makePaginatedResult([
                makeNotification({ id: '1', read: false }),
                makeNotification({ id: '2', read: false }),
              ]),
            ),
          ),
          fetchUnreadCount: vi.fn(() => Promise.resolve(2)),
          markAllAsRead,
        }),
      )
      await center.refresh()

      expect(center.getUnreadCount()).toBe(2)

      await center.markAllAsRead()

      expect(markAllAsRead).toHaveBeenCalledOnce()
      expect(center.getUnreadCount()).toBe(0)
      expect(center.getNotifications().every((n) => n.read)).toBe(true)
      center.destroy()
    })
  })

  describe('subscriptions', () => {
    it('onUpdate registers a handler', async () => {
      const handler = vi.fn()
      const center = provider.createNotificationCenter(createOptions())
      center.onUpdate(handler)

      await center.loadMore()

      expect(handler).toHaveBeenCalled()
      center.destroy()
    })

    it('offUpdate removes a handler', async () => {
      const handler = vi.fn()
      const center = provider.createNotificationCenter(createOptions())
      center.onUpdate(handler)
      center.offUpdate(handler)

      await center.loadMore()

      expect(handler).not.toHaveBeenCalled()
      center.destroy()
    })

    it('multiple subscribers receive updates', async () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      const center = provider.createNotificationCenter(createOptions())
      center.onUpdate(h1)
      center.onUpdate(h2)

      await center.loadMore()

      expect(h1).toHaveBeenCalled()
      expect(h2).toHaveBeenCalled()
      center.destroy()
    })
  })

  describe('polling', () => {
    it('polls at the configured interval', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult([])))
      const fetchUnreadCount = vi.fn(() => Promise.resolve(0))
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications,
          fetchUnreadCount,
          pollInterval: 5000,
        }),
      )

      // Initial: no fetch yet (only on loadMore/refresh)
      expect(fetchNotifications).not.toHaveBeenCalled()

      // Advance timer
      await vi.advanceTimersByTimeAsync(5000)
      expect(fetchNotifications).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(5000)
      expect(fetchNotifications).toHaveBeenCalledTimes(2)

      center.destroy()
    })

    it('does not poll when pollInterval is 0', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult([])))
      const center = provider.createNotificationCenter(
        createOptions({ fetchNotifications, pollInterval: 0 }),
      )

      await vi.advanceTimersByTimeAsync(10000)
      expect(fetchNotifications).not.toHaveBeenCalled()

      center.destroy()
    })

    it('does not poll when pollInterval is undefined', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult([])))
      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      await vi.advanceTimersByTimeAsync(10000)
      expect(fetchNotifications).not.toHaveBeenCalled()

      center.destroy()
    })

    it('poll detects new notifications and calls onNotification', async () => {
      const onNotification = vi.fn()
      const fetchNotifications = vi.fn(() =>
        Promise.resolve(makePaginatedResult([makeNotification({ id: 'poll-1' })])),
      )
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications,
          fetchUnreadCount: vi.fn(() => Promise.resolve(1)),
          onNotification,
          pollInterval: 5000,
        }),
      )

      await vi.advanceTimersByTimeAsync(5000)

      expect(onNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'poll-1' }))
      center.destroy()
    })

    it('poll skips refreshUnreadOnPoll when disabled', async () => {
      const fetchUnreadCount = vi.fn(() => Promise.resolve(0))
      const p = createDefaultProvider({ refreshUnreadOnPoll: false })
      const center = p.createNotificationCenter(
        createOptions({
          fetchNotifications: vi.fn(() => Promise.resolve(makePaginatedResult([]))),
          fetchUnreadCount,
          pollInterval: 5000,
        }),
      )

      await vi.advanceTimersByTimeAsync(5000)

      expect(fetchUnreadCount).not.toHaveBeenCalled()
      center.destroy()
    })

    it('stops polling on destroy', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult([])))
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications,
          fetchUnreadCount: vi.fn(() => Promise.resolve(0)),
          pollInterval: 5000,
        }),
      )

      center.destroy()

      await vi.advanceTimersByTimeAsync(10000)
      expect(fetchNotifications).not.toHaveBeenCalled()
    })
  })

  describe('realtime', () => {
    it('receives notifications via realtime adapter', () => {
      const realtime = createMockRealtime()
      const onNotification = vi.fn()
      const center = provider.createNotificationCenter(createOptions({ realtime, onNotification }))

      realtime.emit('notification', {
        id: 'rt-1',
        type: 'mention',
        title: 'Mentioned',
        body: 'You were mentioned',
        read: false,
        createdAt: new Date('2026-01-15T12:00:00Z'),
      })

      expect(center.getNotifications()).toHaveLength(1)
      expect(center.getNotifications()[0].id).toBe('rt-1')
      expect(center.getUnreadCount()).toBe(1)
      expect(onNotification).toHaveBeenCalledOnce()
      center.destroy()
    })

    it('uses custom realtimeEvent name', () => {
      const realtime = createMockRealtime()
      const center = provider.createNotificationCenter(
        createOptions({ realtime, realtimeEvent: 'custom-event' }),
      )

      realtime.emit('custom-event', {
        id: 'rt-2',
        type: 'invite',
        title: 'Invited',
        body: 'You were invited',
        read: false,
        createdAt: new Date('2026-01-15T12:00:00Z'),
      })

      expect(center.getNotifications()).toHaveLength(1)
      center.destroy()
    })

    it('deduplicates realtime notifications', () => {
      const realtime = createMockRealtime()
      const center = provider.createNotificationCenter(createOptions({ realtime }))

      const notification = {
        id: 'rt-dup',
        type: 'comment',
        title: 'Comment',
        body: 'New comment',
        read: false,
        createdAt: new Date('2026-01-15T12:00:00Z'),
      }

      realtime.emit('notification', notification)
      realtime.emit('notification', notification)

      expect(center.getNotifications()).toHaveLength(1)
      center.destroy()
    })

    it('does not increment unread for already-read realtime notifications', () => {
      const realtime = createMockRealtime()
      const center = provider.createNotificationCenter(createOptions({ realtime }))

      realtime.emit('notification', {
        id: 'rt-read',
        type: 'comment',
        title: 'Comment',
        body: 'New comment',
        read: true,
        createdAt: new Date('2026-01-15T12:00:00Z'),
      })

      expect(center.getUnreadCount()).toBe(0)
      center.destroy()
    })

    it('ignores invalid realtime payloads', () => {
      const realtime = createMockRealtime()
      const center = provider.createNotificationCenter(createOptions({ realtime }))

      realtime.emit('notification', null)
      realtime.emit('notification', 'not-an-object')
      realtime.emit('notification', { noId: true })
      realtime.emit('notification', { id: 123, title: 'bad id type' })

      expect(center.getNotifications()).toHaveLength(0)
      center.destroy()
    })

    it('removes realtime listener on destroy', () => {
      const realtime = createMockRealtime()
      const center = provider.createNotificationCenter(createOptions({ realtime }))

      center.destroy()

      realtime.emit('notification', {
        id: 'after-destroy',
        type: 'comment',
        title: 'Should not appear',
        body: 'Ignored',
        read: false,
        createdAt: new Date(),
      })

      // Handler was removed, but the mock might still emit. The handler
      // checks `destroyed` flag, so nothing should be added.
      expect(center.getNotifications()).toEqual([])
    })

    it('emits state update on realtime notification', () => {
      const realtime = createMockRealtime()
      const center = provider.createNotificationCenter(createOptions({ realtime }))

      const updates: NotificationCenterState[] = []
      center.onUpdate((state) => updates.push(state))

      realtime.emit('notification', {
        id: 'rt-emit',
        type: 'comment',
        title: 'Comment',
        body: 'Body',
        read: false,
        createdAt: new Date('2026-01-15T12:00:00Z'),
      })

      expect(updates).toHaveLength(1)
      expect(updates[0].notifications).toHaveLength(1)
      expect(updates[0].unreadCount).toBe(1)
      center.destroy()
    })
  })

  describe('destroy', () => {
    it('clears all state', async () => {
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications: vi.fn(() =>
            Promise.resolve(makePaginatedResult([makeNotification({ id: '1' })])),
          ),
          fetchUnreadCount: vi.fn(() => Promise.resolve(1)),
        }),
      )
      await center.refresh()

      center.destroy()

      expect(center.getNotifications()).toEqual([])
      expect(center.getUnreadCount()).toBe(0)
      expect(center.hasMore()).toBe(false)
      expect(center.isLoading()).toBe(false)
    })

    it('clears all subscribers', async () => {
      const handler = vi.fn()
      const center = provider.createNotificationCenter(createOptions())
      center.onUpdate(handler)

      center.destroy()

      // Subsequent operations should not trigger handler
      // (loadMore/refresh return early when destroyed)
      expect(handler).not.toHaveBeenCalled()
    })

    it('is idempotent', () => {
      const center = provider.createNotificationCenter(createOptions())
      center.destroy()
      expect(() => center.destroy()).not.toThrow()
    })

    it('prevents loadMore after destroy', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult()))
      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      center.destroy()
      await center.loadMore()

      expect(fetchNotifications).not.toHaveBeenCalled()
    })

    it('prevents refresh after destroy', async () => {
      const fetchNotifications = vi.fn(() => Promise.resolve(makePaginatedResult()))
      const center = provider.createNotificationCenter(createOptions({ fetchNotifications }))

      center.destroy()
      await center.refresh()

      expect(fetchNotifications).not.toHaveBeenCalled()
    })

    it('prevents markAsRead after destroy', async () => {
      const markAsRead = vi.fn(() => Promise.resolve())
      const center = provider.createNotificationCenter(createOptions({ markAsRead }))

      center.destroy()
      await center.markAsRead('any')

      expect(markAsRead).not.toHaveBeenCalled()
    })

    it('prevents markAllAsRead after destroy', async () => {
      const markAllAsRead = vi.fn(() => Promise.resolve())
      const center = provider.createNotificationCenter(createOptions({ markAllAsRead }))

      center.destroy()
      await center.markAllAsRead()

      expect(markAllAsRead).not.toHaveBeenCalled()
    })
  })

  describe('getNotifications returns copies', () => {
    it('mutations to returned array do not affect internal state', async () => {
      const center = provider.createNotificationCenter(
        createOptions({
          fetchNotifications: vi.fn(() =>
            Promise.resolve(makePaginatedResult([makeNotification({ id: '1' })])),
          ),
          fetchUnreadCount: vi.fn(() => Promise.resolve(1)),
        }),
      )
      await center.refresh()

      const arr = center.getNotifications()
      arr.length = 0

      expect(center.getNotifications()).toHaveLength(1)
      center.destroy()
    })
  })
})
