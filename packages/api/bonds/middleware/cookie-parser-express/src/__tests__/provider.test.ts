const { mockCreateCookieParser } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockCreateCookieParser: vi.fn(() => vi.fn((_req: any, _res: any, next: () => void) => next())),
}))

vi.mock('cookie-parser', () => ({
  default: mockCreateCookieParser,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cookieParserFactory, provider } from '../provider.js'

describe('@molecule/api-middleware-cookie-parser-express', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider', () => {
    it('should be a middleware function', () => {
      expect(typeof provider).toBe('function')
    })

    it('should call next when invoked', () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider({} as any, {} as any, next)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('cookieParserFactory', () => {
    it('should create middleware with secret', () => {
      const middleware = cookieParserFactory('my-secret')
      expect(typeof middleware).toBe('function')
      expect(mockCreateCookieParser).toHaveBeenCalledWith('my-secret', undefined)
    })

    it('should create middleware with secret and options', () => {
      cookieParserFactory('secret', { decode: decodeURIComponent })
      expect(mockCreateCookieParser).toHaveBeenCalledWith('secret', { decode: decodeURIComponent })
    })

    it('should create middleware with array of secrets', () => {
      cookieParserFactory(['s1', 's2'])
      expect(mockCreateCookieParser).toHaveBeenCalledWith(['s1', 's2'], undefined)
    })
  })
})
