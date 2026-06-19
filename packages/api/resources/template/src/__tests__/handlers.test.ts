const { mockGetTemplate, mockUpdateTemplate, mockDeleteTemplate, mockInstantiateTemplate } =
  vi.hoisted(() => ({
    mockGetTemplate: vi.fn(),
    mockUpdateTemplate: vi.fn(),
    mockDeleteTemplate: vi.fn(),
    mockInstantiateTemplate: vi.fn(),
  }))

vi.mock('../service.js', () => ({
  getTemplate: mockGetTemplate,
  updateTemplate: mockUpdateTemplate,
  deleteTemplate: mockDeleteTemplate,
  instantiateTemplate: mockInstantiateTemplate,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { del } from '../handlers/del.js'
import { instantiate } from '../handlers/instantiate.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: { id: 't1' },
    body: {},
    query: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(session: unknown = { userId: 'owner-1' }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session },
  }
  return res
}

const OWNER = 'owner-1'
const OTHER = 'attacker-2'

const PRIVATE_TPL = {
  id: 't1',
  resourceType: 'doc',
  slug: 'starter',
  name: 'Starter',
  description: null,
  snapshot: { greet: 'Hi {{name}}' },
  variables: [],
  tags: [],
  version: 1,
  isPublic: false,
  createdBy: OWNER,
}

const PUBLIC_TPL = { ...PRIVATE_TPL, id: 't2', isPublic: true, createdBy: OWNER }

describe('@molecule/api-resource-template — handler authorization (P5RES-01)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('read', () => {
    it('401 when no session', async () => {
      const res = mockRes(null)
      await read(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockGetTemplate).not.toHaveBeenCalled()
    })

    it('404 (IDOR blocked) when a non-owner reads a private template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      const res = mockRes({ userId: OTHER })
      await read(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'template.error.notFound' }),
      )
    })

    it('owner reads their private template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      const res = mockRes({ userId: OWNER })
      await read(mockReq(), res)
      expect(res.json).toHaveBeenCalledWith(PRIVATE_TPL)
      expect(res.status).not.toHaveBeenCalledWith(404)
    })

    it('any authenticated user reads a public template', async () => {
      mockGetTemplate.mockResolvedValue(PUBLIC_TPL)
      const res = mockRes({ userId: OTHER })
      await read(mockReq(), res)
      expect(res.json).toHaveBeenCalledWith(PUBLIC_TPL)
    })

    it('404 when the template does not exist', async () => {
      mockGetTemplate.mockResolvedValue(null)
      const res = mockRes({ userId: OWNER })
      await read(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('instantiate', () => {
    it('404 (IDOR blocked) when a non-owner instantiates a private template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      const res = mockRes({ userId: OTHER })
      await instantiate(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockInstantiateTemplate).not.toHaveBeenCalled()
    })

    it('owner instantiates their private template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      mockInstantiateTemplate.mockReturnValue({
        payload: { greet: 'Hi Ada' },
        resolvedVariables: { name: 'Ada' },
        missingVariables: [],
      })
      const res = mockRes({ userId: OWNER })
      await instantiate(mockReq({ body: { variables: { name: 'Ada' } } }), res)
      expect(mockInstantiateTemplate).toHaveBeenCalledWith(PRIVATE_TPL, { name: 'Ada' })
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { greet: 'Hi Ada' } }),
      )
    })
  })

  describe('update', () => {
    it('401 when no session', async () => {
      const res = mockRes(null)
      await update(mockReq({ body: { name: 'New' } }), res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockUpdateTemplate).not.toHaveBeenCalled()
    })

    it('403 (IDOR blocked) when a non-owner updates a template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      const res = mockRes({ userId: OTHER })
      await update(mockReq({ body: { name: 'Hijacked' } }), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'template.error.forbidden' }),
      )
      expect(mockUpdateTemplate).not.toHaveBeenCalled()
    })

    it('owner updates their template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      mockUpdateTemplate.mockResolvedValue({ ...PRIVATE_TPL, name: 'New', version: 2 })
      const res = mockRes({ userId: OWNER })
      await update(mockReq({ body: { name: 'New' } }), res)
      expect(mockUpdateTemplate).toHaveBeenCalledWith('t1', { name: 'New' })
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'New', version: 2 }))
    })

    it('404 when the template does not exist', async () => {
      mockGetTemplate.mockResolvedValue(null)
      const res = mockRes({ userId: OWNER })
      await update(mockReq({ body: { name: 'New' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockUpdateTemplate).not.toHaveBeenCalled()
    })
  })

  describe('del', () => {
    it('401 when no session', async () => {
      const res = mockRes(null)
      await del(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockDeleteTemplate).not.toHaveBeenCalled()
    })

    it('403 (IDOR blocked) when a non-owner deletes a template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      const res = mockRes({ userId: OTHER })
      await del(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'template.error.forbidden' }),
      )
      expect(mockDeleteTemplate).not.toHaveBeenCalled()
    })

    it('owner deletes their template', async () => {
      mockGetTemplate.mockResolvedValue(PRIVATE_TPL)
      mockDeleteTemplate.mockResolvedValue(true)
      const res = mockRes({ userId: OWNER })
      await del(mockReq(), res)
      expect(mockDeleteTemplate).toHaveBeenCalledWith('t1')
      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('404 when the template does not exist', async () => {
      mockGetTemplate.mockResolvedValue(null)
      const res = mockRes({ userId: OWNER })
      await del(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(mockDeleteTemplate).not.toHaveBeenCalled()
    })
  })
})
