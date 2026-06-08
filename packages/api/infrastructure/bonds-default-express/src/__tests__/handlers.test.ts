import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthzResult,
  getParamId,
  getUserId,
  internalError,
  requireOwnership,
  requireUser,
  requireUserOwnership,
  validationError,
} from '../handlers.js'

vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _vars: unknown, opts: { defaultValue?: string } = {}) =>
    opts.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { error: vi.fn() },
}))

function mockRes(): Response & {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  locals: { session?: { userId?: string } }
} {
  const res: Partial<Response> & { locals: { session?: { userId?: string } } } = {
    locals: {},
  }
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
    locals: { session?: { userId?: string } }
  }
}

describe('getUserId', () => {
  it('returns the userId from res.locals.session', () => {
    const res = mockRes()
    res.locals.session = { userId: 'abc' }
    expect(getUserId(res)).toBe('abc')
  })

  it('returns null when no session', () => {
    expect(getUserId(mockRes())).toBeNull()
  })
})

describe('requireUser', () => {
  it('returns the userId when session present', () => {
    const res = mockRes()
    res.locals.session = { userId: 'u1' }
    expect(requireUser(res)).toBe('u1')
    expect(res.status).not.toHaveBeenCalled()
  })

  it('writes 401 + returns null when missing', () => {
    const res = mockRes()
    expect(requireUser(res)).toBeNull()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
  })
})

describe('getParamId', () => {
  it('returns the param value directly', () => {
    const req = { params: { id: 'abc' } } as unknown as Request
    expect(getParamId(req)).toBe('abc')
  })

  it('returns the first element when express provides string[]', () => {
    const req = { params: { id: ['first', 'second'] } } as unknown as Request
    expect(getParamId(req)).toBe('first')
  })

  it('honors the custom name argument', () => {
    const req = { params: { otherId: 'xyz' } } as unknown as Request
    expect(getParamId(req, 'otherId')).toBe('xyz')
  })
})

describe('requireOwnership', () => {
  beforeEach(async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockReset()
  })

  it('returns ok:true with the row when caller owns it', async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'r1',
      owner_id: 'u1',
    })
    const result: AuthzResult<{ id: string; owner_id: string }> = await requireOwnership(
      'projects',
      'r1',
      'u1',
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.row.id).toBe('r1')
  })

  it('returns 404 when row missing', async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const result = await requireOwnership('projects', 'missing', 'u1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(404)
  })

  it('returns 404 (not 403) when row is owned by a different user — no IDOR leak', async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'r1',
      owner_id: 'other-user',
    })
    const result = await requireOwnership('projects', 'r1', 'u1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(404)
  })
})

describe('requireUserOwnership', () => {
  beforeEach(async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockReset()
  })

  it('verifies via user_id column', async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'n1',
      user_id: 'u1',
    })
    const result = await requireUserOwnership('notifications', 'n1', 'u1')
    expect(result.ok).toBe(true)
  })

  it('returns 404 when user_id mismatches', async () => {
    const { findById } = await import('@molecule/api-database')
    ;(findById as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'n1',
      user_id: 'someone-else',
    })
    const result = await requireUserOwnership('notifications', 'n1', 'u1')
    expect(result.ok).toBe(false)
  })
})

describe('validationError', () => {
  it('writes 400 with the issues payload', () => {
    const res = mockRes()
    validationError(res, [{ path: 'email', message: 'required' }])
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      issues: [{ path: 'email', message: 'required' }],
    })
  })
})

describe('internalError', () => {
  it('writes 500 + logs the cause', async () => {
    const res = mockRes()
    const { logger } = await import('@molecule/api-logger')
    const err = new Error('db down')
    internalError(res, err)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(logger.error).toHaveBeenCalledWith(err)
  })

  it('logs a placeholder when called without an underlying cause', async () => {
    const res = mockRes()
    const { logger } = await import('@molecule/api-logger')
    ;(logger.error as ReturnType<typeof vi.fn>).mockReset()
    internalError(res)
    expect(logger.error).toHaveBeenCalled()
  })
})
