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

import { follow, getFollowerCount, isFollowing, unfollow } from '../index.js'

describe('README @example', () => {
  it('follows as the session user, checks it, counts followers and unfollows', async () => {
    const row = {
      id: 'f-1',
      followerId: 'user-123',
      targetType: 'user',
      targetId: 'user-456',
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(row)
    fakeStore.create.mockResolvedValueOnce({ data: row, affected: 1 })
    fakeStore.count.mockResolvedValueOnce(1)
    fakeStore.deleteMany.mockResolvedValueOnce({ data: null, affected: 1 })

    setStore(store)

    const followerId = 'user-123'
    const created = await follow(followerId, 'user', 'user-456')
    const following = await isFollowing(followerId, 'user', 'user-456')
    const followers = await getFollowerCount('user', 'user-456')
    await unfollow(followerId, 'user', 'user-456')

    expect(created.id).toBe('f-1')
    expect(fakeStore.create).toHaveBeenCalledWith('follows', {
      followerId: 'user-123',
      targetType: 'user',
      targetId: 'user-456',
    })
    expect(following).toBe(true)
    expect(followers).toBe(1)
    expect(fakeStore.deleteMany).toHaveBeenCalledWith('follows', [
      { field: 'followerId', operator: '=', value: 'user-123' },
      { field: 'targetType', operator: '=', value: 'user' },
      { field: 'targetId', operator: '=', value: 'user-456' },
    ])
  })
})
