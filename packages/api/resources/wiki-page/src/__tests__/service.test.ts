const {
  mockCount,
  mockCreate,
  mockDeleteById,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockUpdateById,
  mockHasSearch,
  mockIndex,
} = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteById: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockHasSearch: vi.fn(),
  mockIndex: vi.fn(),
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

vi.mock('@molecule/api-search', () => ({
  hasProvider: mockHasSearch,
  index: mockIndex,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  countPagesInSpace,
  createPage,
  deletePage,
  getAccessibleSpace,
  getBreadcrumbs,
  getPageById,
  getPageBySlug,
  listPagesInSpace,
  updatePage,
} from '../service.js'
import type { WikiPageRow, WikiSpaceRow } from '../types.js'

function makePage(overrides: Partial<WikiPageRow> = {}): WikiPageRow {
  return {
    id: 'p-1',
    space_id: 'sp-1',
    parent_id: null,
    slug: 'home',
    title: 'Home',
    body: '# hello',
    position: 0,
    is_published: false,
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

function makeSpace(overrides: Partial<WikiSpaceRow> = {}): WikiSpaceRow {
  return {
    id: 'sp-1',
    owner_id: 'user-1',
    is_public: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHasSearch.mockReturnValue(false) // default off — search is decorative
})

describe('getAccessibleSpace', () => {
  it('returns null for missing space', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getAccessibleSpace('sp-1', 'user-1')).toBeNull()
  })

  it('returns null for private space owned by someone else', async () => {
    mockFindById.mockResolvedValue(makeSpace({ owner_id: 'other', is_public: false }))
    expect(await getAccessibleSpace('sp-1', 'user-1')).toBeNull()
  })

  it('returns the space for its owner', async () => {
    mockFindById.mockResolvedValue(makeSpace())
    const out = await getAccessibleSpace('sp-1', 'user-1')
    expect(out?.id).toBe('sp-1')
  })

  it('returns a public space even when caller is not owner', async () => {
    mockFindById.mockResolvedValue(makeSpace({ owner_id: 'other', is_public: true }))
    const out = await getAccessibleSpace('sp-1', 'user-1')
    expect(out?.id).toBe('sp-1')
  })
})

describe('listPagesInSpace', () => {
  it('scopes by space_id', async () => {
    mockFindMany.mockResolvedValue([])
    await listPagesInSpace('sp-1')
    expect(mockFindMany.mock.calls[0][1].where).toEqual([
      { field: 'space_id', operator: '=', value: 'sp-1' },
    ])
  })

  it('parent_id=null uses is_null operator (find root pages)', async () => {
    mockFindMany.mockResolvedValue([])
    await listPagesInSpace('sp-1', { parent_id: null })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'parent_id', operator: 'is_null' })
  })

  it('parent_id="x" uses equality (find children of x)', async () => {
    mockFindMany.mockResolvedValue([])
    await listPagesInSpace('sp-1', { parent_id: 'p-parent' })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'parent_id', operator: '=', value: 'p-parent' })
  })

  it('parent_id undefined adds no parent filter (returns all pages)', async () => {
    mockFindMany.mockResolvedValue([])
    await listPagesInSpace('sp-1')
    const where = mockFindMany.mock.calls[0][1].where
    expect(where.some((c: { field: string }) => c.field === 'parent_id')).toBe(false)
  })

  it('is_published filter applied only when boolean', async () => {
    mockFindMany.mockResolvedValue([])
    await listPagesInSpace('sp-1', { is_published: true })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'is_published', operator: '=', value: true })
  })

  it('orders by position asc then created_at asc', async () => {
    mockFindMany.mockResolvedValue([])
    await listPagesInSpace('sp-1')
    expect(mockFindMany.mock.calls[0][1].orderBy).toEqual([
      { field: 'position', direction: 'asc' },
      { field: 'created_at', direction: 'asc' },
    ])
  })
})

describe('getPageById / getPageBySlug', () => {
  it('getPageById passes through findById', async () => {
    mockFindById.mockResolvedValue(makePage())
    const out = await getPageById('p-1')
    expect(out?.id).toBe('p-1')
  })

  it('getPageBySlug scopes by space_id + slug', async () => {
    mockFindOne.mockResolvedValue(makePage({ slug: 'guide' }))
    await getPageBySlug('sp-1', 'guide')
    expect(mockFindOne.mock.calls[0][1]).toEqual([
      { field: 'space_id', operator: '=', value: 'sp-1' },
      { field: 'slug', operator: '=', value: 'guide' },
    ])
  })
})

describe('getBreadcrumbs', () => {
  it('returns root-first trail by walking parent_id', async () => {
    // Tree: root → mid → leaf
    const root = makePage({ id: 'root', slug: 'root', title: 'Root', parent_id: null })
    const mid = makePage({ id: 'mid', slug: 'mid', title: 'Mid', parent_id: 'root' })
    const leaf = makePage({ id: 'leaf', slug: 'leaf', title: 'Leaf', parent_id: 'mid' })
    mockFindById.mockImplementation((_table: string, id: string) =>
      Promise.resolve({ leaf, mid, root }[id] ?? null),
    )
    const trail = await getBreadcrumbs('leaf')
    expect(trail.map((b) => b.id)).toEqual(['root', 'mid', 'leaf'])
    expect(trail[0].title).toBe('Root')
    expect(trail[2].title).toBe('Leaf')
  })

  it('returns just the page itself when it has no parent', async () => {
    mockFindById.mockResolvedValue(makePage())
    expect(await getBreadcrumbs('p-1')).toEqual([{ id: 'p-1', slug: 'home', title: 'Home' }])
  })

  it('returns empty trail for missing page', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getBreadcrumbs('missing')).toEqual([])
  })

  it('respects maxDepth to prevent infinite loops on cyclic parent_id', async () => {
    // Cycle: a → b → a → b ...
    const a = makePage({ id: 'a', parent_id: 'b' })
    const b = makePage({ id: 'b', parent_id: 'a' })
    mockFindById.mockImplementation((_table: string, id: string) =>
      Promise.resolve({ a, b }[id] ?? null),
    )
    const trail = await getBreadcrumbs('a', 3)
    expect(trail.length).toBeLessThanOrEqual(3)
  })
})

