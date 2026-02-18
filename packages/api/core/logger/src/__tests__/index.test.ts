import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Logger, LogLevel } from '../index.js'
import { logger, resetLogger, setLogger } from '../index.js'

describe('@molecule/api-logger', () => {
  // Save original console methods
  const originalConsole = {
    trace: console.trace,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }

  beforeEach(() => {
    // Reset logger to default before each test
    resetLogger()
    // Mock console methods
    console.trace = vi.fn()
    console.debug = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore original console methods
    console.trace = originalConsole.trace
    console.debug = originalConsole.debug
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
    vi.clearAllMocks()
  })

  describe('logger (default console implementation)', () => {
    describe('trace', () => {
      it('should call console.trace with provided arguments', () => {
        logger.trace('test message')
        expect(console.trace).toHaveBeenCalledWith('test message')
      })

      it('should pass multiple arguments to console.trace', () => {
        logger.trace('message', { data: 123 }, 'extra')
        expect(console.trace).toHaveBeenCalledWith('message', { data: 123 }, 'extra')
      })

      it('should handle no arguments', () => {
        logger.trace()
        expect(console.trace).toHaveBeenCalledWith()
      })
    })

    describe('debug', () => {
      it('should call console.debug with provided arguments', () => {
        logger.debug('debug message')
        expect(console.debug).toHaveBeenCalledWith('debug message')
      })

      it('should pass multiple arguments to console.debug', () => {
        logger.debug('message', 123, true, null)
        expect(console.debug).toHaveBeenCalledWith('message', 123, true, null)
      })

      it('should handle objects and arrays', () => {
        const obj = { key: 'value' }
        const arr = [1, 2, 3]
        logger.debug(obj, arr)
        expect(console.debug).toHaveBeenCalledWith(obj, arr)
      })
    })

    describe('info', () => {
      it('should call console.info with provided arguments', () => {
        logger.info('info message')
        expect(console.info).toHaveBeenCalledWith('info message')
      })

      it('should pass multiple arguments to console.info', () => {
        logger.info('message', { id: 1 })
        expect(console.info).toHaveBeenCalledWith('message', { id: 1 })
      })

      it('should handle undefined and null values', () => {
        logger.info(undefined, null)
        expect(console.info).toHaveBeenCalledWith(undefined, null)
      })
    })

    describe('warn', () => {
      it('should call console.warn with provided arguments', () => {
        logger.warn('warning message')
        expect(console.warn).toHaveBeenCalledWith('warning message')
      })

      it('should pass multiple arguments to console.warn', () => {
        logger.warn('warning', new Error('test error'))
        expect(console.warn).toHaveBeenCalledWith('warning', expect.any(Error))
      })
    })

    describe('error', () => {
      it('should call console.error with provided arguments', () => {
        logger.error('error message')
        expect(console.error).toHaveBeenCalledWith('error message')
      })

      it('should pass Error objects to console.error', () => {
        const error = new Error('Something went wrong')
        logger.error(error)
        expect(console.error).toHaveBeenCalledWith(error)
      })

      it('should pass multiple arguments including Error to console.error', () => {
        const error = new Error('Database connection failed')
        logger.error('Fatal error:', error, { retryCount: 3 })
        expect(console.error).toHaveBeenCalledWith('Fatal error:', error, { retryCount: 3 })
      })
    })
  })

  describe('setLogger', () => {
    it('should replace the default logger with a custom implementation', () => {
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
      expect(console.info).not.toHaveBeenCalled()
    })

    it('should use custom logger for all log methods', () => {
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

      // Console should not have been called
      expect(console.trace).not.toHaveBeenCalled()
      expect(console.debug).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should allow replacing logger multiple times', () => {
      const firstLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      const secondLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(firstLogger)
      logger.info('first')
      expect(firstLogger.info).toHaveBeenCalledWith('first')

      setLogger(secondLogger)
      logger.info('second')
      expect(secondLogger.info).toHaveBeenCalledWith('second')
      expect(firstLogger.info).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should pass all arguments to custom logger', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)

      const complexObject = { nested: { deep: { value: 42 } } }
      const error = new Error('test')
      const array = [1, 2, 3]

      logger.error('Error occurred:', error, complexObject, array, undefined, null)

      expect(customLogger.error).toHaveBeenCalledWith(
        'Error occurred:',
        error,
        complexObject,
        array,
        undefined,
        null,
      )
    })
  })

  describe('resetLogger', () => {
    it('should restore the default console logger', () => {
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
      expect(console.info).toHaveBeenCalledWith('default')
      expect(customLogger.info).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should be idempotent when called multiple times', () => {
      resetLogger()
      resetLogger()
      resetLogger()

      logger.info('test')
      expect(console.info).toHaveBeenCalledWith('test')
    })

    it('should restore all log methods to console', () => {
      const customLogger: Logger = {
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      setLogger(customLogger)
      resetLogger()

      logger.trace('trace')
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(console.trace).toHaveBeenCalledWith('trace')
      expect(console.debug).toHaveBeenCalledWith('debug')
      expect(console.info).toHaveBeenCalledWith('info')
      expect(console.warn).toHaveBeenCalledWith('warn')
      expect(console.error).toHaveBeenCalledWith('error')

      // Custom logger should not be called after reset
      expect(customLogger.trace).not.toHaveBeenCalled()
      expect(customLogger.debug).not.toHaveBeenCalled()
      expect(customLogger.info).not.toHaveBeenCalled()
      expect(customLogger.warn).not.toHaveBeenCalled()
      expect(customLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('Logger type interface', () => {
    it('should accept any implementation that satisfies the Logger interface', () => {
      // This test verifies the type system at runtime
      const minimalLogger: Logger = {
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      }

      // Should not throw
      setLogger(minimalLogger)
      logger.info('test')
    })

    it('should work with a buffering logger implementation', () => {
      const buffer: Array<{ level: string; args: unknown[] }> = []

      const bufferingLogger: Logger = {
        trace: (...args) => buffer.push({ level: 'trace', args }),
        debug: (...args) => buffer.push({ level: 'debug', args }),
        info: (...args) => buffer.push({ level: 'info', args }),
        warn: (...args) => buffer.push({ level: 'warn', args }),
        error: (...args) => buffer.push({ level: 'error', args }),
      }

      setLogger(bufferingLogger)

      logger.info('message 1')
      logger.error('message 2', { code: 500 })
      logger.debug('message 3')

      expect(buffer).toEqual([
        { level: 'info', args: ['message 1'] },
        { level: 'error', args: ['message 2', { code: 500 }] },
        { level: 'debug', args: ['message 3'] },
      ])
    })

    it('should work with a prefixing logger implementation', () => {
      const prefixedMessages: string[] = []

      const prefixingLogger: Logger = {
        trace: (...args) => prefixedMessages.push(`[TRACE] ${args.join(' ')}`),
        debug: (...args) => prefixedMessages.push(`[DEBUG] ${args.join(' ')}`),
        info: (...args) => prefixedMessages.push(`[INFO] ${args.join(' ')}`),
        warn: (...args) => prefixedMessages.push(`[WARN] ${args.join(' ')}`),
        error: (...args) => prefixedMessages.push(`[ERROR] ${args.join(' ')}`),
      }

      setLogger(prefixingLogger)

      logger.info('Application', 'started')
      logger.warn('Memory', 'usage', 'high')
      logger.error('Fatal', 'error')

      expect(prefixedMessages).toEqual([
        '[INFO] Application started',
        '[WARN] Memory usage high',
        '[ERROR] Fatal error',
      ])
    })
  })

  describe('LogLevel type', () => {
    it('should include all expected log levels', () => {
      // This test documents and verifies the expected log levels
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'silent']

      // Verify all levels are valid LogLevel values (TypeScript enforces this at compile time)
      expect(levels).toContain('trace')
      expect(levels).toContain('debug')
      expect(levels).toContain('info')
      expect(levels).toContain('warn')
      expect(levels).toContain('error')
      expect(levels).toContain('silent')
      expect(levels).toHaveLength(6)
    })

    it('should be usable in a level-filtering logger', () => {
      const logLevels: Record<Exclude<LogLevel, 'silent'>, number> = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
      }

      let currentLevel: LogLevel = 'warn'
      const logged: Array<{ level: Exclude<LogLevel, 'silent'>; message: string }> = []

      const filteringLogger: Logger = {
        trace: (msg: unknown) => {
          if (
            currentLevel !== 'silent' &&
            logLevels.trace >= logLevels[currentLevel as Exclude<LogLevel, 'silent'>]
          ) {
            logged.push({ level: 'trace', message: String(msg) })
          }
        },
        debug: (msg: unknown) => {
          if (
            currentLevel !== 'silent' &&
            logLevels.debug >= logLevels[currentLevel as Exclude<LogLevel, 'silent'>]
          ) {
            logged.push({ level: 'debug', message: String(msg) })
          }
        },
        info: (msg: unknown) => {
          if (
            currentLevel !== 'silent' &&
            logLevels.info >= logLevels[currentLevel as Exclude<LogLevel, 'silent'>]
          ) {
            logged.push({ level: 'info', message: String(msg) })
          }
        },
        warn: (msg: unknown) => {
          if (
            currentLevel !== 'silent' &&
            logLevels.warn >= logLevels[currentLevel as Exclude<LogLevel, 'silent'>]
          ) {
            logged.push({ level: 'warn', message: String(msg) })
          }
        },
        error: (msg: unknown) => {
          if (
            currentLevel !== 'silent' &&
            logLevels.error >= logLevels[currentLevel as Exclude<LogLevel, 'silent'>]
          ) {
            logged.push({ level: 'error', message: String(msg) })
          }
        },
      }

      setLogger(filteringLogger)

      // With level 'warn', only warn and error should be logged
      logger.trace('trace msg')
      logger.debug('debug msg')
      logger.info('info msg')
      logger.warn('warn msg')
      logger.error('error msg')

      expect(logged).toEqual([
        { level: 'warn', message: 'warn msg' },
        { level: 'error', message: 'error msg' },
      ])

      // Change level to 'debug' and log more
      logged.length = 0
      currentLevel = 'debug'

      logger.trace('trace msg 2')
      logger.debug('debug msg 2')
      logger.info('info msg 2')

      expect(logged).toEqual([
        { level: 'debug', message: 'debug msg 2' },
        { level: 'info', message: 'info msg 2' },
      ])

      // Test silent level
      logged.length = 0
      currentLevel = 'silent'

      logger.error('should not appear')
      expect(logged).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle logging circular references', () => {
      const circular: Record<string, unknown> = { name: 'test' }
      circular.self = circular

      // Should not throw
      expect(() => logger.info('circular:', circular)).not.toThrow()
      expect(console.info).toHaveBeenCalledWith('circular:', circular)
    })

    it('should handle logging symbols', () => {
      const sym = Symbol('test-symbol')
      logger.debug('symbol:', sym)
      expect(console.debug).toHaveBeenCalledWith('symbol:', sym)
    })

    it('should handle logging functions', () => {
      const fn = (): string => 'result'
      logger.info('function:', fn)
      expect(console.info).toHaveBeenCalledWith('function:', fn)
    })

    it('should handle logging very large arrays', () => {
      const largeArray = new Array(10000).fill(0).map((_, i) => i)
      logger.debug('large array:', largeArray)
      expect(console.debug).toHaveBeenCalledWith('large array:', largeArray)
    })

    it('should handle logging special number values', () => {
      logger.info(NaN, Infinity, -Infinity, 0, -0)
      expect(console.info).toHaveBeenCalledWith(NaN, Infinity, -Infinity, 0, -0)
    })

    it('should handle logging BigInt values', () => {
      const bigInt = BigInt(9007199254740991)
      logger.info('bigint:', bigInt)
      expect(console.info).toHaveBeenCalledWith('bigint:', bigInt)
    })

    it('should handle logging Date objects', () => {
      const date = new Date('2024-01-01T00:00:00Z')
      logger.info('date:', date)
      expect(console.info).toHaveBeenCalledWith('date:', date)
    })

    it('should handle logging RegExp objects', () => {
      const regex = /test-pattern/gi
      logger.debug('regex:', regex)
      expect(console.debug).toHaveBeenCalledWith('regex:', regex)
    })

    it('should handle logging Map and Set objects', () => {
      const map = new Map([['key', 'value']])
      const set = new Set([1, 2, 3])
      logger.info('map:', map, 'set:', set)
      expect(console.info).toHaveBeenCalledWith('map:', map, 'set:', set)
    })

    it('should handle logging typed arrays', () => {
      const uint8 = new Uint8Array([1, 2, 3, 4])
      const float64 = new Float64Array([1.1, 2.2, 3.3])
      logger.debug('typed arrays:', uint8, float64)
      expect(console.debug).toHaveBeenCalledWith('typed arrays:', uint8, float64)
    })

    it('should handle logging ArrayBuffer', () => {
      const buffer = new ArrayBuffer(8)
      logger.info('buffer:', buffer)
      expect(console.info).toHaveBeenCalledWith('buffer:', buffer)
    })

    it('should handle rapid sequential logging', () => {
      for (let i = 0; i < 100; i++) {
        logger.info(`message ${i}`)
      }
      expect(console.info).toHaveBeenCalledTimes(100)
    })

    it('should handle empty string arguments', () => {
      logger.info('')
      logger.info('', '', '')
      expect(console.info).toHaveBeenNthCalledWith(1, '')
      expect(console.info).toHaveBeenNthCalledWith(2, '', '', '')
    })

    it('should handle mixed argument types', () => {
      const mixedArgs = [
        'string',
        123,
        true,
        false,
        null,
        undefined,
        { obj: true },
        ['array'],
        new Error('err'),
        Symbol('sym'),
        BigInt(999),
      ]

      logger.info(...mixedArgs)
      expect(console.info).toHaveBeenCalledWith(...mixedArgs)
    })
  })

  describe('module exports', () => {
    it('should export logger as a singleton', async () => {
      // Import twice and verify it's the same instance
      const { logger: logger1 } = await import('../index.js')
      const { logger: logger2 } = await import('../index.js')

      expect(logger1).toBe(logger2)
    })

    it('should export setLogger function', async () => {
      const { setLogger } = await import('../index.js')
      expect(typeof setLogger).toBe('function')
    })

    it('should export resetLogger function', async () => {
      const { resetLogger } = await import('../index.js')
      expect(typeof resetLogger).toBe('function')
    })
  })

  describe('concurrent logger switching', () => {
    it('should handle switching logger during active logging', () => {
      const logs1: string[] = []
      const logs2: string[] = []

      const logger1: Logger = {
        trace: () => {},
        debug: () => {},
        info: (msg) => logs1.push(String(msg)),
        warn: () => {},
        error: () => {},
      }

      const logger2: Logger = {
        trace: () => {},
        debug: () => {},
        info: (msg) => logs2.push(String(msg)),
        warn: () => {},
        error: () => {},
      }

      setLogger(logger1)
      logger.info('msg1')
      setLogger(logger2)
      logger.info('msg2')
      setLogger(logger1)
      logger.info('msg3')

      expect(logs1).toEqual(['msg1', 'msg3'])
      expect(logs2).toEqual(['msg2'])
    })
  })
})
