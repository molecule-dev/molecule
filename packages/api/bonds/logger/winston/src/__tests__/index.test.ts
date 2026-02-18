/**
 * Tests for the winston logger provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock winston before importing the module
const mockSilly = vi.fn()
const mockDebug = vi.fn()
const mockInfo = vi.fn()
const mockWarn = vi.fn()
const mockError = vi.fn()

const mockLoggerInstance = {
  silly: mockSilly,
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
}

const mockCreateLogger = vi.fn(() => mockLoggerInstance)

const mockFormat = {
  combine: vi.fn((...args: unknown[]) => ({ _combined: args })),
  timestamp: vi.fn((opts?: object) => ({ _timestamp: opts })),
  errors: vi.fn((opts: object) => ({ _errors: opts })),
  json: vi.fn(() => ({ _json: true })),
  colorize: vi.fn(() => ({ _colorize: true })),
  printf: vi.fn((fn: (...args: unknown[]) => string) => ({ _printf: fn })),
}

const mockConsoleTransport = vi.fn()

const mockTransports = {
  Console: mockConsoleTransport,
}

vi.mock('winston', () => ({
  default: {
    createLogger: mockCreateLogger,
    format: mockFormat,
    transports: mockTransports,
  },
}))

vi.mock('@molecule/api-logger', () => ({
  // Type exports only, no runtime values needed
}))

describe('@molecule/api-logger-winston', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('createLogger()', () => {
    it('should create a logger with default options', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()

      expect(logger).toBeDefined()
      expect(logger.trace).toBeDefined()
      expect(logger.debug).toBeDefined()
      expect(logger.info).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(mockCreateLogger).toHaveBeenCalled()
    })

    it('should create a logger with info level by default', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger()

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        }),
      )
    })

    it('should create a logger with trace level (mapped to silly)', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'trace' })

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'silly',
        }),
      )
    })

    it('should create a logger with debug level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'debug' })

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
        }),
      )
    })

    it('should create a logger with warn level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'warn' })

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
        }),
      )
    })

    it('should create a logger with error level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'error' })

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
        }),
      )
    })

    it('should create a logger with silent level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'silent' })

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'silent',
        }),
      )
    })

    it('should use console format when specified', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ format: 'console' })

      expect(mockFormat.combine).toHaveBeenCalled()
      expect(mockFormat.colorize).toHaveBeenCalled()
      expect(mockFormat.timestamp).toHaveBeenCalledWith({ format: 'HH:mm:ss' })
      expect(mockFormat.printf).toHaveBeenCalled()
    })

    it('should use json format by default', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ format: 'json' })

      expect(mockFormat.combine).toHaveBeenCalled()
      expect(mockFormat.timestamp).toHaveBeenCalled()
      expect(mockFormat.errors).toHaveBeenCalledWith({ stack: true })
      expect(mockFormat.json).toHaveBeenCalled()
    })

    it('should use default console transport when none provided', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger()

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: expect.arrayContaining([expect.any(Object)]),
        }),
      )
    })

    it('should use custom transports when provided', async () => {
      const { createLogger } = await import('../provider.js')
      const customTransport = new mockConsoleTransport()

      createLogger({ transports: [customTransport] })

      expect(mockCreateLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          transports: [customTransport],
        }),
      )
    })
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

    it('should be created with console format', async () => {
      await import('../provider.js')

      // Provider is created with format: 'console'
      expect(mockFormat.colorize).toHaveBeenCalled()
    })
  })

  describe('logger methods', () => {
    it('should call winston.silly for trace', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.trace('trace message')

      expect(mockSilly).toHaveBeenCalledWith('trace message')
    })

    it('should call winston.debug for debug', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.debug('debug message')

      expect(mockDebug).toHaveBeenCalledWith('debug message')
    })

    it('should call winston.info for info', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('info message')

      expect(mockInfo).toHaveBeenCalledWith('info message')
    })

    it('should call winston.warn for warn', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.warn('warning message')

      expect(mockWarn).toHaveBeenCalledWith('warning message')
    })

    it('should call winston.error for error', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.error('error message')

      expect(mockError).toHaveBeenCalledWith('error message')
    })

    it('should convert multiple arguments to string', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('message', 123, true)

      expect(mockInfo).toHaveBeenCalledWith('message 123 true')
    })

    it('should handle objects by converting to string', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('message', { key: 'value' })

      expect(mockInfo).toHaveBeenCalledWith('message [object Object]')
    })

    it('should handle Error objects', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      const error = new Error('test error')
      logger.error('error:', error)

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('error:'))
    })

    it('should handle single argument', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('single message')

      expect(mockInfo).toHaveBeenCalledWith('single message')
    })

    it('should handle empty arguments', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info()

      expect(mockInfo).toHaveBeenCalledWith('')
    })
  })

  describe('winston exports', () => {
    it('should export transports', async () => {
      const { transports } = await import('../winston.js')

      expect(transports).toBeDefined()
      expect(transports).toBe(mockTransports)
    })

    it('should export format', async () => {
      const { format } = await import('../winston.js')

      expect(format).toBeDefined()
      expect(format).toBe(mockFormat)
    })

    it('should export winston (deprecated)', async () => {
      const { winston } = await import('../winston.js')

      expect(winston).toBeDefined()
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.provider).toBeDefined()
      expect(exports.createLogger).toBeDefined()
      expect(exports.transports).toBeDefined()
      expect(exports.format).toBeDefined()
      expect(exports.winston).toBeDefined()
    })
  })

  describe('Logger interface compliance', () => {
    it('should allow Logger type assignment', async () => {
      const { provider } = await import('../provider.js')

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

  describe('WinstonLoggerOptions', () => {
    it('should accept level option', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() => createLogger({ level: 'debug' })).not.toThrow()
      expect(() => createLogger({ level: 'info' })).not.toThrow()
      expect(() => createLogger({ level: 'warn' })).not.toThrow()
      expect(() => createLogger({ level: 'error' })).not.toThrow()
    })

    it('should accept format option', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() => createLogger({ format: 'json' })).not.toThrow()
      expect(() => createLogger({ format: 'console' })).not.toThrow()
    })

    it('should accept transports option', async () => {
      const { createLogger } = await import('../provider.js')
      const customTransport = new mockConsoleTransport()

      expect(() => createLogger({ transports: [customTransport] })).not.toThrow()
    })

    it('should accept combined options', async () => {
      const { createLogger } = await import('../provider.js')
      const customTransport = new mockConsoleTransport()

      expect(() =>
        createLogger({
          level: 'warn',
          format: 'json',
          transports: [customTransport],
        }),
      ).not.toThrow()
    })
  })

  describe('console format printf function', () => {
    it('should format messages correctly', async () => {
      await import('../provider.js')

      // Get the printf callback
      const printfCall = mockFormat.printf.mock.calls[0]
      expect(printfCall).toBeDefined()

      const formatFn = printfCall[0]

      // Test format without meta
      const result1 = formatFn({
        level: 'info',
        message: 'test message',
        timestamp: '12:34:56',
      })
      expect(result1).toBe('12:34:56 info: test message')

      // Test format with meta
      const result2 = formatFn({
        level: 'warn',
        message: 'warning',
        timestamp: '12:34:56',
        extra: 'data',
      })
      expect(result2).toContain('12:34:56 warn: warning')
      expect(result2).toContain('"extra":"data"')
    })
  })
})
