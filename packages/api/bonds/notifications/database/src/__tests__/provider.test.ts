import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificationCenterProvider } from '@molecule/api-notification-center'

import { createProvider } from '../provider.js'

/* ------------------------------------------------------------------ */
/*  Mock DataStore                                                     */
/* ------------------------------------------------------------------ */

const mockStore = {
  findById: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  updateMany: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
}

vi.mock('@molecule/api-database', () => ({
  getStore: (): typeof mockStore => mockStore,
}))

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-notification-center-database', () => {
  let provider: NotificationCenterProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = createProvider()
  })

  describe('send', () => {
    it('creates a notification in the database', async () => {
      mockStore.create.mockResolvedValueOnce({
        data: {
          id: 'notif-1',
          user_id: 'user-1',
          type: 'system',
          title: 'Welcome',
          body: 'Hello!',
          read: false,
          data: null,
          created_at: '2026-03-28T00:00:00.000Z',
        },
        affected: 1,
      })

      const result = await provider.send('user-1', {
        type: 'system',
        title: 'Welcome',
        body: 'Hello!',
      })

      expect(mockStore.create).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          user_id: 'user-1',
          type: 'system',
          title: 'Welcome',
          body: 'Hello!',
          read: false,
        }),
      )
      expect(result.userId).toBe('user-1')
      expect(result.title).toBe('Welcome')
      expect(result.read).toBe(false)
    })

    it('stores notification data as JSON', async () => {
      mockStore.create.mockResolvedValueOnce({ data: null, affected: 1 })

      await provider.send('user-1', {
        type: 'alert',
        title: 'Alert',
        body: 'Something happened',
        data: { severity: 'high' },
      })

      expect(mockStore.create).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          data: JSON.stringify({ severity: 'high' }),
        }),
      )
    })

    it('returns fallback notification when create returns no data', async () => {
      mockStore.create.mockResolvedValueOnce({ data: null, affected: 1 })

      const result = await provider.send('user-1', {
        type: 'system',
        title: 'Test',
        body: 'Body',
      })

      expect(result.userId).toBe('user-1')
      expect(result.type).toBe('system')
      expect(result.id).toBeTruthy()
    })
  })

  describe('sendBulk', () => {
    it('sends notifications to multiple users', async () => {
      mockStore.create
        .mockResolvedValueOnce({ data: null, affected: 1 })
        .mockResolvedValueOnce({ data: null, affected: 1 })

      const results = await provider.sendBulk([
        { userId: 'user-1', notification: { type: 'test', title: 'A', body: 'B' } },
        { userId: 'user-2', notification: { type: 'test', title: 'C', body: 'D' } },
      ])

      expect(results).toHaveLength(2)
      expect(mockStore.create).toHaveBeenCalledTimes(2)
    })
  })

  describe('getAll', () => {
    it('queries notifications for a user', async () => {
      mockStore.findMany.mockResolvedValueOnce([
        {
          id: 'notif-1',
          user_id: 'user-1',
          type: 'system',
          title: 'Test',
          body: 'Body',
          read: false,
          data: null,
          created_at: '2026-03-28T00:00:00.000Z',
        },
      ])
      mockStore.count.mockResolvedValueOnce(1)

      const result = await provider.getAll('user-1')

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.items[0].userId).toBe('user-1')
      expect(mockStore.findMany).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          where: [{ field: 'user_id', operator: '=', value: 'user-1' }],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
        }),
      )
    })

    it('applies read filter', async () => {
      mockStore.findMany.mockResolvedValueOnce([])
      mockStore.count.mockResolvedValueOnce(0)

      await provider.getAll('user-1', { read: false })

      expect(mockStore.findMany).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          where: expect.arrayContaining([{ field: 'read', operator: '=', value: false }]),
        }),
      )
    })

    it('applies type filter', async () => {
      mockStore.findMany.mockResolvedValueOnce([])
      mockStore.count.mockResolvedValueOnce(0)

      await provider.getAll('user-1', { type: 'alert' })

      expect(mockStore.findMany).toHaveBeenCalledWith(
        'notifications',
        expect.objectContaining({
          where: expect.arrayContaining([{ field: 'type', operator: '=', value: 'alert' }]),
        }),
      )
    })

    it('applies pagination options', async () => {
      mockStore.findMany.mockResolvedValueOnce([])
      mockStore.count.mockResolvedValueOnce(0)

      const result = await provider.getAll('user-1', { limit: 10, offset: 20 })

      expect(result.limit).toBe(10)
      expect(result.offset).toBe(20)
    })
  })

  describe('getUnreadCount', () => {
    it('counts unread notifications for a user', async () => {
      mockStore.count.mockResolvedValueOnce(5)

      const count = await provider.getUnreadCount('user-1')

      expect(count).toBe(5)
      expect(mockStore.count).toHaveBeenCalledWith('notifications', [
        { field: 'user_id', operator: '=', value: 'user-1' },
        { field: 'read', operator: '=', value: false },
      ])
    })
  })

  describe('markRead', () => {
    it('updates notification read status', async () => {
      mockStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })

      await provider.markRead('notif-1')

      expect(mockStore.updateById).toHaveBeenCalledWith('notifications', 'notif-1', { read: true })
    })
  })

  describe('markAllRead', () => {
    it('updates all unread notifications for a user', async () => {
      mockStore.updateMany.mockResolvedValueOnce({ data: null, affected: 3 })

      await provider.markAllRead('user-1')

      expect(mockStore.updateMany).toHaveBeenCalledWith(
        'notifications',
        [
          { field: 'user_id', operator: '=', value: 'user-1' },
          { field: 'read', operator: '=', value: false },
        ],
        { read: true },
      )
    })
  })

  describe('delete', () => {
    it('deletes a notification by id', async () => {
      mockStore.deleteById.mockResolvedValueOnce({ data: null, affected: 1 })

      await provider.delete('notif-1')

      expect(mockStore.deleteById).toHaveBeenCalledWith('notifications', 'notif-1')
    })
  })

  describe('getPreferences', () => {
    it('returns stored preferences', async () => {
      mockStore.findOne.mockResolvedValueOnce({
        id: 'pref-1',
        user_id: 'user-1',
        email: true,
        push: false,
        sms: true,
        channels: { marketing: false },
      })

      const prefs = await provider.getPreferences('user-1')

      expect(prefs.email).toBe(true)
      expect(prefs.push).toBe(false)
      expect(prefs.sms).toBe(true)
      expect(prefs.channels).toEqual({ marketing: false })
    })

    it('returns default preferences when none exist', async () => {
      mockStore.findOne.mockResolvedValueOnce(null)

      const prefs = await provider.getPreferences('user-1')

      expect(prefs.email).toBe(true)
      expect(prefs.push).toBe(true)
      expect(prefs.sms).toBe(false)
      expect(prefs.channels).toEqual({})
    })
  })

  describe('setPreferences', () => {
    it('updates existing preferences', async () => {
      mockStore.findOne.mockResolvedValueOnce({ id: 'pref-1', user_id: 'user-1' })
      mockStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })

      await provider.setPreferences('user-1', { email: false })

      expect(mockStore.updateById).toHaveBeenCalledWith(
        'notification_preferences',
        'pref-1',
        expect.objectContaining({ email: false }),
      )
    })

    it('creates preferences when none exist', async () => {
      mockStore.findOne.mockResolvedValueOnce(null)
      mockStore.create.mockResolvedValueOnce({ data: null, affected: 1 })

      await provider.setPreferences('user-1', { sms: true })

      expect(mockStore.create).toHaveBeenCalledWith(
        'notification_preferences',
        expect.objectContaining({
          user_id: 'user-1',
          sms: true,
          email: true,
          push: true,
        }),
      )
    })
  })

  describe('custom table names', () => {
    it('uses custom table names from config', async () => {
      const customProvider = createProvider({
        tableName: 'custom_notifications',
        preferencesTableName: 'custom_prefs',
      })

      mockStore.count.mockResolvedValueOnce(0)
      await customProvider.getUnreadCount('user-1')

      expect(mockStore.count).toHaveBeenCalledWith('custom_notifications', expect.any(Array))

      mockStore.findOne.mockResolvedValueOnce(null)
      await customProvider.getPreferences('user-1')

      expect(mockStore.findOne).toHaveBeenCalledWith('custom_prefs', expect.any(Array))
    })
  })
})
