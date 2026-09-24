/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import { describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import {
  getAll,
  getUnreadCount,
  markRead,
  send,
  setProvider,
} from '@molecule/api-notification-center'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the store and provider, sends, counts, lists and marks read', async () => {
    const row = {
      id: 'notif-1',
      user_id: 'user-123',
      type: 'order.shipped',
      title: 'Your order shipped',
      body: 'Order #1042 is on its way.',
      read: 0,
      data: '{"orderId":"1042"}',
      channels: null,
      created_at: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.create.mockImplementationOnce(
      async (_table: string, data: Record<string, unknown>) => ({
        data: { ...data, id: 'notif-1', read: 0 },
        affected: 1,
      }),
    )
    fakeStore.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    fakeStore.findMany.mockResolvedValueOnce([row])
    fakeStore.updateMany.mockResolvedValueOnce({ affected: 1 })

    setStore(store)
    setProvider(createProvider())

    const userId = 'user-123'
    const notification = await send(userId, {
      type: 'order.shipped',
      title: 'Your order shipped',
      body: 'Order #1042 is on its way.',
      data: { orderId: '1042' },
    })

    const unread = await getUnreadCount(userId)
    const page = await getAll(userId, { read: false, limit: 20 })
    const marked = await markRead(userId, notification.id)

    expect(notification).toMatchObject({
      id: 'notif-1',
      userId: 'user-123',
      title: 'Your order shipped',
      read: false,
      data: { orderId: '1042' },
    })
    expect(fakeStore.create).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ user_id: 'user-123', data: '{"orderId":"1042"}', read: false }),
    )
    expect(unread).toBe(1)
    expect(page.total).toBe(1)
    expect(page.limit).toBe(20)
    expect(page.items[0]).toMatchObject({ id: 'notif-1', read: false, data: { orderId: '1042' } })
    expect(marked).toBe(true)
    expect(fakeStore.updateMany).toHaveBeenCalledWith(
      'notifications',
      [
        { field: 'id', operator: '=', value: 'notif-1' },
        { field: 'user_id', operator: '=', value: 'user-123' },
      ],
      { read: true },
    )
  })
})
