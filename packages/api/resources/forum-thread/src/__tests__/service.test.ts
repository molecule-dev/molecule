const {
  mockCount,
  mockCreate,
  mockDeleteById,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockUpdateById,
} = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteById: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  castVote,
  createReply,
  createThread,
  deleteReply,
  deleteThread,
  incrementViewCount,
  listThreads,
  updateThread,
} from '../service.js'
import type { ForumReplyRow, ForumThreadRow } from '../types.js'

function makeThread(overrides: Partial<ForumThreadRow> = {}): ForumThreadRow {
  return {
    id: 'th-1',
    author_id: 'user-1',
    category_id: null,
    title: 'Hello',
    body: 'Body',
    slug: 'hello',
    status: 'open',
    is_pinned: false,
    vote_score: 0,
    reply_count: 0,
    view_count: 0,
    last_activity_at: '2026-05-13T10:00:00.000Z',
    created_at: '2026-05-13T10:00:00.000Z',
    updated_at: '2026-05-13T10:00:00.000Z',
    ...overrides,
  }
}

function makeReply(overrides: Partial<ForumReplyRow> = {}): ForumReplyRow {
  return {
    id: 'rp-1',
    thread_id: 'th-1',
    parent_reply_id: null,
    author_id: 'user-1',
    body: 'reply body',
    vote_score: 0,
    is_deleted: false,
    created_at: '2026-05-13T10:00:00.000Z',
    updated_at: '2026-05-13T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listThreads sort modes', () => {
  it('default sorts by last_activity_at desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listThreads({})
    const orderBy = mockFindMany.mock.calls[0][1].orderBy
    expect(orderBy).toEqual([{ field: 'last_activity_at', direction: 'desc' }])
  })

  it('sort=top sorts by vote_score desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listThreads({ sort: 'top' })
    expect(mockFindMany.mock.calls[0][1].orderBy).toEqual([
      { field: 'vote_score', direction: 'desc' },
    ])
  })

  it('sort=pinned sorts by is_pinned then last_activity_at', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listThreads({ sort: 'pinned' })
    const orderBy = mockFindMany.mock.calls[0][1].orderBy
    expect(orderBy[0]).toEqual({ field: 'is_pinned', direction: 'desc' })
    expect(orderBy[1]).toEqual({ field: 'last_activity_at', direction: 'desc' })
  })
})