describe('createPage', () => {
  it('defaults body="", position=0, is_published=false, parent_id=null', async () => {
    mockCreate.mockResolvedValue({ data: makePage() })
    await createPage({ space_id: 'sp-1', slug: 'x', title: 'X' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.body).toBe('')
    expect(payload.position).toBe(0)
    expect(payload.is_published).toBe(false)
    expect(payload.parent_id).toBeNull()
  })

  it('preserves provided body / position / is_published / parent_id', async () => {
    mockCreate.mockResolvedValue({ data: makePage() })
    await createPage({
      space_id: 'sp-1',
      slug: 'x',
      title: 'X',
      body: '# yo',
      position: 5,
      is_published: true,
      parent_id: 'parent',
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.body).toBe('# yo')
    expect(payload.position).toBe(5)
    expect(payload.is_published).toBe(true)
    expect(payload.parent_id).toBe('parent')
  })

  it('skips search indexing when search provider is absent', async () => {
    mockHasSearch.mockReturnValue(false)
    mockCreate.mockResolvedValue({ data: makePage() })
    await createPage({ space_id: 'sp-1', slug: 'x', title: 'X' })
    expect(mockIndex).not.toHaveBeenCalled()
  })

  it('indexes via search bond when provider is present', async () => {
    mockHasSearch.mockReturnValue(true)
    mockCreate.mockResolvedValue({ data: makePage({ id: 'p-new', title: 'New' }) })
    mockIndex.mockResolvedValue(undefined)
    await createPage({ space_id: 'sp-1', slug: 'x', title: 'New' })
    expect(mockIndex).toHaveBeenCalledWith(
      'wiki_pages',
      'p-new',
      expect.objectContaining({ title: 'New' }),
    )
  })

  it('swallows search indexing errors (best-effort)', async () => {
    mockHasSearch.mockReturnValue(true)
    mockIndex.mockRejectedValue(new Error('search down'))
    mockCreate.mockResolvedValue({ data: makePage() })
    // Must not throw
    await expect(createPage({ space_id: 'sp-1', slug: 'x', title: 'X' })).resolves.toBeDefined()
  })
})

describe('updatePage', () => {
  it('returns the refreshed row and reindexes when search is on', async () => {
    mockHasSearch.mockReturnValue(true)
    mockFindById.mockResolvedValue(makePage({ title: 'Updated' }))
    mockUpdateById.mockResolvedValue({ data: {} })
    mockIndex.mockResolvedValue(undefined)
    const out = await updatePage('p-1', { title: 'Updated' })
    expect(out?.title).toBe('Updated')
    expect(mockIndex).toHaveBeenCalled()
  })

  it('skips reindex when row is missing post-update', async () => {
    mockHasSearch.mockReturnValue(true)
    mockFindById.mockResolvedValue(null)
    mockUpdateById.mockResolvedValue({ data: {} })
    const out = await updatePage('p-1', { title: 'X' })
    expect(out).toBeNull()
    expect(mockIndex).not.toHaveBeenCalled()
  })
})

describe('deletePage', () => {
  it('recursively deletes children before parent', async () => {
    // p-1 has children c1, c2; c1 has grandchild gc1; c2 has none.
    mockFindMany.mockImplementation((_table: string, q: { where: Array<{ value: string }> }) => {
      const parent = q.where[0].value
      if (parent === 'p-1') return Promise.resolve([{ id: 'c1' }, { id: 'c2' }])
      if (parent === 'c1') return Promise.resolve([{ id: 'gc1' }])
      return Promise.resolve([])
    })
    mockDeleteById.mockResolvedValue({ affected: 1 })
    await deletePage('p-1')
    const deletedOrder = mockDeleteById.mock.calls.map((c) => c[1])
    // grandchild first, then children, then parent
    expect(deletedOrder.indexOf('gc1')).toBeLessThan(deletedOrder.indexOf('c1'))
    expect(deletedOrder.indexOf('c1')).toBeLessThan(deletedOrder.indexOf('p-1'))
    expect(deletedOrder.indexOf('c2')).toBeLessThan(deletedOrder.indexOf('p-1'))
  })

  it('returns true after deletion (no-op safe)', async () => {
    mockFindMany.mockResolvedValue([])
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deletePage('p-1')).toBe(true)
  })
})

describe('countPagesInSpace', () => {
  it('counts scoped to space_id', async () => {
    mockCount.mockResolvedValue(13)
    expect(await countPagesInSpace('sp-1')).toBe(13)
    expect(mockCount.mock.calls[0][1]).toEqual([
      { field: 'space_id', operator: '=', value: 'sp-1' },
    ])
  })
})
