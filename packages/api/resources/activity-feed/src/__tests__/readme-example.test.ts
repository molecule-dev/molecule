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

import { getTimeline, logActivity } from '../index.js'

describe('README @example', () => {
  it('bonds the store, logs an activity as the session actor and reads the timeline', async () => {
    const row = {
      id: 'a-1',
      actorId: 'user-123',
      action: 'commented',
      resourceType: 'post',
      resourceId: 'post-42',
      metadata: { excerpt: 'Great write-up!' },
      createdAt: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.create.mockResolvedValueOnce({ data: row, affected: 1 })
    fakeStore.findMany.mockResolvedValueOnce([row])
    fakeStore.count.mockResolvedValueOnce(1)

    setStore(store)

    const actorId = 'user-123'
    const activity = await logActivity(actorId, {
      action: 'commented',
      resourceType: 'post',
      resourceId: 'post-42',
      metadata: { excerpt: 'Great write-up!' },
    })
    const timeline = await getTimeline('post', 'post-42', { limit: 20 })

    expect(activity.id).toBe('a-1')
    expect(fakeStore.create).toHaveBeenCalledWith('activities', {
      actorId: 'user-123',
      action: 'commented',
      resourceType: 'post',
      resourceId: 'post-42',
      metadata: { excerpt: 'Great write-up!' },
    })
    expect(timeline).toEqual({ data: [row], total: 1, limit: 20, offset: 0 })
  })
})
