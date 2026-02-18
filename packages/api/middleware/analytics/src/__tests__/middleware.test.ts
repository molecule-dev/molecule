/**
 * Tests for the analytics middleware.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTrack = vi.fn().mockResolvedValue(undefined)

vi.mock('@molecule/api-bond', () => ({
  getAnalytics: () => ({
    identify: vi.fn().mockResolvedValue(undefined),
    track: mockTrack,
    page: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { createAnalyticsMiddleware } from '../middleware.js'

function createMockReqRes(
  method: string,
  path: string,
): {
  req: { method: string; path: string; url: string }
  res: {
    statusCode: number
    on: (event: string, listener: () => void) => void
    emit: (event: string) => void
  }
} {
  const req = { method, path, url: path }
  const listeners: Record<string, (() => void)[]> = {}
  const res = {
    statusCode: 200,
    on(event: string, listener: () => void) {
      listeners[event] = listeners[event] || []
      listeners[event].push(listener)
    },
    emit(event: string) {
      listeners[event]?.forEach((fn) => fn())
    },
  }
  return { req, res }
}

describe('createAnalyticsMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a middleware function', () => {
    const middleware = createAnalyticsMiddleware()
    expect(typeof middleware).toBe('function')
  })

  it('should call next() immediately', () => {
    const middleware = createAnalyticsMiddleware()
    const { req, res } = createMockReqRes('GET', '/api/users')
    const next = vi.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith()
  })

  it('should track api.request on response finish', () => {
    const middleware = createAnalyticsMiddleware()
    const { req, res } = createMockReqRes('GET', '/api/users')
    const next = vi.fn()

    middleware(req, res, next)
    res.statusCode = 200
    res.emit('finish')

    expect(mockTrack).toHaveBeenCalledOnce()
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'api.request',
      properties: expect.objectContaining({
        method: 'GET',
        path: '/api/users',
        status: 200,
      }),
    })
  })

  it('should include duration_ms in properties', () => {
    const middleware = createAnalyticsMiddleware()
    const { req, res } = createMockReqRes('POST', '/api/data')
    const next = vi.fn()

    middleware(req, res, next)
    res.emit('finish')

    const call = mockTrack.mock.calls[0][0]
    expect(call.properties).toHaveProperty('duration_ms')
    expect(typeof call.properties.duration_ms).toBe('number')
    expect(call.properties.duration_ms).toBeGreaterThanOrEqual(0)
  })

  it('should exclude /health by default', () => {
    const middleware = createAnalyticsMiddleware()
    const { req, res } = createMockReqRes('GET', '/health')
    const next = vi.fn()

    middleware(req, res, next)
    res.emit('finish')

    expect(next).toHaveBeenCalledOnce()
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('should exclude custom paths', () => {
    const middleware = createAnalyticsMiddleware({
      excludePaths: ['/health', '/ready', '/metrics'],
    })
    const next = vi.fn()

    for (const path of ['/health', '/ready', '/metrics']) {
      const { req, res } = createMockReqRes('GET', path)
      middleware(req, res, next)
      res.emit('finish')
    }

    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('should track non-excluded paths when custom excludePaths is set', () => {
    const middleware = createAnalyticsMiddleware({
      excludePaths: ['/health'],
    })
    const { req, res } = createMockReqRes('GET', '/api/users')
    const next = vi.fn()

    middleware(req, res, next)
    res.emit('finish')

    expect(mockTrack).toHaveBeenCalledOnce()
  })

  it('should track different HTTP methods', () => {
    const middleware = createAnalyticsMiddleware()

    for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
      vi.clearAllMocks()
      const { req, res } = createMockReqRes(method, '/api/test')
      const next = vi.fn()

      middleware(req, res, next)
      res.emit('finish')

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({ method }),
        }),
      )
    }
  })

  it('should capture the response status code at finish time', () => {
    const middleware = createAnalyticsMiddleware()
    const { req, res } = createMockReqRes('POST', '/api/create')
    const next = vi.fn()

    middleware(req, res, next)
    res.statusCode = 201
    res.emit('finish')

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ status: 201 }),
      }),
    )
  })

  it('should not throw if track rejects', () => {
    mockTrack.mockRejectedValueOnce(new Error('analytics down'))

    const middleware = createAnalyticsMiddleware()
    const { req, res } = createMockReqRes('GET', '/api/users')
    const next = vi.fn()

    middleware(req, res, next)
    // Should not throw
    expect(() => res.emit('finish')).not.toThrow()
  })

  it('should fall back to url if path is not available', () => {
    const middleware = createAnalyticsMiddleware()
    const req = { method: 'GET', url: '/fallback/url' }
    const listeners: Record<string, (() => void)[]> = {}
    const res = {
      statusCode: 200,
      on(event: string, listener: () => void) {
        listeners[event] = listeners[event] || []
        listeners[event].push(listener)
      },
      emit(event: string) {
        listeners[event]?.forEach((fn) => fn())
      },
    }
    const next = vi.fn()

    middleware(req, res, next)
    res.emit('finish')

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ path: '/fallback/url' }),
      }),
    )
  })
})
