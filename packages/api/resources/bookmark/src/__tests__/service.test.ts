const { mockCount, mockCreate, mockDeleteMany, mockFindMany, mockFindOne } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteMany: mockDeleteMany,
  findMany: mockFindMany,
  findOne: mockFindOne,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addBookmark, getBookmarks, getFolders, isBookmarked, removeBookmark } from '../service.js'
import type { Bookmark } from '../types.js'

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b-1',
    userId: 'user-1',
    resourceType: 'post',
    resourceId: 'p-1',
    folder: null,
    createdAt: '2026-05-13T08:00:00.000Z',
    updatedAt: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('addBookmark (idempotent)', () => {
  it('returns existing bookmark without creating a new one', async () => {
    mockFindOne.mockResolvedValue(makeBookmark())
    const out = await addBookmark('user-1', 'post', 'p-1')
    expect(out.id).toBe('b-1')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('scopes the existence check by userId + resourceType + resourceId', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: makeBookmark() })
    await addBookmark('user-1', 'post', 'p-99')
    expect(mockFindOne.mock.calls[0][1]).toEqual([
      { field: 'userId', operator: '=', value: 'user-1' },
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'resourceId', operator: '=', value: 'p-99' },
    ])
  })

  it('creates a new bookmark when none exists', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: makeBookmark({ id: 'b-new' }) })
    const out = await addBookmark('user-1', 'post', 'p-1', 'reading-list')
    expect(out.id).toBe('b-new')
    expect(mockCreate.mock.calls[0][1]).toMatchObject({
      userId: 'user-1',
      resourceType: 'post',
      resourceId: 'p-1',
      folder: 'reading-list',
    })
  })

  it('folder defaults to null when omitted', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: makeBookmark() })
    await addBookmark('user-1', 'post', 'p-1')
    expect(mockCreate.mock.calls[0][1].folder).toBeNull()
  })
})

describe('removeBookmark', () => {
  it('issues a deleteMany scoped to (user, resourceType, resourceId)', async () => {
    mockDeleteMany.mockResolvedValue({ affected: 1 })
    await removeBookmark('user-1', 'post', 'p-1')
    expect(mockDeleteMany.mock.calls[0][1]).toEqual([
      { field: 'userId', operator: '=', value: 'user-1' },
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'resourceId', operator: '=', value: 'p-1' },
    ])
  })
})

describe('getBookmarks', () => {
  it('paginates with defaults limit=20, offset=0; orders createdAt desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getBookmarks('user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.limit).toBe(20)
    expect(args.offset).toBe(0)
    expect(args.orderBy).toEqual([{ field: 'createdAt', direction: 'desc' }])
  })

  it('passes through explicit limit + offset', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getBookmarks('user-1', { limit: 50, offset: 100 })
    expect(mockFindMany.mock.calls[0][1].limit).toBe(50)
    expect(mockFindMany.mock.calls[0][1].offset).toBe(100)
  })

  it('applies resourceType + folder filters when provided', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getBookmarks('user-1', { resourceType: 'post', folder: 'reading-list' })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'resourceType', operator: '=', value: 'post' })
    expect(where).toContainEqual({ field: 'folder', operator: '=', value: 'reading-list' })
  })

  it('returns total alongside data', async () => {
    mockFindMany.mockResolvedValue([makeBookmark()])
    mockCount.mockResolvedValue(42)
    const out = await getBookmarks('user-1')
    expect(out.total).toBe(42)
    expect(out.data).toHaveLength(1)
  })
})

describe('isBookmarked', () => {
  it('true when findOne returns a row', async () => {
    mockFindOne.mockResolvedValue(makeBookmark())
    expect(await isBookmarked('user-1', 'post', 'p-1')).toBe(true)
  })

  it('false when findOne returns null', async () => {
    mockFindOne.mockResolvedValue(null)
    expect(await isBookmarked('user-1', 'post', 'p-1')).toBe(false)
  })
})

describe('getFolders', () => {
  it('returns unique non-null folder names sorted alphabetically', async () => {
    mockFindMany.mockResolvedValue([
      makeBookmark({ folder: 'zebras' }),
      makeBookmark({ folder: 'apples' }),
      makeBookmark({ folder: null }), // filtered out
      makeBookmark({ folder: 'apples' }), // dedup
      makeBookmark({ folder: 'mangoes' }),
    ])
    const out = await getFolders('user-1')
    expect(out).toEqual(['apples', 'mangoes', 'zebras'])
  })

  it('returns [] when user has no bookmarks', async () => {
    mockFindMany.mockResolvedValue([])
    expect(await getFolders('user-1')).toEqual([])
  })

  it('returns [] when no bookmarks have folders', async () => {
    mockFindMany.mockResolvedValue([makeBookmark({ folder: null }), makeBookmark({ folder: null })])
    expect(await getFolders('user-1')).toEqual([])
  })
})
