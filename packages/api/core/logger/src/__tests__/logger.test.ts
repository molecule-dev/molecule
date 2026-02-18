import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as LoggerModule from '../logger.js'
import type { Logger, LogLevel } from '../types.js'

// We need to reset the module state between tests
let logger: typeof LoggerModule.logger
let setLogger: typeof LoggerModule.setLogger
let resetLogger: typeof LoggerModule.resetLogger

describe('logger', () => {
  const consoleMocks = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()

    // Mock console methods
    vi.spyOn(console, 'trace').mockImplementation(consoleMocks.trace)
    vi.spyOn(console, 'debug').mockImplementation(consoleMocks.debug)
    vi.spyOn(console, 'info').mockImplementation(consoleMocks.info)
    vi.spyOn(console, 'warn').mockImplementation(consoleMocks.warn)
    vi.spyOn(console, 'error').mockImplementation(consoleMocks.error)

    const loggerModule = await import('../logger.js')
    logger = loggerModule.logger
    setLogger = loggerModule.setLogger
    resetLogger = loggerModule.resetLogger
  })

  afterEach(() => {
    vi.restoreAllMocks()
    consoleMocks.trace.mockClear()
    consoleMocks.debug.mockClear()
    consoleMocks.info.mockClear()
    consoleMocks.warn.mockClear()
    consoleMocks.error.mockClear()
  })

  describe('default console logger', () => {
    it('should call console.trace for trace', () => {
      logger.trace('trace message', { data: 'value' })

      expect(consoleMocks.trace).toHaveBeenCalledWith('trace message', { data: 'value' })
    })

    it('should call console.debug for debug', () => {
      logger.debug('debug message')

      expect(consoleMocks.debug).toHaveBeenCalledWith('debug message')
    })

    it('should call console.info for info', () => {
      logger.info('info message', 42)

      expect(consoleMocks.info).toHaveBeenCalledWith('info message', 42)
    })

    it('should call console.warn for warn', () => {
      logger.warn('warning message')

      expect(consoleMocks.warn).toHaveBeenCalledWith('warning message')
    })

    it('should call console.error for error', () => {
      const error = new Error('test error')
      logger.error('error message', error)

      expect(consoleMocks.error).toHaveBeenCalledWith('error message', error)
    })

    it('should handle multiple arguments', () => {
      logger.info('message', 1, 2, 3, { key: 'value' })

      expect(consoleMocks.info).toHaveBeenCalledWith('message', 1, 2, 3, { key: 'value' })
    })
  })

  describe('setLogger', () => {
    it('should replace the logger implementation', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)

      logger.info('test message')

      expect(customLogger.info).toHaveBeenCalledWith('test message')
      expect(consoleMocks.info).not.toHaveBeenCalled()
    })

    it('should use custom logger for all levels', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)

      logger.trace('trace')
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(customLogger.trace).toHaveBeenCalledWith('trace')
      expect(customLogger.debug).toHaveBeenCalledWith('debug')
      expect(customLogger.info).toHaveBeenCalledWith('info')
      expect(customLogger.warn).toHaveBeenCalledWith('warn')
      expect(customLogger.error).toHaveBeenCalledWith('error')
    })
  })

  describe('resetLogger', () => {
    it('should reset to default console logger', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)
      logger.info('custom')
      expect(customLogger.info).toHaveBeenCalledWith('custom')

      resetLogger()
      logger.info('default')
      expect(consoleMocks.info).toHaveBeenCalledWith('default')
    })
  })

  describe('logger proxy behavior', () => {
    it('should always use current logger implementation', () => {
      const logger1: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }
      const logger2: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(logger1)
      logger.info('first')
      expect(logger1.info).toHaveBeenCalledWith('first')

      setLogger(logger2)
      logger.info('second')
      expect(logger2.info).toHaveBeenCalledWith('second')
      expect(logger1.info).not.toHaveBeenCalledWith('second')
    })
  })
})

describe('logger types', () => {
  it('should export LogLevel type', () => {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'silent']
    expect(levels).toHaveLength(6)
  })

  it('should export Logger interface', () => {
    const testLogger: Logger = {
      trace: (..._args: unknown[]) => {},
      debug: (..._args: unknown[]) => {},
      info: (..._args: unknown[]) => {},
      warn: (..._args: unknown[]) => {},
      error: (..._args: unknown[]) => {},
    }

    expect(typeof testLogger.trace).toBe('function')
    expect(typeof testLogger.debug).toBe('function')
    expect(typeof testLogger.info).toBe('function')
    expect(typeof testLogger.warn).toBe('function')
    expect(typeof testLogger.error).toBe('function')
  })

  it('should allow various argument types', () => {
    const mockLogger: Logger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    // All these should be valid calls
    mockLogger.info('string message')
    mockLogger.info('message with number', 42)
    mockLogger.info('message with object', { key: 'value' })
    mockLogger.info('message with array', [1, 2, 3])
    mockLogger.error('error', new Error('test'))
    mockLogger.info() // no args should also be valid

    expect(mockLogger.info).toHaveBeenCalledTimes(5)
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
  })
})
