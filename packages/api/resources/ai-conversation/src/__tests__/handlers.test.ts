const { mockCreate, mockFindOne, mockUpdateById, mockDeleteById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
}))

const { mockGetProvider } = vi.hoisted(() => ({
  mockGetProvider: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-ai', () => ({
  getProvider: mockGetProvider,
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

import { authUser, ensureProjectAccess } from '../authorizers/authUser.js'
import { chat } from '../handlers/create.js'
import { clear } from '../handlers/del.js'
import { history } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

/** The project row the authenticated caller (`user-1`) owns. */
const OWNED_PROJECT = { id: 'proj-1', userId: 'user-1' }

/**
 * Routes `findOne` so the object-level `projects` ownership lookup succeeds for
 * the owning caller while the `conversations` lookup returns the per-test value.
 * Lets the existing handler-behavior tests run past the new auth guard.
 */
function withConversation(conversation: unknown): void {
  mockFindOne.mockImplementation(async (table: string) =>
    table === 'projects' ? OWNED_PROJECT : conversation,
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: { projectId: 'proj-1' },
    body: {},
    on: vi.fn(),
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
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    // Authenticated owner by default; tests override `locals` to drop the session.
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

describe('@molecule/api-resource-ai-conversation handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: the caller owns the project and no conversation exists yet.
    withConversation(null)
  })

  describe('history', () => {
    it('should return empty messages when no conversation exists', async () => {
      withConversation(null)

      const req = mockReq()
      const res = mockRes()

      await history(req, res)

      expect(res.json).toHaveBeenCalledWith({ messages: [] })
    })

    it('should return conversation messages', async () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' },
      ]
      withConversation({ messages })

      const req = mockReq()
      const res = mockRes()

      await history(req, res)

      expect(res.json).toHaveBeenCalledWith({ messages })
    })
  })

  describe('read', () => {
    it('should return conversation', async () => {
      const conversation = { id: 'conv-1', projectId: 'proj-1', messages: [] }
      withConversation(conversation)

      const req = mockReq()
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(conversation)
    })

    it('should return 404 when not found', async () => {
      withConversation(null)

      const req = mockReq()
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('update', () => {
    it('should return 404 when conversation not found', async () => {
      withConversation(null)

      const req = mockReq({ body: { aiContext: { system: 'Be helpful' } } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should update aiContext', async () => {
      withConversation({ id: 'conv-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'conv-1' } })

      const req = mockReq({ body: { aiContext: { system: 'Be helpful' } } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.aiContext).toBe('{"system":"Be helpful"}')
      expect(updateData.updatedAt).toBeDefined()
    })

    it('should not update aiContext when not provided', async () => {
      withConversation({ id: 'conv-1' })
      mockUpdateById.mockResolvedValue({ data: { id: 'conv-1' } })

      const req = mockReq({ body: {} })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.aiContext).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should return 204 when no conversation exists', async () => {
      withConversation(null)

      const req = mockReq()
      const res = mockRes()

      await clear(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('should delete conversation and return 204', async () => {
      withConversation({ id: 'conv-1' })
      mockDeleteById.mockResolvedValue(undefined)

      const req = mockReq()
      const res = mockRes()

      await clear(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('conversations', 'conv-1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  // SYSREG-1: the chat/history/clear routes declared only the phantom
  // `authenticate` token (stripped by codegen), shipping ungated → unauthenticated
  // AI cost abuse + cross-tenant IDOR. Every handler now fails closed inline.
  describe('object-level authorization (SYSREG-1 regression)', () => {
    describe('no authenticated session → 401', () => {
      it('history fails closed without ever hitting the DB', async () => {
        const req = mockReq()
        const res = mockRes({ locals: {} })

        await history(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'conversation.error.unauthorized' }),
        )
        expect(mockFindOne).not.toHaveBeenCalled()
      })

      it('clear fails closed and never deletes', async () => {
        const req = mockReq()
        const res = mockRes({ locals: {} })

        await clear(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(mockFindOne).not.toHaveBeenCalled()
        expect(mockDeleteById).not.toHaveBeenCalled()
      })

      it('chat fails closed and never calls the AI provider (no cost abuse)', async () => {
        const req = mockReq({ body: { message: 'hi' } })
        const res = mockRes({ locals: {} })

        await chat(req, res)

        expect(res.status).toHaveBeenCalledWith(401)
        expect(mockFindOne).not.toHaveBeenCalled()
        expect(mockGetProvider).not.toHaveBeenCalled()
      })
    })

    describe("non-owner project → 403 (can't touch another tenant)", () => {
      beforeEach(() => {
        // The owner-scoped `projects` lookup returns nothing → not authorized.
        mockFindOne.mockResolvedValue(null)
      })

      it('history is rejected before reading any conversation', async () => {
        const req = mockReq({ params: { projectId: 'victim-project' } })
        const res = mockRes({ locals: { session: { userId: 'attacker' } } })

        await history(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'conversation.error.forbidden' }),
        )
        // Only the ownership lookup ran; the conversation was never fetched.
        expect(mockFindOne).toHaveBeenCalledTimes(1)
        expect(mockFindOne).toHaveBeenCalledWith('projects', [
          { field: 'id', operator: '=', value: 'victim-project' },
          { field: 'userId', operator: '=', value: 'attacker' },
        ])
      })

      it('clear is rejected and never deletes', async () => {
        const req = mockReq({ params: { projectId: 'victim-project' } })
        const res = mockRes({ locals: { session: { userId: 'attacker' } } })

        await clear(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(mockDeleteById).not.toHaveBeenCalled()
      })

      it('chat is rejected and never calls the AI provider', async () => {
        const req = mockReq({ params: { projectId: 'victim-project' }, body: { message: 'hi' } })
        const res = mockRes({ locals: { session: { userId: 'attacker' } } })

        await chat(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(mockGetProvider).not.toHaveBeenCalled()
      })
    })

    describe('owner → success (legitimate flow still works)', () => {
      it('history returns the owned conversation', async () => {
        const messages = [{ role: 'user', content: 'Hi', timestamp: '2024-01-01T00:00:00Z' }]
        withConversation({ messages })

        const req = mockReq()
        const res = mockRes()

        await history(req, res)

        expect(res.json).toHaveBeenCalledWith({ messages })
      })

      it('chat passes auth and reaches handler validation', async () => {
        // Owner is authorized; empty message → the handler's own 400, proving the
        // auth guard let it through (not a 401/403) without invoking the provider.
        withConversation(null)

        const req = mockReq({ body: {} })
        const res = mockRes()

        await chat(req, res)

        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errorKey: 'conversation.error.messageRequired' }),
        )
      })
    })
  })

  describe('authUser / ensureProjectAccess (middleware)', () => {
    it('should call next and stash the owned row on res.locals.project', async () => {
      mockFindOne.mockResolvedValue(OWNED_PROJECT)

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await authUser(req, res, next)

      expect(mockFindOne).toHaveBeenCalledWith('projects', [
        { field: 'id', operator: '=', value: 'proj-1' },
        { field: 'userId', operator: '=', value: 'user-1' },
      ])
      expect(res.locals.project).toEqual(OWNED_PROJECT)
      expect(next).toHaveBeenCalledWith()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should 403 for a project owned by a different user', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq({ params: { projectId: 'victim-project' } })
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })
      const next = vi.fn()

      await authUser(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'conversation.error.forbidden' }),
      )
      expect(res.locals.project).toBeUndefined()
    })

    it('should 401 when there is no authenticated session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      const next = vi.fn()

      await authUser(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockFindOne).not.toHaveBeenCalled()
    })

    it('should fail closed (403) when the lookup throws', async () => {
      mockFindOne.mockRejectedValue(new Error('DB down'))

      const req = mockReq()
      const res = mockRes()
      const next = vi.fn()

      await authUser(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('ensureProjectAccess returns true and stashes the row for owners', async () => {
      mockFindOne.mockResolvedValue(OWNED_PROJECT)

      const req = mockReq()
      const res = mockRes()

      const allowed = await ensureProjectAccess(req, res)

      expect(allowed).toBe(true)
      expect(res.locals.project).toEqual(OWNED_PROJECT)
    })

    it('ensureProjectAccess returns false for non-owners', async () => {
      mockFindOne.mockResolvedValue(null)

      const req = mockReq()
      const res = mockRes({ locals: { session: { userId: 'attacker' } } })

      const allowed = await ensureProjectAccess(req, res)

      expect(allowed).toBe(false)
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})
