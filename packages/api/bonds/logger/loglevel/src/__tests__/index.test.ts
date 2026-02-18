/**
 * Tests for the loglevel logger provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock loglevel before importing the module
const mockTrace = vi.fn()
const mockDebug = vi.fn()
const mockInfo = vi.fn()
const mockWarn = vi.fn()
const mockError = vi.fn()
const mockSetLevel = vi.fn()
const mockGetLevel = vi.fn()

const mockLoggerInstance = {
  trace: mockTrace,
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
  setLevel: mockSetLevel,
  getLevel: mockGetLevel,
}

const mockGetLogger = vi.fn(() => mockLoggerInstance)

vi.mock('loglevel', () => ({
  default: {
    getLogger: mockGetLogger,
    levels: {
      TRACE: 0,
      DEBUG: 1,
      INFO: 2,
      WARN: 3,
      ERROR: 4,
      SILENT: 5,
    },
  },
}))

vi.mock('@molecule/api-logger', () => ({
  // Type exports only, no runtime values needed
}))

describe('@molecule/api-logger-loglevel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLevel.mockReturnValue(2) // Default to INFO level
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('provider', () => {
    it('should implement Logger interface', async () => {
      const { provider } = await import('../provider.js')

      expect(provider).toBeDefined()
      expect(provider.trace).toBeDefined()
      expect(provider.debug).toBeDefined()
      expect(provider.info).toBeDefined()
      expect(provider.warn).toBeDefined()
      expect(provider.error).toBeDefined()
    })

    it('should call loglevel.trace with arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.trace('trace message', { data: 'test' })

      expect(mockTrace).toHaveBeenCalledWith('trace message', { data: 'test' })
    })

    it('should call loglevel.debug with arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.debug('debug message')

      expect(mockDebug).toHaveBeenCalledWith('debug message')
    })

    it('should call loglevel.info with arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.info('info message', 123, true)

      expect(mockInfo).toHaveBeenCalledWith('info message', 123, true)
    })

    it('should call loglevel.warn with arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.warn('warning message')

      expect(mockWarn).toHaveBeenCalledWith('warning message')
    })

    it('should call loglevel.error with arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.error('error message', new Error('test error'))

      expect(mockError).toHaveBeenCalledWith('error message', expect.any(Error))
    })

    it('should handle multiple arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.info('message', 1, 2, 3, { key: 'value' })

      expect(mockInfo).toHaveBeenCalledWith('message', 1, 2, 3, { key: 'value' })
    })

    it('should handle no arguments', async () => {
      const { provider } = await import('../provider.js')

      provider.info()

      expect(mockInfo).toHaveBeenCalledWith()
    })
  })

  describe('log (loglevel instance)', () => {
    it('should export the underlying loglevel instance', async () => {
      const { log } = await import('../provider.js')

      expect(log).toBeDefined()
      expect(mockGetLogger).toHaveBeenCalledWith('molecule')
    })
  })

  describe('levelMap', () => {
    it('should map molecule log levels to loglevel levels', async () => {
      const { levelMap } = await import('../provider.js')

      expect(levelMap).toEqual({
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        silent: 5,
      })
    })
  })

  describe('setLevel()', () => {
    it('should set level to trace', async () => {
      const { setLevel } = await import('../logger.js')

      setLevel('trace')

      expect(mockSetLevel).toHaveBeenCalledWith(0)
    })

    it('should set level to debug', async () => {
      const { setLevel } = await import('../logger.js')

      setLevel('debug')

      expect(mockSetLevel).toHaveBeenCalledWith(1)
    })

    it('should set level to info', async () => {
      const { setLevel } = await import('../logger.js')

      setLevel('info')

      expect(mockSetLevel).toHaveBeenCalledWith(2)
    })

    it('should set level to warn', async () => {
      const { setLevel } = await import('../logger.js')

      setLevel('warn')

      expect(mockSetLevel).toHaveBeenCalledWith(3)
    })

    it('should set level to error', async () => {
      const { setLevel } = await import('../logger.js')

      setLevel('error')

      expect(mockSetLevel).toHaveBeenCalledWith(4)
    })

    it('should set level to silent', async () => {
      const { setLevel } = await import('../logger.js')

      setLevel('silent')

      expect(mockSetLevel).toHaveBeenCalledWith(5)
    })
  })

  describe('getLevel()', () => {
    it('should return trace when level is 0', async () => {
      mockGetLevel.mockReturnValue(0)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('trace')
    })

    it('should return debug when level is 1', async () => {
      mockGetLevel.mockReturnValue(1)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('debug')
    })

    it('should return info when level is 2', async () => {
      mockGetLevel.mockReturnValue(2)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('info')
    })

    it('should return warn when level is 3', async () => {
      mockGetLevel.mockReturnValue(3)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('warn')
    })

    it('should return error when level is 4', async () => {
      mockGetLevel.mockReturnValue(4)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('error')
    })

    it('should return silent when level is 5', async () => {
      mockGetLevel.mockReturnValue(5)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('silent')
    })

    it('should return info as default for unknown level', async () => {
      mockGetLevel.mockReturnValue(99)
      vi.resetModules()

      const { getLevel } = await import('../logger.js')

      expect(getLevel()).toBe('info')
    })
  })

  describe('createLogger()', () => {
    it('should create a logger with default options', async () => {
      const { createLogger } = await import('../logger.js')

      const logger = createLogger()

      expect(logger).toBeDefined()
      expect(logger.trace).toBeDefined()
      expect(logger.debug).toBeDefined()
      expect(logger.info).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(mockGetLogger).toHaveBeenCalledWith('molecule')
    })

    it('should create a logger with custom name', async () => {
      const { createLogger } = await import('../logger.js')

      createLogger({ name: 'custom-logger' })

      expect(mockGetLogger).toHaveBeenCalledWith('custom-logger')
    })

    it('should create a logger with custom level', async () => {
      const { createLogger } = await import('../logger.js')

      createLogger({ level: 'debug' })

      expect(mockSetLevel).toHaveBeenCalledWith(1)
    })

    it('should create a logger with custom name and level', async () => {
      const { createLogger } = await import('../logger.js')

      createLogger({ name: 'my-app', level: 'warn' })

      expect(mockGetLogger).toHaveBeenCalledWith('my-app')
      expect(mockSetLevel).toHaveBeenCalledWith(3)
    })

    it('should return a logger that calls underlying methods', async () => {
      const { createLogger } = await import('../logger.js')

      const logger = createLogger()

      logger.trace('trace')
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(mockTrace).toHaveBeenCalledWith('trace')
      expect(mockDebug).toHaveBeenCalledWith('debug')
      expect(mockInfo).toHaveBeenCalledWith('info')
      expect(mockWarn).toHaveBeenCalledWith('warn')
      expect(mockError).toHaveBeenCalledWith('error')
    })

    it('should forward multiple arguments', async () => {
      const { createLogger } = await import('../logger.js')

      const logger = createLogger()

      logger.info('message', 1, { key: 'value' }, [1, 2, 3])

      expect(mockInfo).toHaveBeenCalledWith('message', 1, { key: 'value' }, [1, 2, 3])
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.provider).toBeDefined()
      expect(exports.loglevel).toBeDefined()
      expect(exports.levelMap).toBeDefined()
      expect(exports.setLevel).toBeDefined()
      expect(exports.getLevel).toBeDefined()
      expect(exports.createLogger).toBeDefined()
    })

    it('should export loglevel as alias for log', async () => {
      const { log } = await import('../provider.js')
      const exports = await import('../index.js')

      expect(exports.loglevel).toBe(log)
    })
  })

  describe('Logger interface compliance', () => {
    it('should allow Logger type assignment', async () => {
      const { provider } = await import('../provider.js')

      // TypeScript would catch this at compile time, but we verify at runtime
      const logger: {
        trace: (...args: unknown[]) => void
        debug: (...args: unknown[]) => void
        info: (...args: unknown[]) => void
        warn: (...args: unknown[]) => void
        error: (...args: unknown[]) => void
      } = provider

      expect(typeof logger.trace).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
    })

    it('should accept any argument types', async () => {
      const { provider } = await import('../provider.js')

      // Should not throw for various argument types
      expect(() => provider.info('string')).not.toThrow()
      expect(() => provider.info(123)).not.toThrow()
      expect(() => provider.info(true)).not.toThrow()
      expect(() => provider.info(null)).not.toThrow()
      expect(() => provider.info(undefined)).not.toThrow()
      expect(() => provider.info({ key: 'value' })).not.toThrow()
      expect(() => provider.info([1, 2, 3])).not.toThrow()
      expect(() => provider.info(new Error('test'))).not.toThrow()
    })
  })
})
