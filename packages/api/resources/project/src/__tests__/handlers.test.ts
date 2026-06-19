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

import { authUser } from '../authorizers/authUser.js'
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

    it('should return 401 when session has no userId', async () => {
      const req = mockReq({
        body: { name: 'Test', projectType: 'api' },
      })
      const res = mockRes({ locals: { session: {} } })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'user.error.unauthorized' }),
      )
    })

    it('should return 401 when session is missing entirely', async () => {
      const req = mockReq({
        body: { name: 'Test', projectType: 'api' },
      })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'user.error.unauthorized' }),
      )
    })

    it('should use userId from session, not from request body', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '1', slug: 'test' } })

      const req = mockReq({
        body: {
          name: 'Test',
          projectType: 'api',
          userId: 'attacker-supplied-user-id',
        },
      })
      // Session has the real userId.
      const res = mockRes({ locals: { session: { userId: 'session-user-id' } } })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      // Verify the userId passed to the database create call is from the session.
      expect(mockCreate).toHaveBeenCalledWith(
        'projects',
        expect.objectContaining({
          userId: 'session-user-id',
        }),
      )
      // Ensure the attacker-supplied userId was NOT used.
      const createArgs = mockCreate.mock.calls[0][1] as Record<string, unknown>
      expect(createArgs.userId).not.toBe('attacker-supplied-user-id')
    })

    it('should use session userId over body userId in all cases', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '2', slug: 'another' } })

      const req = mockReq({
        body: {
          name: 'Another',
          projectType: 'full-stack',
          userId: 'body-user-id',
        },
      })
      const res = mockRes() // default session has userId: 'user-1'

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      const createArgs = mockCreate.mock.calls[0][1] as Record<string, unknown>
      expect(createArgs.userId).toBe('user-1')
    })
  })

  describe('list', () => {
    it('should return only the caller projects, scoped by session userId, newest first', async () => {
      const projects = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]
      mockFindMany.mockResolvedValue(projects)

      const req = mockReq()
      const res = mockRes() // default session userId: 'user-1'

      await list(req, res)

      // Scoped to the caller's userId — never an unscoped full-tenant dump.
      expect(mockFindMany).toHaveBeenCalledWith('projects', {
        where: [{ field: 'userId', operator: '=', value: 'user-1' }],
        orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      })
      expect(res.json).toHaveBeenCalledWith(projects)
    })

    it('should scope to the calling session, not another tenant (M6-3 regression)', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq()
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await list(req, res)

      // The where-clause userId is taken from the session, so a caller can only
      // ever query their own rows — they cannot enumerate another tenant's.
      const [, options] = mockFindMany.mock.calls[0] as [string, { where: unknown[] }]
      expect(options.where).toEqual([{ field: 'userId', operator: '=', value: 'attacker' }])
    })

    it('should return 401 when there is no authenticated session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindMany).not.toHaveBeenCalled()
    })
  })

  describe('read', () => {
    it('should return a project the caller owns (owner-scoped lookup)', async () => {
      const project = { id: '1', userId: 'user-1', name: 'Test' }
      mockFindOne.mockResolvedValue(project)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      // Lookup is scoped to BOTH the id and the session userId.
      expect(mockFindOne).toHaveBeenCalledWith('projects', [
        { field: 'id', operator: '=', value: '1' },
        { field: 'userId', operator: '=', value: 'user-1' },
      ])
      expect(res.json).toHaveBeenCalledWith(project)
    })

    it('should reuse the authUser-preloaded row without a second query', async () => {
      const project = { id: '1', userId: 'user-1', name: 'Test' }

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes({ locals: { session: { userId: 'user-1' }, project } })

      await read(req, res)

      expect(mockFindOne).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(project)
    })

    it('should return 404 for a project owned by a different user (M6-3 regression)', async () => {
      // Owner-scoped findOne returns nothing for a non-owner — existence is not leaked.
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'other-users-project' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 'victim' }))
    })

    it('should return 404 when project not found', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 401 when there is no authenticated session', async () => {
      const req = mockReq({ params: { id: '1' } })
      const res = mockRes({ locals: {} })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindOne).not.toHaveBeenCalled()
    })
  })

  describe('authUser (object-level authorization)', () => {
    it('should call next and stash the owned row on res.locals.project', async () => {
      const project = { id: '1', userId: 'user-1', name: 'Mine' }
      mockFindOne.mockResolvedValue(project)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()
      const next = vi.fn()

      await authUser(req, res, next)

      expect(mockFindOne).toHaveBeenCalledWith('projects', [
        { field: 'id', operator: '=', value: '1' },
        { field: 'userId', operator: '=', value: 'user-1' },
      ])
      expect(res.locals.project).toEqual(project)
      expect(next).toHaveBeenCalledWith()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should 403 for a project owned by a different user (M6-3 regression)', async () => {
      // The owner-scoped lookup returns nothing because the project belongs to
      // someone else; the request is rejected and never reaches the handler.
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'victim-project' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })
      const next = vi.fn()

      await authUser(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'project.error.forbidden' }),
      )
      expect(res.locals.project).toBeUndefined()
    })

    it('should 401 when there is no authenticated session', async () => {
      const req = mockReq({ params: { id: '1' } })
      const res = mockRes({ locals: {} })
      const next = vi.fn()

      await authUser(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindOne).not.toHaveBeenCalled()
    })

    it('should fail closed (403) when the lookup throws', async () => {
      mockFindOne.mockRejectedValue(new Error('DB down'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()
      const next = vi.fn()

      await authUser(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
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

    it('should merge incoming settings/envVars keys onto existing ones (not overwrite)', async () => {
      mockFindById.mockResolvedValue({
        id: '1',
        settings: { planModel: 'Claude Opus', executeModel: 'DeepSeek', maxToolLoops: 40 },
        envVars: { EXISTING: 'keep' },
      })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { settings: { effortLevel: 'L' }, envVars: { API_KEY: 'abc' } },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(JSON.parse(updateData.settings as string)).toEqual({
        planModel: 'Claude Opus',
        executeModel: 'DeepSeek',
        maxToolLoops: 40,
        effortLevel: 'L',
      })
      expect(JSON.parse(updateData.envVars as string)).toEqual({
        EXISTING: 'keep',
        API_KEY: 'abc',
      })
    })

    it('should parse a stringified settings column before merging (SQLite/MySQL text)', async () => {
      // Non-Postgres bonds hand back the JSON bag as a raw string, not an object.
      mockFindById.mockResolvedValue({
        id: '1',
        settings: '{"planModel":"Claude Opus"}',
      })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { settings: { effortLevel: 'XL' } },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(JSON.parse(updateData.settings as string)).toEqual({
        planModel: 'Claude Opus',
        effortLevel: 'XL',
      })
    })

    it('should not clobber sibling settings across sequential single-key PATCHes (SYN5/SYN6)', async () => {
      // Stateful column: each PATCH persists, the next read sees it — mirroring
      // the JSONB round-trip the IDE slash-commands rely on between requests.
      let stored: Record<string, unknown> = {}
      mockFindById.mockImplementation(async () => ({ id: '1', settings: stored }))
      mockUpdateById.mockImplementation(
        async (_table: string, _id: string, data: Record<string, unknown>) => {
          stored = JSON.parse(data.settings as string) as Record<string, unknown>
          return { data: { id: '1', settings: stored } }
        },
      )

      // /model --plan, /model --execute, /effort L, /maxloops 80, /autofix off
      await update(
        mockReq({ params: { id: '1' }, body: { settings: { planModel: 'Claude Opus' } } }),
        mockRes(),
      )
      await update(
        mockReq({ params: { id: '1' }, body: { settings: { executeModel: 'DeepSeek' } } }),
        mockRes(),
      )
      await update(
        mockReq({ params: { id: '1' }, body: { settings: { effortLevel: 'L' } } }),
        mockRes(),
      )
      await update(
        mockReq({ params: { id: '1' }, body: { settings: { maxToolLoops: 80 } } }),
        mockRes(),
      )
      await update(
        mockReq({ params: { id: '1' }, body: { settings: { autoFix: false } } }),
        mockRes(),
      )

      expect(stored).toEqual({
        planModel: 'Claude Opus',
        executeModel: 'DeepSeek',
        effortLevel: 'L',
        maxToolLoops: 80,
        autoFix: false,
      })
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
