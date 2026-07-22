import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createRequestLoggingMiddleware } from '../middleware.js'

const { mockInfo, mockWarn, mockError } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockWarn: vi.fn(),
  mockError: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
  },
}))

interface MockRes {
  statusCode: number
  listeners: Record<string, () => void>
  on(event: string, listener: () => void): void
  finish(): void
}

const makeRes = (statusCode: number): MockRes => {
  const res: MockRes = {
    statusCode,
    listeners: {},
    on(event, listener) {
      res.listeners[event] = listener
    },
    finish() {
      res.listeners.finish?.()
    },
  }
  return res
}

describe('@molecule/api-middleware-request-logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs method, path, status, and duration on finish', () => {
    const mw = createRequestLoggingMiddleware()
    const res = makeRes(200)
    const next = vi.fn()
    mw({ method: 'GET', path: '/api/users' }, res, next)
    expect(next).toHaveBeenCalled()
    res.finish()
    expect(mockInfo).toHaveBeenCalledTimes(1)
    const [message, record] = mockInfo.mock.calls[0] as [string, Record<string, unknown>]
    expect(message).toBe('http.request')
    expect(record.method).toBe('GET')
    expect(record.path).toBe('/api/users')
    expect(record.status).toBe(200)
    expect(typeof record.duration_ms).toBe('number')
    expect(record.event).toBe('http.request')
  })

  it('excludes exact-match paths (default /health)', () => {
    const mw = createRequestLoggingMiddleware()
    const res = makeRes(200)
    const next = vi.fn()
    mw({ method: 'GET', path: '/health' }, res, next)
    expect(next).toHaveBeenCalled()
    res.finish()
    expect(mockInfo).not.toHaveBeenCalled()
  })

  it('falls back to req.url when req.path is absent', () => {
    const mw = createRequestLoggingMiddleware()
    const res = makeRes(200)
    mw({ method: 'POST', url: '/api/login' }, res, vi.fn())
    res.finish()
    const [, record] = mockInfo.mock.calls[0] as [string, Record<string, unknown>]
    expect(record.path).toBe('/api/login')
  })

  it('logs 4xx at warn and 5xx at error', () => {
    const mw = createRequestLoggingMiddleware()
    const notFound = makeRes(404)
    mw({ method: 'GET', path: '/api/missing' }, notFound, vi.fn())
    notFound.finish()
    expect(mockWarn).toHaveBeenCalledTimes(1)
    const boom = makeRes(500)
    mw({ method: 'GET', path: '/api/boom' }, boom, vi.fn())
    boom.finish()
    expect(mockError).toHaveBeenCalledTimes(1)
    expect(mockInfo).not.toHaveBeenCalled()
  })

  it('merges baseFields and resolveFields output into the record', () => {
    const mw = createRequestLoggingMiddleware({
      baseFields: { service: 'api' },
      resolveFields: () => ({ requestId: 'req_123' }),
    })
    const res = makeRes(201)
    mw({ method: 'POST', path: '/api/users' }, res, vi.fn())
    res.finish()
    const [, record] = mockInfo.mock.calls[0] as [string, Record<string, unknown>]
    expect(record.service).toBe('api')
    expect(record.requestId).toBe('req_123')
  })

  it('swallows a throwing resolveFields so the request still logs', () => {
    const mw = createRequestLoggingMiddleware({
      resolveFields: () => {
        throw new Error('resolver boom')
      },
    })
    const res = makeRes(200)
    mw({ method: 'GET', path: '/api/x' }, res, vi.fn())
    expect(() => res.finish()).not.toThrow()
    expect(mockInfo).toHaveBeenCalledTimes(1)
  })

  it('honors a custom excludePaths list', () => {
    const mw = createRequestLoggingMiddleware({ excludePaths: ['/status'] })
    const excluded = makeRes(200)
    mw({ method: 'GET', path: '/status' }, excluded, vi.fn())
    excluded.finish()
    const logged = makeRes(200)
    mw({ method: 'GET', path: '/health' }, logged, vi.fn())
    logged.finish()
    expect(mockInfo).toHaveBeenCalledTimes(1)
    const [, record] = mockInfo.mock.calls[0] as [string, Record<string, unknown>]
    expect(record.path).toBe('/health')
  })
})
