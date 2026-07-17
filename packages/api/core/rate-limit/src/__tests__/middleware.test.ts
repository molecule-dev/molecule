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
  refund: vi.fn().mockResolvedValue(undefined),
  configure: vi.fn(),
  ...overrides,
})

const makeMockReq = (ip = '127.0.0.1'): { ip: string } => ({ ip })

interface MockRes {
  res: Record<string, unknown>
  headers: Record<string, string>
  /** Fires the registered `'finish'` listener with the given final status code. */
  finish: (statusCode: number) => void
}

const makeMockRes = (): MockRes => {
  const res: Record<string, unknown> = {}
  const headers: Record<string, string> = {}
  const finishListeners: Array<() => void> = []
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.set = vi.fn((key: string, value: string) => {
    headers[key] = value
    return res
  })
  res.on = vi.fn((event: string, listener: () => void) => {
    if (event === 'finish') {
      finishListeners.push(listener)
    }
    return res
  })
  const finish = (statusCode: number): void => {
    res.statusCode = statusCode
    for (const listener of finishListeners) {
      listener()
    }
  }
  return { res, headers, finish }
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

  describe('skipFailedRequests / skipSuccessfulRequests', () => {
    it('does not register a finish listener when neither flag is set', async () => {
      const mockRefund = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ refund: mockRefund }))

      const middleware = createRateLimitMiddleware({ windowMs: 60_000, max: 100 })
      const req = makeMockReq('10.0.0.1')
      const { res } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)

      expect(res.on).not.toHaveBeenCalled()
      expect(mockRefund).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('refunds a failed request (status >= 400) when skipFailedRequests is set', async () => {
      const mockRefund = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ refund: mockRefund }))

      const middleware = createRateLimitMiddleware({
        windowMs: 60_000,
        max: 100,
        skipFailedRequests: true,
      })
      const req = makeMockReq('10.0.0.2')
      const { res, finish } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)
      expect(next).toHaveBeenCalled()
      expect(mockRefund).not.toHaveBeenCalled() // not until the response finishes

      finish(500)

      expect(mockRefund).toHaveBeenCalledWith('10.0.0.2')
    })

    it('does NOT refund a successful request when only skipFailedRequests is set', async () => {
      const mockRefund = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ refund: mockRefund }))

      const middleware = createRateLimitMiddleware({
        windowMs: 60_000,
        max: 100,
        skipFailedRequests: true,
      })
      const req = makeMockReq('10.0.0.3')
      const { res, finish } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)
      finish(200)

      expect(mockRefund).not.toHaveBeenCalled()
    })

    it('refunds a successful request (status < 400) when skipSuccessfulRequests is set', async () => {
      const mockRefund = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ refund: mockRefund }))

      const middleware = createRateLimitMiddleware({
        windowMs: 60_000,
        max: 100,
        skipSuccessfulRequests: true,
      })
      const req = makeMockReq('10.0.0.4')
      const { res, finish } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)
      finish(204)

      expect(mockRefund).toHaveBeenCalledWith('10.0.0.4')
    })

    it('does NOT refund a failed request when only skipSuccessfulRequests is set', async () => {
      const mockRefund = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ refund: mockRefund }))

      const middleware = createRateLimitMiddleware({
        windowMs: 60_000,
        max: 100,
        skipSuccessfulRequests: true,
      })
      const req = makeMockReq('10.0.0.5')
      const { res, finish } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)
      finish(503)

      expect(mockRefund).not.toHaveBeenCalled()
    })

    it('does not refund a rejected (429) request — it never reaches the finish hook', async () => {
      const mockRefund = vi.fn().mockResolvedValue(undefined)
      const mockConsume = vi
        .fn()
        .mockResolvedValue(makeResult({ allowed: false, remaining: 0, retryAfter: 30 }))
      setProvider(makeMockProvider({ consume: mockConsume, refund: mockRefund }))

      const middleware = createRateLimitMiddleware({
        windowMs: 60_000,
        max: 100,
        skipFailedRequests: true,
      })
      const req = makeMockReq('10.0.0.6')
      const { res } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)

      expect(res.status).toHaveBeenCalledWith(429)
      expect(res.on).not.toHaveBeenCalled()
      expect(mockRefund).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('swallows-and-logs a refund rejection without throwing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const mockRefund = vi.fn().mockRejectedValue(new Error('backend down'))
      setProvider(makeMockProvider({ refund: mockRefund }))

      const middleware = createRateLimitMiddleware({
        windowMs: 60_000,
        max: 100,
        skipSuccessfulRequests: true,
      })
      const req = makeMockReq('10.0.0.7')
      const { res, finish } = makeMockRes()
      const next = vi.fn()

      await middleware(req, res as never, next)
      // Firing finish must not throw even though refund rejects.
      expect(() => finish(200)).not.toThrow()
      // Let the rejected refund promise settle so the .catch runs.
      await Promise.resolve()

      expect(mockRefund).toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })
})
