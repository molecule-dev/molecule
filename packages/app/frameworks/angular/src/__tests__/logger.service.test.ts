import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
  Inject: () => () => undefined,
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
  },
}))

vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))

import { MoleculeLoggerService } from '../services/logger.service.js'

describe('MoleculeLoggerService', () => {
  let service: MoleculeLoggerService
  let mockProvider: Record<string, ReturnType<typeof vi.fn>>
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    mockLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    mockProvider = {
      getLogger: vi.fn(() => mockLogger),
      createLogger: vi.fn(() => mockLogger),
      setLevel: vi.fn(),
      getLevel: vi.fn(() => 'info'),
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn(() => true),
    }

    service = new MoleculeLoggerService(mockProvider)
  })

  describe('getLogger', () => {
    it('should delegate to the provider', () => {
      const logger = service.getLogger('TestComponent')

      expect(mockProvider.getLogger).toHaveBeenCalledWith('TestComponent')
      expect(logger).toBe(mockLogger)
    })

    it('should work without a name', () => {
      const logger = service.getLogger()

      expect(mockProvider.getLogger).toHaveBeenCalledWith(undefined)
      expect(logger).toBe(mockLogger)
    })

    it('should return a logger with standard methods', () => {
      const logger = service.getLogger('Test')

      expect(logger.trace).toBeInstanceOf(Function)
      expect(logger.debug).toBeInstanceOf(Function)
      expect(logger.info).toBeInstanceOf(Function)
      expect(logger.warn).toBeInstanceOf(Function)
      expect(logger.error).toBeInstanceOf(Function)
    })
  })

  describe('createLogger', () => {
    it('should delegate to the provider with config', () => {
      const config = { name: 'Custom', level: 'debug' } as Record<string, unknown>
      const logger = service.createLogger(config)

      expect(mockProvider.createLogger).toHaveBeenCalledWith(config)
      expect(logger).toBe(mockLogger)
    })
  })

  describe('setLevel', () => {
    it('should delegate to the provider', () => {
      service.setLevel('debug')
      expect(mockProvider.setLevel).toHaveBeenCalledWith('debug')
    })

    it('should accept all valid log levels', () => {
      const levels: Array<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'> = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'silent',
      ]

      for (const level of levels) {
        service.setLevel(level)
        expect(mockProvider.setLevel).toHaveBeenCalledWith(level)
      }
    })
  })

  describe('getLevel', () => {
    it('should return the current log level from the provider', () => {
      const level = service.getLevel()
      expect(level).toBe('info')
      expect(mockProvider.getLevel).toHaveBeenCalledTimes(1)
    })
  })

  describe('enable', () => {
    it('should delegate to the provider', () => {
      service.enable()
      expect(mockProvider.enable).toHaveBeenCalledTimes(1)
    })
  })

  describe('disable', () => {
    it('should delegate to the provider', () => {
      service.disable()
      expect(mockProvider.disable).toHaveBeenCalledTimes(1)
    })
  })

  describe('isEnabled', () => {
    it('should return true when logging is enabled', () => {
      expect(service.isEnabled()).toBe(true)
      expect(mockProvider.isEnabled).toHaveBeenCalledTimes(1)
    })

    it('should return false when logging is disabled', () => {
      mockProvider.isEnabled.mockReturnValue(false)
      expect(service.isEnabled()).toBe(false)
    })
  })
})
