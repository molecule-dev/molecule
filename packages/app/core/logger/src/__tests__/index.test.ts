/**
 * Comprehensive tests for `@molecule/app-logger` module.
 *
 * Tests logging functionality, log levels, transports,
 * console logger, and provider management.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  LogEntry,
  Logger,
  LoggerConfig,
  LoggerProvider,
  LogLevel,
  LogTransport,
} from '../index.js'
import {
  createConsoleLogger,
  createConsoleLoggerProvider,
  createLogger,
  createRemoteTransport,
  debug,
  defaultFormat,
  error,
  getLevel,
  getLogger,
  getProvider,
  info,
  LOG_LEVEL_PRIORITY,
  setLevel,
  setProvider,
  trace,
  warn,
} from '../index.js'

// Mock localStorage globally before any tests run
const mockLocalStorage = (() => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      Object.keys(store).forEach((k) => delete store[k])
    },
    get length(): number {
      return Object.keys(store).length
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
})

describe('@molecule/app-logger', () => {
  // Mock console methods
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockLocalStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Types compile correctly', () => {
    it('should compile LogLevel type', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'silent']
      expect(levels).toHaveLength(6)
    })

    it('should compile LogEntry type', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test message',
        args: ['arg1', 'arg2'],
        timestamp: new Date(),
        logger: 'test',
        context: { key: 'value' },
      }
      expect(entry.level).toBe('info')
    })

    it('should compile LogTransport type', () => {
      const transport: LogTransport = (entry: LogEntry) => {
        expect(entry).toBeDefined()
      }
      transport({ level: 'info', message: 'test', args: [], timestamp: new Date() })
    })

    it('should compile LoggerConfig type', () => {
      const config: LoggerConfig = {
        level: 'debug',
        name: 'TestLogger',
        transports: [],
        timestamps: true,
        format: defaultFormat,
        context: { app: 'test' },
      }
      expect(config.level).toBe('debug')
    })

    it('should compile Logger interface', () => {
      const logger: Logger = createConsoleLogger()
      expect(typeof logger.trace).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.setLevel).toBe('function')
      expect(typeof logger.getLevel).toBe('function')
      expect(typeof logger.child).toBe('function')
      expect(typeof logger.withContext).toBe('function')
      expect(typeof logger.addTransport).toBe('function')
      expect(typeof logger.removeTransport).toBe('function')
    })

    it('should compile LoggerProvider interface', () => {
      const provider: LoggerProvider = createConsoleLoggerProvider()
      expect(typeof provider.getLogger).toBe('function')
      expect(typeof provider.createLogger).toBe('function')
      expect(typeof provider.setLevel).toBe('function')
      expect(typeof provider.getLevel).toBe('function')
      expect(typeof provider.addTransport).toBe('function')
      expect(typeof provider.enable).toBe('function')
      expect(typeof provider.disable).toBe('function')
      expect(typeof provider.isEnabled).toBe('function')
    })
  })

  describe('LOG_LEVEL_PRIORITY', () => {
    it('should have correct priority order', () => {
      expect(LOG_LEVEL_PRIORITY.trace).toBeLessThan(LOG_LEVEL_PRIORITY.debug)
      expect(LOG_LEVEL_PRIORITY.debug).toBeLessThan(LOG_LEVEL_PRIORITY.info)
      expect(LOG_LEVEL_PRIORITY.info).toBeLessThan(LOG_LEVEL_PRIORITY.warn)
      expect(LOG_LEVEL_PRIORITY.warn).toBeLessThan(LOG_LEVEL_PRIORITY.error)
      expect(LOG_LEVEL_PRIORITY.error).toBeLessThan(LOG_LEVEL_PRIORITY.silent)
    })

    it('should include all log levels', () => {
      expect(LOG_LEVEL_PRIORITY).toHaveProperty('trace')
      expect(LOG_LEVEL_PRIORITY).toHaveProperty('debug')
      expect(LOG_LEVEL_PRIORITY).toHaveProperty('info')
      expect(LOG_LEVEL_PRIORITY).toHaveProperty('warn')
      expect(LOG_LEVEL_PRIORITY).toHaveProperty('error')
      expect(LOG_LEVEL_PRIORITY).toHaveProperty('silent')
    })
  })

  describe('defaultFormat', () => {
    it('should format log entry correctly', () => {
      const entry: LogEntry = {
        level: 'info',
        message: 'Test message',
        args: [],
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
      }

      const formatted = defaultFormat(entry)

      expect(formatted).toContain('2024-01-15')
      expect(formatted).toContain('INFO')
      expect(formatted).toContain('Test message')
    })

    it('should include logger name when present', () => {
      const entry: LogEntry = {
        level: 'warn',
        message: 'Warning message',
        args: [],
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
        logger: 'MyLogger',
      }

      const formatted = defaultFormat(entry)

      expect(formatted).toContain('[MyLogger]')
      expect(formatted).toContain('WARN')
    })

    it('should handle all log levels', () => {
      const levels: Array<Exclude<LogLevel, 'silent'>> = ['trace', 'debug', 'info', 'warn', 'error']

      for (const level of levels) {
        const entry: LogEntry = {
          level,
          message: 'Test',
          args: [],
          timestamp: new Date(),
        }
        const formatted = defaultFormat(entry)
        expect(formatted).toContain(level.toUpperCase())
      }
    })
  })

  describe('createRemoteTransport', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.useRealTimers()
    })

    it('should create a transport function', () => {
      const transport = createRemoteTransport({ url: 'https://example.com/logs' })
      expect(typeof transport).toBe('function')
    })

    it('should filter entries below minLevel', () => {
      const transport = createRemoteTransport({
        url: 'https://example.com/logs',
        minLevel: 'error',
      })

      const entry: LogEntry = {
        level: 'info',
        message: 'Info message',
        args: [],
        timestamp: new Date(),
      }

      transport(entry)
      vi.advanceTimersByTime(6000)

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should send entries at or above minLevel', () => {
      const transport = createRemoteTransport({
        url: 'https://example.com/logs',
        minLevel: 'warn',
        batchSize: 1,
      })

      const entry: LogEntry = {
        level: 'error',
        message: 'Error message',
        args: [],
        timestamp: new Date(),
      }

      transport(entry)

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      )
    })

    it('should batch entries', () => {
      const transport = createRemoteTransport({
        url: 'https://example.com/logs',
        batchSize: 3,
      })

      for (let i = 0; i < 2; i++) {
        transport({
          level: 'error',
          message: `Message ${i}`,
          args: [],
          timestamp: new Date(),
        })
      }

      // Not enough entries yet
      expect(fetchMock).not.toHaveBeenCalled()

      // Add one more to reach batch size
      transport({
        level: 'error',
        message: 'Message 2',
        args: [],
        timestamp: new Date(),
      })

      expect(fetchMock).toHaveBeenCalled()
    })

    it('should flush on interval', () => {
      const transport = createRemoteTransport({
        url: 'https://example.com/logs',
        batchSize: 100,
        flushInterval: 5000,
      })

      transport({
        level: 'error',
        message: 'Test message',
        args: [],
        timestamp: new Date(),
      })

      expect(fetchMock).not.toHaveBeenCalled()

      vi.advanceTimersByTime(5000)

      expect(fetchMock).toHaveBeenCalled()
    })

    it('should include custom headers', () => {
      const transport = createRemoteTransport({
        url: 'https://example.com/logs',
        batchSize: 1,
        headers: { Authorization: 'Bearer token123' },
      })

      transport({
        level: 'error',
        message: 'Test message',
        args: [],
        timestamp: new Date(),
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/logs',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should handle fetch errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const transport = createRemoteTransport({
        url: 'https://example.com/logs',
        batchSize: 1,
      })

      // Should not throw
      expect(() => {
        transport({
          level: 'error',
          message: 'Test message',
          args: [],
          timestamp: new Date(),
        })
      }).not.toThrow()
    })
  })

  describe('createConsoleLogger', () => {
    it('should create a logger with default config', () => {
      const logger = createConsoleLogger()

      expect(logger.getLevel()).toBe('info')
    })

    it('should respect initial log level', () => {
      const logger = createConsoleLogger({ level: 'warn' })

      expect(logger.getLevel()).toBe('warn')
    })

    it('should filter logs below current level', () => {
      const logger = createConsoleLogger({ level: 'warn' })

      logger.debug('Debug message')
      logger.info('Info message')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })

    it('should log messages at or above current level', () => {
      const logger = createConsoleLogger({ level: 'info' })

      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should change level dynamically', () => {
      const logger = createConsoleLogger({ level: 'error' })

      logger.info('Should not log')
      expect(consoleInfoSpy).not.toHaveBeenCalled()

      logger.setLevel('info')

      logger.info('Should log')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    it('should handle trace level (maps to console.debug)', () => {
      const logger = createConsoleLogger({ level: 'trace' })

      logger.trace('Trace message')

      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    it('should handle Error objects', () => {
      const logger = createConsoleLogger({ level: 'error' })
      const testError = new Error('Test error')

      logger.error(testError)

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), testError)
    })

    it('should handle Error objects with additional args', () => {
      const logger = createConsoleLogger({ level: 'error' })
      const testError = new Error('Test error')

      logger.error(testError, 'additional', 'args')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        testError,
        'additional',
        'args',
      )
    })

    it('should include name prefix when set', () => {
      const logger = createConsoleLogger({ name: 'TestLogger', level: 'info' })

      logger.info('Test message')

      expect(consoleInfoSpy).toHaveBeenCalledWith('[TestLogger]', 'Test message')
    })

    it('should create child logger with namespace', () => {
      const parent = createConsoleLogger({ name: 'Parent', level: 'info' })
      const child = parent.child('Child')

      child.info('Child message')

      expect(consoleInfoSpy).toHaveBeenCalledWith('[Parent:Child]', 'Child message')
    })

    it('should merge context in child logger', () => {
      const transport = vi.fn()
      const parent = createConsoleLogger({
        name: 'Parent',
        level: 'info',
        transports: [transport],
        context: { parentKey: 'parentValue' },
      })

      const child = parent.child('Child', { childKey: 'childValue' })
      child.info('Test')

      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            parentKey: 'parentValue',
            childKey: 'childValue',
          }),
        }),
      )
    })

    it('should add and use context via withContext', () => {
      const transport = vi.fn()
      const logger = createConsoleLogger({
        level: 'info',
        transports: [transport],
      })

      logger.withContext({ requestId: '123' })
      logger.info('Test message')

      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ requestId: '123' }),
        }),
      )
    })

    it('should add and remove transports', () => {
      const logger = createConsoleLogger({ level: 'info' })
      const transport = vi.fn()

      const removeTransport = logger.addTransport(transport)
      logger.info('Test message')

      expect(transport).toHaveBeenCalledTimes(1)

      removeTransport()
      logger.info('Another message')

      expect(transport).toHaveBeenCalledTimes(1) // Still only 1
    })

    it('should remove transport via removeTransport', () => {
      const logger = createConsoleLogger({ level: 'info' })
      const transport = vi.fn()

      logger.addTransport(transport)
      logger.info('Message 1')
      expect(transport).toHaveBeenCalledTimes(1)

      logger.removeTransport(transport)
      logger.info('Message 2')
      expect(transport).toHaveBeenCalledTimes(1)
    })

    it('should handle transport errors gracefully', () => {
      const logger = createConsoleLogger({ level: 'info' })
      const errorTransport = vi.fn().mockImplementation(() => {
        throw new Error('Transport error')
      })

      logger.addTransport(errorTransport)

      // Should not throw
      expect(() => logger.info('Test message')).not.toThrow()
    })

    it('should format with timestamps when enabled', () => {
      const logger = createConsoleLogger({
        level: 'info',
        timestamps: true,
      })

      logger.info('Test message')

      expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringMatching(/\d{4}-\d{2}-\d{2}/))
    })

    it('should use custom format function', () => {
      const customFormat = vi.fn().mockReturnValue('CUSTOM FORMAT')
      const logger = createConsoleLogger({
        level: 'info',
        timestamps: true,
        format: customFormat,
      })

      logger.info('Test message')

      expect(customFormat).toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalledWith('CUSTOM FORMAT')
    })
  })

  describe('createConsoleLoggerProvider', () => {
    it('should create a provider with default level', () => {
      const provider = createConsoleLoggerProvider()

      expect(provider.getLevel()).toBe('info')
    })

    it('should create a provider with custom default level', () => {
      const provider = createConsoleLoggerProvider('debug')

      expect(provider.getLevel()).toBe('debug')
    })

    it('should return root logger', () => {
      const provider = createConsoleLoggerProvider()
      const logger = provider.getLogger()

      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
    })

    it('should create named loggers', () => {
      const provider = createConsoleLoggerProvider()
      const logger = provider.createLogger('MyService')

      logger.info('Test message')

      expect(consoleInfoSpy).toHaveBeenCalledWith('[MyService]', 'Test message')
    })

    it('should cache named loggers', () => {
      const provider = createConsoleLoggerProvider()
      const logger1 = provider.createLogger('MyService')
      const logger2 = provider.createLogger('MyService')

      expect(logger1).toBe(logger2)
    })

    it('should set global level for all loggers', () => {
      const provider = createConsoleLoggerProvider('info')
      const logger = provider.createLogger('TestLogger')

      logger.debug('Should not log')
      expect(consoleDebugSpy).not.toHaveBeenCalled()

      provider.setLevel('debug')

      logger.debug('Should log now')
      expect(consoleDebugSpy).toHaveBeenCalled()
    })

    it('should add global transport to all loggers', () => {
      const provider = createConsoleLoggerProvider('info')
      const transport = vi.fn()
      const logger1 = provider.createLogger('Logger1')

      provider.addTransport(transport)

      const logger2 = provider.createLogger('Logger2')

      logger1.info('Message from logger1')
      logger2.info('Message from logger2')
      provider.getLogger().info('Message from root')

      expect(transport).toHaveBeenCalledTimes(3)
    })

    it('should remove global transport', () => {
      const provider = createConsoleLoggerProvider('info')
      const transport = vi.fn()

      const removeTransport = provider.addTransport(transport)

      provider.getLogger().info('Message 1')
      expect(transport).toHaveBeenCalledTimes(1)

      removeTransport()

      provider.getLogger().info('Message 2')
      expect(transport).toHaveBeenCalledTimes(1)
    })

    it('should enable and disable logging', () => {
      const provider = createConsoleLoggerProvider('info')

      expect(provider.isEnabled()).toBe(true)

      provider.disable()

      expect(provider.isEnabled()).toBe(false)
      provider.getLogger().info('Should not log')
      expect(consoleInfoSpy).not.toHaveBeenCalled()

      provider.enable()

      expect(provider.isEnabled()).toBe(true)
      provider.getLogger().info('Should log')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })
  })

  describe('Provider Management', () => {
    beforeEach(() => {
      setProvider(null as unknown as LoggerProvider)
    })

    it('should set and get custom provider', () => {
      const mockProvider: LoggerProvider = {
        getLogger: vi.fn().mockReturnValue(createConsoleLogger()),
        createLogger: vi.fn().mockReturnValue(createConsoleLogger()),
        setLevel: vi.fn(),
        getLevel: vi.fn().mockReturnValue('debug'),
        addTransport: vi.fn().mockReturnValue(() => {}),
        enable: vi.fn(),
        disable: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      }

      setProvider(mockProvider)
      const provider = getProvider()

      expect(provider).toBe(mockProvider)
    })

    it('should auto-create provider if not set', () => {
      const provider = getProvider()

      expect(provider).toBeDefined()
      expect(typeof provider.getLogger).toBe('function')
    })
  })

  describe('Module-level Utility Functions', () => {
    beforeEach(() => {
      setProvider(null as unknown as LoggerProvider)
    })

    it('getLogger should delegate to provider', () => {
      const logger = getLogger()
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
    })

    it('createLogger should delegate to provider', () => {
      const logger = createLogger('TestModule')
      expect(logger).toBeDefined()
    })

    it('setLevel should delegate to provider', () => {
      setLevel('debug')
      expect(getLevel()).toBe('debug')
    })

    it('getLevel should delegate to provider', () => {
      const level = getLevel()
      expect(['trace', 'debug', 'info', 'warn', 'error', 'silent']).toContain(level)
    })

    describe('Convenience log functions', () => {
      beforeEach(() => {
        setProvider(null as unknown as LoggerProvider)
        setLevel('trace')
      })

      it('trace should log at trace level', () => {
        trace('Trace message', 'arg1')
        expect(consoleDebugSpy).toHaveBeenCalled()
      })

      it('debug should log at debug level', () => {
        debug('Debug message', 'arg1')
        expect(consoleDebugSpy).toHaveBeenCalled()
      })

      it('info should log at info level', () => {
        info('Info message', 'arg1')
        expect(consoleInfoSpy).toHaveBeenCalled()
      })

      it('warn should log at warn level', () => {
        warn('Warning message', 'arg1')
        expect(consoleWarnSpy).toHaveBeenCalled()
      })

      it('error should log at error level', () => {
        error('Error message', 'arg1')
        expect(consoleErrorSpy).toHaveBeenCalled()
      })

      it('error should handle Error objects', () => {
        const testError = new Error('Test error')
        error(testError)
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), testError)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle silent log level', () => {
      const logger = createConsoleLogger({ level: 'silent' })

      logger.trace('Trace')
      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warn')
      logger.error('Error')

      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should handle empty message', () => {
      const logger = createConsoleLogger({ level: 'info' })

      logger.info('')

      expect(consoleInfoSpy).toHaveBeenCalledWith('')
    })

    it('should handle complex objects as args', () => {
      const logger = createConsoleLogger({ level: 'info' })
      const complexObj = { nested: { deep: { value: [1, 2, 3] } } }

      logger.info('Message', complexObj)

      expect(consoleInfoSpy).toHaveBeenCalledWith('Message', complexObj)
    })

    it('should handle null and undefined args', () => {
      const logger = createConsoleLogger({ level: 'info' })

      logger.info('Message', null, undefined)

      expect(consoleInfoSpy).toHaveBeenCalledWith('Message', null, undefined)
    })

    it('should handle many arguments', () => {
      const logger = createConsoleLogger({ level: 'info' })

      logger.info('Message', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

      expect(consoleInfoSpy).toHaveBeenCalledWith('Message', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    })

    it('should handle logger without name', () => {
      const logger = createConsoleLogger({ level: 'info' })

      logger.info('Test message')

      // Should not have brackets for name
      expect(consoleInfoSpy).toHaveBeenCalledWith('Test message')
    })

    it('should handle child logger without parent name', () => {
      const parent = createConsoleLogger({ level: 'info' })
      const child = parent.child('ChildName')

      child.info('Child message')

      expect(consoleInfoSpy).toHaveBeenCalledWith('[ChildName]', 'Child message')
    })
  })

  describe('Integration Tests', () => {
    beforeEach(() => {
      setProvider(null as unknown as LoggerProvider)
    })

    it('should work end-to-end with default provider', () => {
      setLevel('debug')

      info('Application starting')
      debug('Debug info', { version: '1.0.0' })
      warn('Warning: Low memory')
      error('Error occurred', new Error('Test error'))

      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleDebugSpy).toHaveBeenCalled()
      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should support modular logging pattern', () => {
      const userLogger = createLogger('User')
      const authLogger = createLogger('Auth')
      const dbLogger = createLogger('Database')

      setLevel('info')

      userLogger.info('User created', { id: 1 })
      authLogger.warn('Login attempt failed')
      dbLogger.error('Connection lost')

      expect(consoleInfoSpy).toHaveBeenCalledWith('[User]', 'User created', { id: 1 })
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Auth]', 'Login attempt failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Database]', 'Connection lost')
    })

    it('should work with nested child loggers', () => {
      const appLogger = createLogger('App')
      const moduleLogger = appLogger.child('Module')
      const componentLogger = moduleLogger.child('Component')

      setLevel('info')

      componentLogger.info('Rendered')

      expect(consoleInfoSpy).toHaveBeenCalledWith('[App:Module:Component]', 'Rendered')
    })

    it('should support context-based logging', () => {
      const transport = vi.fn()
      const provider = createConsoleLoggerProvider('info')
      provider.addTransport(transport)
      setProvider(provider)

      const requestLogger = createLogger('Request', {
        context: { requestId: 'req-123' },
      })

      requestLogger.withContext({ userId: 'user-456' })
      requestLogger.info('Processing request')

      expect(transport).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            requestId: 'req-123',
            userId: 'user-456',
          }),
        }),
      )
    })
  })
})