describe('createThread', () => {
  it('generates a slug from the title', async () => {
    mockCreate.mockResolvedValue({ data: makeThread() })
    await createThread('user-1', { title: 'Hello, World!  How are you?' })
    expect(mockCreate.mock.calls[0][1].slug).toBe('hello-world-how-are-you')
  })

  it('caps slug length at 120 chars', async () => {
    mockCreate.mockResolvedValue({ data: makeThread() })
    await createThread('user-1', { title: 'a'.repeat(200) })
    expect(mockCreate.mock.calls[0][1].slug.length).toBeLessThanOrEqual(120)
  })

  it('initialises with status=open, is_pinned=false, counts=0', async () => {
    mockCreate.mockResolvedValue({ data: makeThread() })
    await createThread('user-1', { title: 'New' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.status).toBe('open')
    expect(payload.is_pinned).toBe(false)
    expect(payload.vote_score).toBe(0)
    expect(payload.reply_count).toBe(0)
    expect(payload.view_count).toBe(0)
  })
})

describe('updateThread permission rules', () => {
  it('rejects non-author non-moderator', async () => {
    mockFindById.mockResolvedValue(makeThread({ author_id: 'user-2' }))
    expect(await updateThread('th-1', 'user-1', false, { title: 'x' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('allows author to edit own title/body', async () => {
    mockFindById
      .mockResolvedValueOnce(makeThread())
      .mockResolvedValueOnce(makeThread({ title: 'X' }))
    mockUpdateById.mockResolvedValue({ data: makeThread() })
    const out = await updateThread('th-1', 'user-1', false, { title: 'X' })
    expect(out?.title).toBe('X')
  })

  it('rejects author pinning the thread (moderator-only)', async () => {
    mockFindById.mockResolvedValue(makeThread())
    expect(await updateThread('th-1', 'user-1', false, { is_pinned: true })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('allows moderator to pin', async () => {
    mockFindById
      .mockResolvedValueOnce(makeThread({ author_id: 'other' }))
      .mockResolvedValueOnce(makeThread({ is_pinned: true }))
    mockUpdateById.mockResolvedValue({ data: makeThread() })
    const out = await updateThread('th-1', 'mod', true, { is_pinned: true })
    expect(out?.is_pinned).toBe(true)
  })

  it('allows moderator to close (status=locked)', async () => {
    mockFindById
      .mockResolvedValueOnce(makeThread({ author_id: 'other' }))
      .mockResolvedValueOnce(makeThread({ status: 'locked' }))
    mockUpdateById.mockResolvedValue({ data: makeThread() })
    const out = await updateThread('th-1', 'mod', true, { status: 'locked' })
    expect(out?.status).toBe('locked')
  })
})

describe('deleteThread', () => {
  it('rejects non-author non-moderator', async () => {
    mockFindById.mockResolvedValue(makeThread({ author_id: 'user-2' }))
    expect(await deleteThread('th-1', 'user-1', false)).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('allows author to delete own thread', async () => {
    mockFindById.mockResolvedValue(makeThread())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteThread('th-1', 'user-1', false)).toBe(true)
  })

  it('allows moderator to delete any thread', async () => {
    mockFindById.mockResolvedValue(makeThread({ author_id: 'other' }))
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteThread('th-1', 'mod', true)).toBe(true)
  })
})

describe('createReply', () => {
  it('refuses replies to locked threads', async () => {
    mockFindById.mockResolvedValue(makeThread({ status: 'locked' }))
    expect(await createReply('th-1', 'user-1', { body: 'late' })).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('refuses replies to archived threads', async () => {
    mockFindById.mockResolvedValue(makeThread({ status: 'archived' }))
    expect(await createReply('th-1', 'user-1', { body: 'too late' })).toBeNull()
  })

  it('bumps reply_count + last_activity_at on the thread', async () => {
    mockFindById.mockResolvedValue(makeThread({ reply_count: 5 }))
    mockCreate.mockResolvedValue({ data: makeReply() })
    mockUpdateById.mockResolvedValue({ data: {} })
    await createReply('th-1', 'user-2', { body: 'thoughts' })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.reply_count).toBe(6)
    expect(typeof patch.last_activity_at).toBe('string')
  })
})

describe('deleteReply (soft delete)', () => {
  it('refuses non-author non-moderator', async () => {
    mockFindById.mockResolvedValue(makeReply({ author_id: 'user-2' }))
    expect(await deleteReply('rp-1', 'user-1', false)).toBe(false)
  })

  it('soft-deletes by setting is_deleted=true + body=[deleted]', async () => {
    mockFindById.mockResolvedValue(makeReply())
    mockUpdateById.mockResolvedValue({ data: {} })
    expect(await deleteReply('rp-1', 'user-1', false)).toBe(true)
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.is_deleted).toBe(true)
    expect(patch.body).toBe('[deleted]')
    expect(mockDeleteById).not.toHaveBeenCalled() // soft, not hard
  })
})

describe('castVote (idempotent)', () => {
  it('creates a new vote row and increments score by value', async () => {
    mockFindById.mockResolvedValue({ vote_score: 0 })
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: {} })
    mockUpdateById.mockResolvedValue({ data: {} })
    const result = await castVote('user-1', 'thread', 'th-1', 1)
    expect(result?.score).toBe(1)
    expect(mockCreate).toHaveBeenCalled()
  })

  it('updates existing vote and adjusts score by delta (-1 → 1 = +2)', async () => {
    mockFindById.mockResolvedValue({ vote_score: 5 })
    mockFindOne.mockResolvedValue({ id: 'v-1', user_id: 'user-1', value: -1 })
    mockUpdateById.mockResolvedValue({ data: {} })
    const result = await castVote('user-1', 'thread', 'th-1', 1)
    // delta = 1 - (-1) = 2, new score = 5 + 2 = 7
    expect(result?.score).toBe(7)
  })

  it('is a noop when casting the same vote again', async () => {
    mockFindById.mockResolvedValue({ vote_score: 5 })
    mockFindOne.mockResolvedValue({ id: 'v-1', user_id: 'user-1', value: 1 })
    const result = await castVote('user-1', 'thread', 'th-1', 1)
    expect(result?.score).toBe(5) // no change
    expect(mockUpdateById).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ vote_score: expect.anything() }),
    )
  })

  it('returns null when target is missing', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await castVote('user-1', 'thread', 'missing', 1)).toBeNull()
  })
})

describe('incrementViewCount', () => {
  it('atomically increments view_count', async () => {
    mockFindById.mockResolvedValue(makeThread({ view_count: 42 }))
    mockUpdateById.mockResolvedValue({ data: {} })
    await incrementViewCount('th-1')
    expect(mockUpdateById.mock.calls[0][2]).toMatchObject({ view_count: 43 })
  })

  it('no-ops when thread is missing', async () => {
    mockFindById.mockResolvedValue(null)
    await incrementViewCount('missing')
    expect(mockUpdateById).not.toHaveBeenCalled()
  })
})
