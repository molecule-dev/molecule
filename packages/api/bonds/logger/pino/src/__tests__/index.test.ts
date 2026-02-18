/**
 * Tests for the pino logger provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock pino before importing the module
const mockTrace = vi.fn()
const mockDebug = vi.fn()
const mockInfo = vi.fn()
const mockWarn = vi.fn()
const mockError = vi.fn()
const mockChild = vi.fn()

const mockLoggerInstance = {
  trace: mockTrace,
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
  child: mockChild,
}

const mockChildLoggerInstance = {
  trace: mockTrace,
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
}

const mockPino = vi.fn(() => mockLoggerInstance)

mockChild.mockReturnValue(mockChildLoggerInstance)

vi.mock('pino', () => ({
  default: mockPino,
}))

vi.mock('@molecule/api-logger', () => ({
  // Type exports only, no runtime values needed
}))

describe('@molecule/api-logger-pino', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
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
      expect(mockPino).toHaveBeenCalled()
    })

    it('should create a logger with info level by default', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger()

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
        }),
      )
    })

    it('should create a logger with trace level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'trace' })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'trace',
        }),
      )
    })

    it('should create a logger with debug level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'debug' })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug',
        }),
      )
    })

    it('should create a logger with warn level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'warn' })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
        }),
      )
    })

    it('should create a logger with error level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'error' })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
        }),
      )
    })

    it('should create a logger with silent level', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ level: 'silent' })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'silent',
        }),
      )
    })

    it('should create a logger with custom name', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ name: 'my-app' })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-app',
        }),
      )
    })

    it('should enable pretty printing when pretty option is true', async () => {
      const { createLogger } = await import('../provider.js')

      createLogger({ pretty: true })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        }),
      )
    })

    it('should use custom transport when provided', async () => {
      const { createLogger } = await import('../provider.js')

      const customTransport = {
        target: 'custom-transport',
        options: { custom: true },
      }

      createLogger({ transport: customTransport })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: customTransport,
        }),
      )
    })

    it('should not include transport when neither pretty nor transport is specified', async () => {
      const { createLogger } = await import('../provider.js')

      // Clear any calls from module initialization (provider export creates one)
      mockPino.mockClear()

      createLogger()

      const callArgs = mockPino.mock.calls[0][0]
      expect(callArgs.transport).toBeUndefined()
    })

    it('should prefer pretty over transport option', async () => {
      const { createLogger } = await import('../provider.js')

      const customTransport = {
        target: 'custom-transport',
        options: { custom: true },
      }

      createLogger({ pretty: true, transport: customTransport })

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: {
            target: 'pino-pretty',
            options: expect.any(Object),
          },
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

    it('should use pretty in non-production environment', async () => {
      process.env.NODE_ENV = 'development'
      vi.resetModules()

      await import('../provider.js')

      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: expect.objectContaining({
            target: 'pino-pretty',
          }),
        }),
      )
    })

    it('should not use pretty in production environment', async () => {
      process.env.NODE_ENV = 'production'
      vi.resetModules()

      await import('../provider.js')

      const callArgs = mockPino.mock.calls[0][0]
      expect(callArgs.transport).toBeUndefined()
    })
  })

  describe('logger methods', () => {
    it('should call pino.trace with single argument', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.trace('trace message')

      expect(mockTrace).toHaveBeenCalledWith('trace message')
    })

    it('should call pino.debug with single argument', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.debug('debug message')

      expect(mockDebug).toHaveBeenCalledWith('debug message')
    })

    it('should call pino.info with single argument', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('info message')

      expect(mockInfo).toHaveBeenCalledWith('info message')
    })

    it('should call pino.warn with single argument', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.warn('warning message')

      expect(mockWarn).toHaveBeenCalledWith('warning message')
    })

    it('should call pino.error with single argument', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.error('error message')

      expect(mockError).toHaveBeenCalledWith('error message')
    })

    it('should pass multiple arguments as array', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('message', 123, true)

      expect(mockInfo).toHaveBeenCalledWith(['message', 123, true])
    })

    it('should handle objects', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      const data = { key: 'value' }
      logger.info(data)

      expect(mockInfo).toHaveBeenCalledWith(data)
    })

    it('should handle Error objects', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      const error = new Error('test error')
      logger.error(error)

      expect(mockError).toHaveBeenCalledWith(error)
    })

    it('should handle empty arguments', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info()

      // Pino calls info with no args when called with no args
      expect(mockInfo).toHaveBeenCalled()
    })
  })

  describe('createChildLogger()', () => {
    it('should create a child logger with bindings', async () => {
      const { createChildLogger } = await import('../provider.js')

      const childLogger = createChildLogger({ requestId: '123', userId: 'abc' })

      expect(childLogger).toBeDefined()
      expect(mockChild).toHaveBeenCalledWith({ requestId: '123', userId: 'abc' })
    })

    it('should return a logger that implements Logger interface', async () => {
      const { createChildLogger } = await import('../provider.js')

      const childLogger = createChildLogger({ component: 'auth' })

      expect(childLogger.trace).toBeDefined()
      expect(childLogger.debug).toBeDefined()
      expect(childLogger.info).toBeDefined()
      expect(childLogger.warn).toBeDefined()
      expect(childLogger.error).toBeDefined()
    })

    it('should call child logger methods correctly', async () => {
      const { createChildLogger } = await import('../provider.js')

      const childLogger = createChildLogger({ service: 'api' })

      childLogger.trace('trace')
      childLogger.debug('debug')
      childLogger.info('info')
      childLogger.warn('warn')
      childLogger.error('error')

      expect(mockTrace).toHaveBeenCalledWith('trace')
      expect(mockDebug).toHaveBeenCalledWith('debug')
      expect(mockInfo).toHaveBeenCalledWith('info')
      expect(mockWarn).toHaveBeenCalledWith('warn')
      expect(mockError).toHaveBeenCalledWith('error')
    })

    it('should handle multiple arguments in child logger', async () => {
      const { createChildLogger } = await import('../provider.js')

      const childLogger = createChildLogger({ module: 'test' })
      childLogger.info('message', { extra: 'data' })

      expect(mockInfo).toHaveBeenCalledWith(['message', { extra: 'data' }])
    })
  })

  describe('pino exports', () => {
    it('should export pino (deprecated)', async () => {
      const { pino } = await import('../pino.js')

      expect(pino).toBeDefined()
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.provider).toBeDefined()
      expect(exports.createLogger).toBeDefined()
      expect(exports.createChildLogger).toBeDefined()
      expect(exports.pino).toBeDefined()
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

  describe('PinoLoggerOptions', () => {
    it('should accept level option', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() => createLogger({ level: 'debug' })).not.toThrow()
      expect(() => createLogger({ level: 'info' })).not.toThrow()
      expect(() => createLogger({ level: 'warn' })).not.toThrow()
      expect(() => createLogger({ level: 'error' })).not.toThrow()
    })

    it('should accept pretty option', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() => createLogger({ pretty: true })).not.toThrow()
      expect(() => createLogger({ pretty: false })).not.toThrow()
    })

    it('should accept name option', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() => createLogger({ name: 'my-logger' })).not.toThrow()
    })

    it('should accept transport option', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() =>
        createLogger({
          transport: {
            target: 'pino/file',
            options: { destination: '/tmp/app.log' },
          },
        }),
      ).not.toThrow()
    })

    it('should accept combined options', async () => {
      const { createLogger } = await import('../provider.js')

      expect(() =>
        createLogger({
          level: 'warn',
          pretty: false,
          name: 'production-logger',
        }),
      ).not.toThrow()
    })
  })

  describe('argument handling', () => {
    it('should pass single argument directly', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('single')

      expect(mockInfo).toHaveBeenCalledWith('single')
    })

    it('should pass multiple arguments as array', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('first', 'second')

      expect(mockInfo).toHaveBeenCalledWith(['first', 'second'])
    })

    it('should handle three or more arguments', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('a', 'b', 'c', 'd')

      expect(mockInfo).toHaveBeenCalledWith(['a', 'b', 'c', 'd'])
    })

    it('should handle mixed argument types', async () => {
      const { createLogger } = await import('../provider.js')

      const logger = createLogger()
      logger.info('message', 42, { data: true }, ['array'])

      expect(mockInfo).toHaveBeenCalledWith(['message', 42, { data: true }, ['array']])
    })
  })
})
