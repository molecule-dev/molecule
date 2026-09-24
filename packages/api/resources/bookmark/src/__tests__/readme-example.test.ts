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

import { addBookmark, getBookmarks, isBookmarked } from '../index.js'

describe('README @example', () => {
  it('bonds the store, adds a bookmark, checks it and lists the folder', async () => {
    const row = {
      id: 'b-1',
      userId: 'user-123',
      resourceType: 'post',
      resourceId: 'post-42',
      folder: 'reading-list',
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(row)
    fakeStore.create.mockResolvedValueOnce({ data: row, affected: 1 })
    fakeStore.findMany.mockResolvedValueOnce([row])
    fakeStore.count.mockResolvedValueOnce(1)

    setStore(store)

    const userId = 'user-123'
    const bookmark = await addBookmark(userId, 'post', 'post-42', 'reading-list')
    const saved = await isBookmarked(userId, 'post', 'post-42')
    const page = await getBookmarks(userId, { folder: 'reading-list' })

    expect(bookmark.id).toBe('b-1')
    expect(fakeStore.create).toHaveBeenCalledWith('bookmarks', {
      userId: 'user-123',
      resourceType: 'post',
      resourceId: 'post-42',
      folder: 'reading-list',
    })
    expect(saved).toBe(true)
    expect(page).toEqual({ data: [row], total: 1, limit: 20, offset: 0 })
  })
})
