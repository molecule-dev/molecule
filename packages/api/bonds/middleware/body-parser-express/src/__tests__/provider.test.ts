/**
 * Tests for the Express body parser provider, focusing on the audit-hardened
 * request size limits added to `express.json()` and `connect-busboy`.
 */

const { mockJsonFactory, mockConnectBusboy, captured } = vi.hoisted(() => {
  /**
   * Mutable container so factory-captured options survive across the module
   * boundary (vi.hoisted returns by value for primitives).
   */
  const captured: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonOptions: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    busboyOptions: any
  } = { jsonOptions: null, busboyOptions: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockJsonMiddleware = vi.fn((_req: any, _res: any, next: (err?: unknown) => void) => next())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockJsonFactory = vi.fn((options: any) => {
    captured.jsonOptions = options
    return mockJsonMiddleware
  })

  /**
   * connect-busboy returns middleware. The real middleware attaches `req.busboy`
   * (a Busboy instance) and calls `next()`. Our mock simulates this by
   * attaching a minimal EventEmitter as `req.busboy` that emits `finish`
   * when piped to, so the full multipartParser flow completes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBusboyMiddleware = vi.fn(async (req: any, _res: any, next: (err?: unknown) => void) => {
    // Simulate what connect-busboy does: attach req.busboy then call next
    const { EventEmitter: EE } = await import('node:events')
    const fakeBusboy = new EE()
    // When req.pipe(req.busboy) is called, emit 'finish' on next tick
    fakeBusboy.write = () => true
    fakeBusboy.end = () => {
      process.nextTick(() => fakeBusboy.emit('finish'))
    }
    // Support req.pipe(busboy) — pipe calls write/end on the destination
    req.busboy = fakeBusboy
    req.pipe = (dest: typeof fakeBusboy) => {
      process.nextTick(() => dest.emit('finish'))
      return dest
    }
    req.on = () => req
    next()
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockConnectBusboy = vi.fn((options: any) => {
    captured.busboyOptions = options
    return mockBusboyMiddleware
  })

  return { mockJsonFactory, mockConnectBusboy, captured }
})

vi.mock('express', () => ({
  default: {
    json: mockJsonFactory,
  },
}))

vi.mock('connect-busboy', () => ({
  default: mockConnectBusboy,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { jsonParserFactory, provider } from '../provider.js'

describe('@molecule/api-middleware-body-parser-express', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider', () => {
    it('should be a middleware function', () => {
      expect(typeof provider).toBe('function')
    })

    it('should call next() for requests without multipart content-type', () => {
      const next = vi.fn()
      provider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { headers: { 'content-type': 'application/json' } } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        next,
      )
      expect(next).toHaveBeenCalled()
    })

    it('should set req.body and call next for requests with null headers', () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = { headers: null } as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider(req, {} as any, next)
      expect(req.body).toEqual({})
      expect(next).toHaveBeenCalled()
    })

    it('should route multipart/form-data to busboy parser', async () => {
      const next = vi.fn()
      provider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { headers: { 'content-type': 'multipart/form-data' } } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        next,
      )
      // The busboy mock sets up req.busboy as an EventEmitter that emits
      // 'finish' on next tick, so we need to wait for the async flow.
      await vi.waitFor(() => expect(next).toHaveBeenCalled())
    })

    it('should route application/x-www-form-urlencoded to busboy parser', async () => {
      const next = vi.fn()
      provider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { headers: { 'content-type': 'application/x-www-form-urlencoded' } } as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {} as any,
        next,
      )
      await vi.waitFor(() => expect(next).toHaveBeenCalled())
    })
  })

  describe('JSON parser audit limits', () => {
    it('should set a 2MB limit on express.json()', () => {
      expect(captured.jsonOptions).toBeDefined()
      expect(captured.jsonOptions.limit).toBe('2mb')
    })

    it('should include a verify function for rawBody support', () => {
      expect(captured.jsonOptions).toBeDefined()
      expect(typeof captured.jsonOptions.verify).toBe('function')
    })
  })

  describe('Busboy audit limits', () => {
    it('should set a field limit of 100', () => {
      expect(captured.busboyOptions).toBeDefined()
      expect(captured.busboyOptions.limits.fields).toBe(100)
    })

    it('should set a files limit of 0 (no file uploads through body parser)', () => {
      expect(captured.busboyOptions).toBeDefined()
      expect(captured.busboyOptions.limits.files).toBe(0)
    })

    it('should set a fieldSize limit of 1MB (1024 * 1024)', () => {
      expect(captured.busboyOptions).toBeDefined()
      expect(captured.busboyOptions.limits.fieldSize).toBe(1024 * 1024)
    })

    it('should set a fileSize limit of 1024 bytes', () => {
      expect(captured.busboyOptions).toBeDefined()
      expect(captured.busboyOptions.limits.fileSize).toBe(1024)
    })

    it('should set a parts limit of 110', () => {
      expect(captured.busboyOptions).toBeDefined()
      expect(captured.busboyOptions.limits.parts).toBe(110)
    })
  })

  describe('jsonParserFactory', () => {
    it('should create a middleware function', () => {
      const middleware = jsonParserFactory({ limit: '5mb' })
      expect(typeof middleware).toBe('function')
    })

    it('should pass options to express.json()', () => {
      jsonParserFactory({ limit: '10mb', strict: true })
      // mockJsonFactory is called once at module level (for the default parser)
      // and once for each jsonParserFactory call
      const lastCall = mockJsonFactory.mock.calls[mockJsonFactory.mock.calls.length - 1]
      expect(lastCall[0]).toEqual({ limit: '10mb', strict: true })
    })

    it('should call next when the created middleware is invoked', () => {
      const middleware = jsonParserFactory()
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middleware({} as any, {} as any, next)
      expect(next).toHaveBeenCalled()
    })
  })
})
