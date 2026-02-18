/**
 * Tests for the cookie parser core interface.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockBond, mockGet, mockIsBonded } = vi.hoisted(() => ({
  mockBond: vi.fn(),
  mockGet: vi.fn(),
  mockIsBonded: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  bond: mockBond,
  get: mockGet,
  isBonded: mockIsBonded,
}))

import type { CookieParserFactory, Middleware } from '../index.js'
import {
  cookieParser,
  createCookieParserMiddleware,
  getCookieParser,
  getCookieParserFactory,
  hasCookieParser,
  setCookieParser,
  setCookieParserFactory,
} from '../index.js'

describe('Cookie parser core interface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exports', () => {
    it('should export cookieParser middleware function', () => {
      expect(cookieParser).toBeDefined()
      expect(typeof cookieParser).toBe('function')
    })

    it('should export createCookieParserMiddleware function', () => {
      expect(createCookieParserMiddleware).toBeDefined()
      expect(typeof createCookieParserMiddleware).toBe('function')
    })

    it('should export bond functions', () => {
      expect(typeof setCookieParser).toBe('function')
      expect(typeof getCookieParser).toBe('function')
      expect(typeof hasCookieParser).toBe('function')
      expect(typeof setCookieParserFactory).toBe('function')
      expect(typeof getCookieParserFactory).toBe('function')
    })
  })

  describe('setCookieParser / getCookieParser', () => {
    it('should set a cookie parser via bond', () => {
      const mockParser: Middleware = vi.fn()

      setCookieParser(mockParser)

      expect(mockBond).toHaveBeenCalledWith('middleware:cookie-parser', mockParser)
    })

    it('should retrieve the bonded cookie parser', () => {
      const mockParser: Middleware = vi.fn()
      mockGet.mockReturnValueOnce(mockParser)

      const retrieved = getCookieParser()
      expect(retrieved).toBe(mockParser)
    })

    it('should throw when no cookie parser is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => getCookieParser()).toThrow(/No cookie parser implementation/)
    })
  })

  describe('cookieParser delegate', () => {
    it('should delegate to the bonded implementation', () => {
      const mockParser: Middleware = vi.fn()
      mockGet.mockReturnValueOnce(mockParser)

      const req = {}
      const res = {}
      const next = vi.fn()

      cookieParser(req, res, next)
      expect(mockParser).toHaveBeenCalledWith(req, res, next)
    })

    it('should throw when no parser is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => cookieParser({}, {}, vi.fn())).toThrow(/No cookie parser implementation/)
    })
  })

  describe('setCookieParserFactory / createCookieParserMiddleware', () => {
    it('should set a cookie parser factory via bond', () => {
      const mockFactory: CookieParserFactory = vi.fn()

      setCookieParserFactory(mockFactory)

      expect(mockBond).toHaveBeenCalledWith('middleware:cookie-parser:factory', mockFactory)
    })

    it('should create middleware using the bonded factory', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CookieParserFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const result = createCookieParserMiddleware('my-secret', { decode: decodeURIComponent })

      expect(mockFactory).toHaveBeenCalledWith('my-secret', { decode: decodeURIComponent })
      expect(result).toBe(mockMiddleware)
    })

    it('should create middleware without arguments', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CookieParserFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const result = createCookieParserMiddleware()

      expect(mockFactory).toHaveBeenCalledWith(undefined, undefined)
      expect(result).toBe(mockMiddleware)
    })

    it('should create middleware with secret array', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CookieParserFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const result = createCookieParserMiddleware(['secret1', 'secret2'])

      expect(mockFactory).toHaveBeenCalledWith(['secret1', 'secret2'], undefined)
      expect(result).toBe(mockMiddleware)
    })

    it('should throw when no factory is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => createCookieParserMiddleware()).toThrow(/No cookie parser factory/)
    })
  })

  describe('hasCookieParser', () => {
    it('should return true when parser is bonded', () => {
      mockIsBonded.mockReturnValueOnce(true)
      expect(hasCookieParser()).toBe(true)
    })

    it('should return false when no parser is bonded', () => {
      mockIsBonded.mockReturnValueOnce(false)
      expect(hasCookieParser()).toBe(false)
    })
  })

  describe('getCookieParserFactory', () => {
    it('should return null when no factory is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(getCookieParserFactory()).toBeNull()
    })

    it('should return the factory when bonded', () => {
      const mockFactory: CookieParserFactory = vi.fn()
      mockGet.mockReturnValueOnce(mockFactory)
      expect(getCookieParserFactory()).toBe(mockFactory)
    })
  })
})
