const {
  mockCreate,
  mockFindOne,
  mockFindMany,
  mockFindById,
  mockUpdateById,
  mockDeleteById,
  mockDeleteMany,
  mockQuery,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockQuery: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
  deleteMany: mockDeleteMany,
  query: mockQuery,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@molecule/api-locales-tag', () => ({}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { addTag } from '../handlers/addTag.js'
import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { getBySlug } from '../handlers/getBySlug.js'
import { list } from '../handlers/list.js'
import { popular } from '../handlers/popular.js'
import { read } from '../handlers/read.js'
import { removeTag } from '../handlers/removeTag.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-resource-tag handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 400 when name is missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'tag.error.nameRequired' }),
      )
    })

    it('should return 400 when name is empty string', async () => {
      const req = mockReq({ body: { name: '   ' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when name produces empty slug', async () => {
      const req = mockReq({ body: { name: '!!!' } })
      const res = mockRes()

      mockFindOne.mockResolvedValue(null)
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'tag.error.invalidName' }),
      )
    })

    it('should create tag with slugified name', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '1', name: 'My Tag', slug: 'my-tag' } })

      const req = mockReq({ body: { name: 'My Tag!' } })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'tags',
        expect.objectContaining({
          name: 'My Tag!',
          slug: 'my-tag',
          color: null,
          description: null,
        }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should append timestamp suffix on slug collision', async () => {
      mockFindOne.mockResolvedValue({ id: 'existing', slug: 'my-tag' })
      mockCreate.mockResolvedValue({ data: { id: '2', slug: 'my-tag-abc' } })

      const req = mockReq({ body: { name: 'My Tag' } })
      const res = mockRes()

      await create(req, res)

      const createdSlug = mockCreate.mock.calls[0][1].slug as string
      expect(createdSlug).toMatch(/^my-tag-[a-z0-9]+$/)
    })

    it('should accept optional color and description', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        body: { name: 'Important', color: '#ff0000', description: 'High priority' },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'tags',
        expect.objectContaining({ color: '#ff0000', description: 'High priority' }),
      )
    })

    it('should return 500 on database error', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: { name: 'Test' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('read', () => {
    it('should return tag by id', async () => {
      const tag = { id: '1', name: 'Test', slug: 'test' }
      mockFindById.mockResolvedValue(tag)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(tag)
    })

    it('should return 404 when tag not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('list', () => {
    it('should return all tags ordered by name', async () => {
      const tags = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
      ]
      mockFindMany.mockResolvedValue(tags)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('tags', {
        orderBy: [{ field: 'name', direction: 'asc' }],
      })
      expect(res.json).toHaveBeenCalledWith(tags)
    })

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('update', () => {
    it('should return 404 when tag not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' }, body: { name: 'New' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update only provided fields', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1', name: 'Updated' } })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.name).toBe('Updated')
      expect(updateData.updatedAt).toBeDefined()
      expect(updateData.color).toBeUndefined()
      expect(updateData.description).toBeUndefined()
    })

    it('should update color and description', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { color: '#00ff00', description: 'Updated desc' },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.color).toBe('#00ff00')
      expect(updateData.description).toBe('Updated desc')
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockUpdateById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' }, body: { name: 'Test' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('del', () => {
    it('should return 404 when tag not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete tag and return 204', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockDeleteById.mockResolvedValue({ affected: 1 })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('tags', '1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockDeleteById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('popular', () => {
    it('should return popular tags with counts', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: '1', name: 'JavaScript', slug: 'javascript', color: null, count: '15' },
          { id: '2', name: 'TypeScript', slug: 'typescript', color: '#3178c6', count: '10' },
        ],
      })

      const req = mockReq()
      const res = mockRes()

      await popular(req, res)

      expect(res.json).toHaveBeenCalledWith([
        { id: '1', name: 'JavaScript', slug: 'javascript', color: null, count: 15 },
        { id: '2', name: 'TypeScript', slug: 'typescript', color: '#3178c6', count: 10 },
      ])
    })

    it('should respect limit query param', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const req = mockReq({ query: { limit: '5' } })
      const res = mockRes()

      await popular(req, res)

      expect(mockQuery.mock.calls[0][1]).toEqual([5])
    })

    it('should cap limit at 100', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const req = mockReq({ query: { limit: '500' } })
      const res = mockRes()

      await popular(req, res)

      expect(mockQuery.mock.calls[0][1]).toEqual([100])
    })

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await popular(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('addTag', () => {
    it('should return 400 when tagId is missing', async () => {
      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1' },
        body: {},
      })
      const res = mockRes()

      await addTag(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when tag does not exist', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1' },
        body: { tagId: 'nonexistent' },
      })
      const res = mockRes()

      await addTag(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return existing association if already tagged', async () => {
      mockFindById.mockResolvedValue({ id: 't1', name: 'Test' })
      const existing = { id: 'rt1', tagId: 't1', resourceType: 'project', resourceId: 'p1' }
      mockFindOne.mockResolvedValue(existing)

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1' },
        body: { tagId: 't1' },
      })
      const res = mockRes()

      await addTag(req, res)

      expect(res.json).toHaveBeenCalledWith(existing)
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should create new association', async () => {
      mockFindById.mockResolvedValue({ id: 't1', name: 'Test' })
      mockFindOne.mockResolvedValue(null)
      const created = { id: 'rt1', tagId: 't1', resourceType: 'project', resourceId: 'p1' }
      mockCreate.mockResolvedValue({ data: created })

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1' },
        body: { tagId: 't1' },
      })
      const res = mockRes()

      await addTag(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
    })

    it('should return 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: 't1' })
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1' },
        body: { tagId: 't1' },
      })
      const res = mockRes()

      await addTag(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('removeTag', () => {
    it('should return 404 when association not found', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 0 })

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1', tagId: 't1' },
      })
      const res = mockRes()

      await removeTag(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should remove association and return 204', async () => {
      mockDeleteMany.mockResolvedValue({ affected: 1 })

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1', tagId: 't1' },
      })
      const res = mockRes()

      await removeTag(req, res)

      expect(mockDeleteMany).toHaveBeenCalledWith('resource_tags', [
        { field: 'tagId', operator: '=', value: 't1' },
        { field: 'resourceType', operator: '=', value: 'project' },
        { field: 'resourceId', operator: '=', value: 'p1' },
      ])
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('should return 500 on database error', async () => {
      mockDeleteMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { resourceType: 'project', resourceId: 'p1', tagId: 't1' },
      })
      const res = mockRes()

      await removeTag(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getBySlug', () => {
    it('should return 404 when tag slug not found', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { slug: 'nonexistent' } })
      const res = mockRes()

      await getBySlug(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return tag with associated resources', async () => {
      const tag = { id: 't1', name: 'JavaScript', slug: 'javascript' }
      mockFindOne.mockResolvedValue(tag)
      mockFindMany.mockResolvedValue([
        {
          id: 'rt1',
          tagId: 't1',
          resourceType: 'project',
          resourceId: 'p1',
          createdAt: '2025-01-01',
        },
        {
          id: 'rt2',
          tagId: 't1',
          resourceType: 'product',
          resourceId: 'pr1',
          createdAt: '2025-01-02',
        },
      ])

      const req = mockReq({ params: { slug: 'javascript' } })
      const res = mockRes()

      await getBySlug(req, res)

      expect(res.json).toHaveBeenCalledWith({
        tag,
        resources: [
          { resourceType: 'project', resourceId: 'p1', taggedAt: '2025-01-01' },
          { resourceType: 'product', resourceId: 'pr1', taggedAt: '2025-01-02' },
        ],
      })
    })

    it('should filter by resourceType query param', async () => {
      const tag = { id: 't1', name: 'Test', slug: 'test' }
      mockFindOne.mockResolvedValue(tag)
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ params: { slug: 'test' }, query: { resourceType: 'project' } })
      const res = mockRes()

      await getBySlug(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('resource_tags', {
        where: [
          { field: 'tagId', operator: '=', value: 't1' },
          { field: 'resourceType', operator: '=', value: 'project' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      })
    })

    it('should return 500 on database error', async () => {
      mockFindOne.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { slug: 'test' } })
      const res = mockRes()

      await getBySlug(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
