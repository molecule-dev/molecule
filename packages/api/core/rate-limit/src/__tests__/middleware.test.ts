import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MiddlewareModule from '../middleware.js'
import type * as ProviderModule from '../provider.js'
import type { RateLimitProvider, RateLimitResult } from '../types.js'

let createRateLimitMiddleware: typeof MiddlewareModule.createRateLimitMiddleware
let setProvider: typeof ProviderModule.setProvider

const makeResult = (overrides?: Partial<RateLimitResult>): RateLimitResult => ({
  allowed: true,
  remaining: 99,
  total: 100,
  resetAt: new Date('2026-01-01T00:01:00Z'),
  ...overrides,
})

const makeMockProvider = (overrides?: Partial<RateLimitProvider>): RateLimitProvider => ({
  check: vi.fn().mockResolvedValue(makeResult()),
  consume: vi.fn().mockResolvedValue(makeResult({ remaining: 98 })),
  reset: vi.fn().mockResolvedValue(undefined),
  getRemaining: vi.fn().mockResolvedValue(99),
  configure: vi.fn(),
  ...overrides,
})

const makeMockReq = (ip = '127.0.0.1'): { ip: string } => ({ ip })

const makeMockRes = (): { res: Record<string, unknown>; headers: Record<string, string> } => {
  const res: Record<string, unknown> = {}
  const headers: Record<string, string> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.set = vi.fn((key: string, value: string) => {
    headers[key] = value
    return res
  })
  return { res, headers }
}

describe('createRateLimitMiddleware', () => {
  beforeEach(async () => {
    vi.resetModules()
    const middlewareModule = await import('../middleware.js')
    const providerModule = await import('../provider.js')
    createRateLimitMiddleware = middlewareModule.createRateLimitMiddleware
    setProvider = providerModule.setProvider
  })

  it('should throw when no provider is set', async () => {
    const middleware = createRateLimitMiddleware()
    const req = makeMockReq()
    const { res } = makeMockRes()
    const next = vi.fn()

    await expect(middleware(req, res as never, next)).rejects.toThrow(
      'Rate-limit provider not configured',
    )
  })

  it('should call next when request is allowed', async () => {
    const mockConsume = vi.fn().mockResolvedValue(makeResult())
    setProvider(makeMockProvider({ consume: mockConsume }))

    const middleware = createRateLimitMiddleware()
    const req = makeMockReq('192.168.1.1')
    const { res } = makeMockRes()
    const next = vi.fn()

    await middleware(req, res as never, next)

    expect(mockConsume).toHaveBeenCalledWith('192.168.1.1')
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should set rate limit headers', async () => {
    const resetAt = new Date('2026-01-01T00:01:00Z')
    const mockConsume = vi
      .fn()
      .mockResolvedValue(makeResult({ remaining: 95, total: 100, resetAt }))
    setProvider(makeMockProvider({ consume: mockConsume }))

    const middleware = createRateLimitMiddleware()
    const req = makeMockReq()
    const { res } = makeMockRes()
    const next = vi.fn()

    await middleware(req, res as never, next)

    expect(res.set).toHaveBeenCalledWith('RateLimit-Limit', '100')
    expect(res.set).toHaveBeenCalledWith('RateLimit-Remaining', '95')
    expect(res.set).toHaveBeenCalledWith(
      'RateLimit-Reset',
      String(Math.ceil(resetAt.getTime() / 1000)),
    )
  })

  it('should return 429 when rate limit exceeded', async () => {
    const mockConsume = vi
      .fn()
      .mockResolvedValue(makeResult({ allowed: false, remaining: 0, retryAfter: 30 }))
    setProvider(makeMockProvider({ consume: mockConsume }))

    const middleware = createRateLimitMiddleware()
    const req = makeMockReq()
    const { res } = makeMockRes()
    const next = vi.fn()

    await middleware(req, res as never, next)

    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Too many requests. Please try again later.',
    })
    expect(res.set).toHaveBeenCalledWith('Retry-After', '30')
    expect(next).not.toHaveBeenCalled()
  })

  it('should apply options when provided', async () => {
    const mockConfigure = vi.fn()
    const mockConsume = vi.fn().mockResolvedValue(makeResult())
    setProvider(makeMockProvider({ configure: mockConfigure, consume: mockConsume }))

    const options = { windowMs: 60_000, max: 50 }
    const middleware = createRateLimitMiddleware(options)
    const req = makeMockReq()
    const { res } = makeMockRes()
    const next = vi.fn()

    await middleware(req, res as never, next)

    expect(mockConfigure).toHaveBeenCalledWith(options)
  })

  it('should use "unknown" when req.ip is undefined', async () => {
    const mockConsume = vi.fn().mockResolvedValue(makeResult())
    setProvider(makeMockProvider({ consume: mockConsume }))

    const middleware = createRateLimitMiddleware()
    const req = { ip: undefined }
    const { res } = makeMockRes()
    const next = vi.fn()

    await middleware(req, res as never, next)

    expect(mockConsume).toHaveBeenCalledWith('unknown')
  })
})
