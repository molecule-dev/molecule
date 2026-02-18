/**
 * Tests for the CORS middleware core interface.
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

vi.mock('@molecule/api-secrets', () => ({
  registerSecrets: vi.fn(),
}))

import type { CorsFactory, Middleware } from '../cors.js'
import {
  cors,
  createCorsMiddleware,
  getCors,
  getCorsFactory,
  hasCors,
  setCors,
  setCorsFactory,
} from '../cors.js'

describe('CORS middleware core interface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exports', () => {
    it('should export cors middleware function', () => {
      expect(cors).toBeDefined()
      expect(typeof cors).toBe('function')
    })

    it('should export createCorsMiddleware function', () => {
      expect(createCorsMiddleware).toBeDefined()
      expect(typeof createCorsMiddleware).toBe('function')
    })

    it('should export bond functions', () => {
      expect(typeof setCors).toBe('function')
      expect(typeof getCors).toBe('function')
      expect(typeof hasCors).toBe('function')
      expect(typeof setCorsFactory).toBe('function')
      expect(typeof getCorsFactory).toBe('function')
    })
  })

  describe('setCors / getCors', () => {
    it('should set a CORS middleware via bond', () => {
      const mockMiddleware: Middleware = vi.fn()

      setCors(mockMiddleware)

      expect(mockBond).toHaveBeenCalledWith('middleware:cors', mockMiddleware)
    })

    it('should retrieve the bonded CORS middleware', () => {
      const mockMiddleware: Middleware = vi.fn()
      mockGet.mockReturnValueOnce(mockMiddleware)

      const retrieved = getCors()
      expect(retrieved).toBe(mockMiddleware)
    })

    it('should throw when no CORS middleware is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => getCors()).toThrow(/No CORS implementation/)
    })
  })

  describe('cors delegate', () => {
    it('should delegate to the bonded implementation', () => {
      const mockMiddleware: Middleware = vi.fn()
      mockGet.mockReturnValueOnce(mockMiddleware)

      const req = {}
      const res = {}
      const next = vi.fn()

      cors(req, res, next)
      expect(mockMiddleware).toHaveBeenCalledWith(req, res, next)
    })

    it('should throw when no CORS middleware is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => cors({}, {}, vi.fn())).toThrow(/No CORS implementation/)
    })
  })

  describe('setCorsFactory / createCorsMiddleware', () => {
    it('should set a CORS factory via bond', () => {
      const mockFactory: CorsFactory = vi.fn()

      setCorsFactory(mockFactory)

      expect(mockBond).toHaveBeenCalledWith('middleware:cors:factory', mockFactory)
    })

    it('should create middleware using the bonded factory', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CorsFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const options = { origin: 'https://example.com' as const, credentials: true }
      const result = createCorsMiddleware(options)

      expect(mockFactory).toHaveBeenCalledWith(options)
      expect(result).toBe(mockMiddleware)
    })

    it('should create middleware with array origins', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CorsFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const options = { origin: ['https://example1.com', 'https://example2.com'] }
      const result = createCorsMiddleware(options)

      expect(mockFactory).toHaveBeenCalledWith(options)
      expect(result).toBe(mockMiddleware)
    })

    it('should create middleware with function origin', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CorsFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const originFn = (
        origin: string | undefined,
        cb: (err: Error | null, allow?: boolean) => void,
      ): void => {
        cb(null, true)
      }
      const result = createCorsMiddleware({ origin: originFn })

      expect(mockFactory).toHaveBeenCalledWith({ origin: originFn })
      expect(result).toBe(mockMiddleware)
    })

    it('should create middleware with all options', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: CorsFactory = vi.fn(() => mockMiddleware)
      mockGet.mockReturnValueOnce(mockFactory)

      const options = {
        origin: true as const,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Custom-Header'],
        credentials: true,
        maxAge: 86400,
      }
      const result = createCorsMiddleware(options)

      expect(mockFactory).toHaveBeenCalledWith(options)
      expect(result).toBe(mockMiddleware)
    })

    it('should throw when no factory is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => createCorsMiddleware({ origin: true })).toThrow(/No CORS factory/)
    })
  })

  describe('hasCors', () => {
    it('should return true when CORS is bonded', () => {
      mockIsBonded.mockReturnValueOnce(true)
      expect(hasCors()).toBe(true)
    })

    it('should return false when no CORS is bonded', () => {
      mockIsBonded.mockReturnValueOnce(false)
      expect(hasCors()).toBe(false)
    })
  })

  describe('getCorsFactory', () => {
    it('should return null when no factory is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(getCorsFactory()).toBeNull()
    })

    it('should return the factory when bonded', () => {
      const mockFactory: CorsFactory = vi.fn()
      mockGet.mockReturnValueOnce(mockFactory)
      expect(getCorsFactory()).toBe(mockFactory)
    })
  })

  describe('module re-exports', () => {
    it('should export cors from index', async () => {
      const { cors: c } = await import('../index.js')
      expect(c).toBeDefined()
      expect(typeof c).toBe('function')
    })

    it('should export createCorsMiddleware from index', async () => {
      const { createCorsMiddleware: ccm } = await import('../index.js')
      expect(ccm).toBeDefined()
      expect(typeof ccm).toBe('function')
    })
  })
})
