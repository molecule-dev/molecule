const { mockCreate, mockFindOne, mockFindMany, mockFindById, mockUpdateById, mockDeleteById } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockDeleteById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@molecule/api-bond', () => ({
  getAnalytics: () => ({
    identify: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    page: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
  }
  return res
}

describe('@molecule/api-resource-project handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 400 when name is missing', async () => {
      const req = mockReq({ body: { projectType: 'api' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'project.error.nameAndTypeRequired' }),
      )
    })

    it('should return 400 when projectType is missing', async () => {
      const req = mockReq({ body: { name: 'Test' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should create project with slugified name', async () => {
      mockFindOne.mockResolvedValue(null) // No slug collision
      mockCreate.mockResolvedValue({ data: { id: '1', slug: 'my-project' } })

      const req = mockReq({
        body: { name: 'My Project!', projectType: 'api', userId: 'user-1' },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'projects',
        expect.objectContaining({
          name: 'My Project!',
          slug: 'my-project',
          projectType: 'api',
        }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('should append timestamp suffix on slug collision', async () => {
      mockFindOne.mockResolvedValue({ id: 'existing', slug: 'my-project' })
      mockCreate.mockResolvedValue({ data: { id: '2', slug: 'my-project-abc123' } })

      const req = mockReq({
        body: { name: 'My Project', projectType: 'api', userId: 'user-1' },
      })
      const res = mockRes()

      await create(req, res)

      const createdSlug = mockCreate.mock.calls[0][1].slug as string
      expect(createdSlug).toMatch(/^my-project-[a-z0-9]+$/)
    })

    it('should return 500 on database error', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        body: { name: 'Test', projectType: 'api', userId: 'user-1' },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('list', () => {
    it('should return all projects ordered by updatedAt', async () => {
      const projects = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]
      mockFindMany.mockResolvedValue(projects)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('projects', {
        orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      })
      expect(res.json).toHaveBeenCalledWith(projects)
    })
  })

  describe('read', () => {
    it('should return project by id', async () => {
      const project = { id: '1', name: 'Test' }
      mockFindById.mockResolvedValue(project)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(project)
    })

    it('should return 404 when project not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('update', () => {
    it('should return 404 when project not found', async () => {
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
      expect(updateData.settings).toBeUndefined()
    })

    it('should JSON.stringify settings and envVars', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { settings: { theme: 'dark' }, envVars: { API_KEY: 'abc' } },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.settings).toBe('{"theme":"dark"}')
      expect(updateData.envVars).toBe('{"API_KEY":"abc"}')
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
    it('should return 404 when project not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should delete project and return 204', async () => {
      mockFindById.mockResolvedValue({ id: '1' })
      mockDeleteById.mockResolvedValue(undefined)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('projects', '1')
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
})
