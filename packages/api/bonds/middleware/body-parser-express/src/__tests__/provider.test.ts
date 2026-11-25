/**
 * Tests for the Express body parser provider, focusing on the audit-hardened
 * request size limits added to `express.json()` and `busboy`.
 */

const { mockJsonFactory, mockBusboy, captured } = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events')
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
   * busboy(config) returns a parser stream. The stand-in is an EventEmitter that also accepts the
   * write/end calls `req.pipe()` makes on its destination and emits `finish`, so the full
   * urlEncodedParser flow completes.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockBusboy = vi.fn((config: any) => {
    captured.busboyOptions = config
    return Object.assign(new EventEmitter(), { write: () => true, end: () => undefined })
  })

  return { mockJsonFactory, mockBusboy, captured }
})

vi.mock('express', () => ({
  default: {
    json: mockJsonFactory,
  },
}))

vi.mock('busboy', () => ({
  default: mockBusboy,
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

/**
 * A URL-encoded request whose pipe ends at once, as an empty body does.
 *
 * @param contentType - Its Content-Type.
 * @returns The request stand-in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formRequest = (contentType: string): any => ({
  headers: { 'content-type': contentType },
  on: () => undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe: (dest: any) => {
    process.nextTick(() => dest.emit('finish'))
    return dest
  },
})

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

    it("leaves a multipart body unread for the route's upload parser", () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = { headers: { 'content-type': 'multipart/form-data; boundary=x' } } as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider(req, {} as any, next)
      expect(next).toHaveBeenCalledWith()
      expect(req.body).toEqual({})
      expect(mockBusboy).not.toHaveBeenCalled()
    })

    it.each([
      'application/x-www-form-urlencoded',
      'application/x-www-form-urlencoded;charset=UTF-8',
    ])('should route %s to busboy parser', async (contentType) => {
      const next = vi.fn()
      const req = formRequest(contentType)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider(req, {} as any, next)
      await vi.waitFor(() => expect(next).toHaveBeenCalled())
      expect(mockBusboy).toHaveBeenCalledWith(expect.objectContaining({ headers: req.headers }))
    })

    it('sets req.body to {} when the JSON parser read nothing', () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = { headers: { 'content-type': 'text/plain' } } as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider(req, {} as any, next)
      expect(req.body).toEqual({})
      expect(next).toHaveBeenCalledWith(undefined)
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
    beforeEach(async () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider(formRequest('application/x-www-form-urlencoded'), {} as any, next)
      await vi.waitFor(() => expect(next).toHaveBeenCalled())
    })

    it('should pass busboy one field past the limit of 100, where the parser counts it', () => {
      // busboy drops every field past its limit without a word, so 101 is passed: the parser sees
      // the 101st field and refuses the body (413) instead of passing on the first 100.
      expect(captured.busboyOptions).toBeDefined()
      expect(captured.busboyOptions.limits.fields).toBe(101)
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
