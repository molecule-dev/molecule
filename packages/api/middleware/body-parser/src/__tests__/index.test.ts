/**
 * Tests for the body parser core interface.
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

import type { JsonParserFactory, Middleware } from '../parser.js'
import {
  bodyParser,
  createJsonParser,
  getBodyParser,
  getJsonParserFactory,
  hasBodyParser,
  setBodyParser,
  setJsonParserFactory,
} from '../parser.js'

describe('Body parser core interface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exports', () => {
    it('should export bodyParser middleware function', () => {
      expect(bodyParser).toBeDefined()
      expect(typeof bodyParser).toBe('function')
    })

    it('should export createJsonParser function', () => {
      expect(createJsonParser).toBeDefined()
      expect(typeof createJsonParser).toBe('function')
    })

    it('should export bond functions', () => {
      expect(typeof setBodyParser).toBe('function')
      expect(typeof getBodyParser).toBe('function')
      expect(typeof hasBodyParser).toBe('function')
      expect(typeof setJsonParserFactory).toBe('function')
      expect(typeof getJsonParserFactory).toBe('function')
    })
  })

  describe('setBodyParser / getBodyParser', () => {
    it('should set and retrieve a body parser implementation', () => {
      const mockParser: Middleware = vi.fn()

      setBodyParser(mockParser)
      expect(mockBond).toHaveBeenCalledWith('middleware:body-parser', mockParser)

      mockGet.mockReturnValueOnce(mockParser)
      const retrieved = getBodyParser()
      expect(retrieved).toBe(mockParser)
    })

    it('should throw when no body parser is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => getBodyParser()).toThrow(/No body parser implementation/)
    })
  })

  describe('bodyParser delegate', () => {
    it('should delegate to the bonded implementation', () => {
      const mockParser: Middleware = vi.fn()
      mockGet.mockReturnValueOnce(mockParser)

      const req = {}
      const res = {}
      const next = vi.fn()

      bodyParser(req, res, next)
      expect(mockParser).toHaveBeenCalledWith(req, res, next)
    })

    it('should throw when no parser is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => bodyParser({}, {}, vi.fn())).toThrow(/No body parser implementation/)
    })
  })

  describe('setJsonParserFactory / createJsonParser', () => {
    it('should set and use a JSON parser factory', () => {
      const mockMiddleware: Middleware = vi.fn()
      const mockFactory: JsonParserFactory = vi.fn(() => mockMiddleware)

      setJsonParserFactory(mockFactory)
      expect(mockBond).toHaveBeenCalledWith('middleware:body-parser:json-factory', mockFactory)

      mockGet.mockReturnValueOnce(mockFactory)
      const result = createJsonParser({ limit: '10kb' })

      expect(mockFactory).toHaveBeenCalledWith({ limit: '10kb' })
      expect(result).toBe(mockMiddleware)
    })

    it('should throw when no factory is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(() => createJsonParser()).toThrow(/No JSON parser factory/)
    })
  })

  describe('hasBodyParser', () => {
    it('should return true when parser is bonded', () => {
      mockIsBonded.mockReturnValueOnce(true)
      expect(hasBodyParser()).toBe(true)
    })

    it('should return false when no parser is bonded', () => {
      mockIsBonded.mockReturnValueOnce(false)
      expect(hasBodyParser()).toBe(false)
    })
  })

  describe('getJsonParserFactory', () => {
    it('should return null when no factory is bonded', () => {
      mockGet.mockReturnValueOnce(null)
      expect(getJsonParserFactory()).toBeNull()
    })

    it('should return the factory when bonded', () => {
      const mockFactory: JsonParserFactory = vi.fn()
      mockGet.mockReturnValueOnce(mockFactory)
      expect(getJsonParserFactory()).toBe(mockFactory)
    })
  })

  describe('index re-exports', () => {
    it('should export bodyParser from index', async () => {
      const { bodyParser: bp } = await import('../index.js')
      expect(bp).toBeDefined()
      expect(typeof bp).toBe('function')
    })

    it('should export createJsonParser from index', async () => {
      const { createJsonParser: cjp } = await import('../index.js')
      expect(cjp).toBeDefined()
      expect(typeof cjp).toBe('function')
    })
  })
})
