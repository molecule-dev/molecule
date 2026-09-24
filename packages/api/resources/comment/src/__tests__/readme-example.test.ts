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

import { createComment, getCommentsByResource, getReplies } from '../index.js'

describe('README @example', () => {
  it('creates a comment and a reply as the session user, then reads thread and replies', async () => {
    const base = {
      resourceType: 'post',
      resourceId: 'post-42',
      userId: 'user-123',
      editedAt: null,
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
    }
    const top = { ...base, id: 'c-1', parentId: null, body: 'Great write-up!' }
    const reply = { ...base, id: 'c-2', parentId: 'c-1', body: 'Agreed' }
    fakeStore.create
      .mockResolvedValueOnce({ data: top, affected: 1 })
      .mockResolvedValueOnce({ data: reply, affected: 1 })
    fakeStore.findMany.mockResolvedValueOnce([top]).mockResolvedValueOnce([reply])
    fakeStore.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1)

    setStore(store)

    const userId = 'user-123'
    const created = await createComment('post', 'post-42', userId, { body: 'Great write-up!' })
    const createdReply = await createComment('post', 'post-42', userId, {
      body: 'Agreed',
      parentId: created.id,
    })
    const thread = await getCommentsByResource('post', 'post-42', { limit: 20 })
    const replies = await getReplies(created.id)

    expect(fakeStore.create).toHaveBeenLastCalledWith('comments', {
      resourceType: 'post',
      resourceId: 'post-42',
      userId: 'user-123',
      parentId: 'c-1',
      body: 'Agreed',
      editedAt: null,
    })
    expect(fakeStore.findMany.mock.calls[0]?.[1]?.where).toContainEqual({
      field: 'parentId',
      operator: 'is_null',
    })
    expect(thread).toEqual({ data: [top], total: 1, limit: 20, offset: 0 })
    expect(replies.data[0]?.id).toBe(createdReply.id)
  })
})
