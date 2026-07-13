import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as BondModule from '@molecule/api-bond'

import type * as LoggerModule from '../logger.js'
import type { Logger, LogLevel } from '../types.js'

// We need to reset the module state between tests
let logger: typeof LoggerModule.logger
let setLogger: typeof LoggerModule.setLogger
let resetLogger: typeof LoggerModule.resetLogger
let setLevel: typeof LoggerModule.setLevel
let getLevel: typeof LoggerModule.getLevel
let hasLogger: typeof LoggerModule.hasLogger
let bond: typeof BondModule.bond

describe('logger', () => {
  const consoleMocks = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
  const originalLogLevel = process.env.LOG_LEVEL

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
    setLevel = loggerModule.setLevel
    getLevel = loggerModule.getLevel
    hasLogger = loggerModule.hasLogger

    // Resolve the SAME `@molecule/api-bond` module instance that
    // `../logger.js` pulled into this fresh module registry, so `bond()`
    // here mutates the exact registry `hasLogger()`/`getCurrentLogger()`
    // read from.
    const bondModule = await import('@molecule/api-bond')
    bond = bondModule.bond
  })

  afterEach(() => {
    vi.restoreAllMocks()
    consoleMocks.trace.mockClear()
    consoleMocks.debug.mockClear()
    consoleMocks.info.mockClear()
    consoleMocks.warn.mockClear()
    consoleMocks.error.mockClear()
    if (originalLogLevel === undefined) delete process.env.LOG_LEVEL
    else process.env.LOG_LEVEL = originalLogLevel
  })

  describe('default console logger', () => {
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

    it('should suppress trace and debug at default info level', () => {
      logger.trace('trace message')
      logger.debug('debug message')

      expect(consoleMocks.trace).not.toHaveBeenCalled()
      expect(consoleMocks.debug).not.toHaveBeenCalled()
    })
  })

  describe('setLevel / getLevel', () => {
    it('should default to info', () => {
      expect(getLevel()).toBe('info')
    })

    it('should allow trace and debug when level is trace', () => {
      setLevel('trace')
      logger.trace('trace message', { data: 'value' })
      logger.debug('debug message')

      expect(consoleMocks.trace).toHaveBeenCalledWith('trace message', { data: 'value' })
      expect(consoleMocks.debug).toHaveBeenCalledWith('debug message')
    })

    it('should allow debug but not trace when level is debug', () => {
      setLevel('debug')
      logger.trace('trace message')
      logger.debug('debug message')

      expect(consoleMocks.trace).not.toHaveBeenCalled()
      expect(consoleMocks.debug).toHaveBeenCalledWith('debug message')
    })

    it('should suppress info when level is warn', () => {
      setLevel('warn')
      logger.info('info message')
      logger.warn('warning message')

      expect(consoleMocks.info).not.toHaveBeenCalled()
      expect(consoleMocks.warn).toHaveBeenCalledWith('warning message')
    })

    it('should suppress everything when level is silent', () => {
      setLevel('silent')
      logger.trace('t')
      logger.debug('d')
      logger.info('i')
      logger.warn('w')
      logger.error('e')

      expect(consoleMocks.trace).not.toHaveBeenCalled()
      expect(consoleMocks.debug).not.toHaveBeenCalled()
      expect(consoleMocks.info).not.toHaveBeenCalled()
      expect(consoleMocks.warn).not.toHaveBeenCalled()
      expect(consoleMocks.error).not.toHaveBeenCalled()
    })
  })

  describe('LOG_LEVEL resolved lazily (env-assumption fix)', () => {
    it('honors LOG_LEVEL set AFTER this module was first imported', async () => {
      // Simulate an app whose dotenv/.env load happens after its first
      // transitive import of @molecule/api-logger: LOG_LEVEL is unset at
      // import time...
      delete process.env.LOG_LEVEL
      vi.resetModules()
      const fresh = await import('../logger.js')

      // ...then becomes set only afterward, before the FIRST log call.
      process.env.LOG_LEVEL = 'debug'

      fresh.logger.debug('debug message')

      // On the pre-fix code (level captured once at module-import time),
      // this would still be gated at the 'info' default and never reach
      // console.debug — this assertion fails without the lazy-resolution fix.
      expect(consoleMocks.debug).toHaveBeenCalledWith('debug message')
      expect(fresh.getLevel()).toBe('debug')
    })

    it('still defaults to info when LOG_LEVEL is never set', async () => {
      delete process.env.LOG_LEVEL
      vi.resetModules()
      const fresh = await import('../logger.js')

      expect(fresh.getLevel()).toBe('info')
    })

    it('setLevel() always overrides the resolved/cached env value', async () => {
      process.env.LOG_LEVEL = 'error'
      vi.resetModules()
      const fresh = await import('../logger.js')

      expect(fresh.getLevel()).toBe('error')

      fresh.setLevel('trace')
      expect(fresh.getLevel()).toBe('trace')
    })
  })

  describe('hasLogger (bond-registry-derived, ambiguous-failure fix)', () => {
    it('returns false before any provider is bonded', () => {
      expect(hasLogger()).toBe(false)
    })

    it('returns true after setLogger()', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)

      expect(hasLogger()).toBe(true)
    })

    it('returns false again after resetLogger()', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)
      resetLogger()

      expect(hasLogger()).toBe(false)
    })

    it('returns true when a provider is wired directly via bond("logger", provider) — bypassing setLogger()', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      // On the pre-fix code, hasLogger() tracked a module-private flag set
      // ONLY by setLogger(), so a provider wired via the raw bond() call
      // (the same path every bond package's getLogger() honors) left
      // hasLogger() reporting false while a custom logger was actively in
      // use — this assertion fails without the bond-registry-derived fix.
      bond('logger', customLogger)

      expect(hasLogger()).toBe(true)
      logger.info('routed through the directly-bonded provider')
      expect(customLogger.info).toHaveBeenCalledWith('routed through the directly-bonded provider')
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

    it('should use custom logger for all levels when level is trace', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLevel('trace')
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
