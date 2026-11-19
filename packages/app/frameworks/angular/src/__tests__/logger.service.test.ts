import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'

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
import { createTestLogger, createTestLoggerProvider } from './helpers/test-providers.js'

describe('MoleculeLoggerService', () => {
  let service: MoleculeLoggerService
  let mockProvider: LoggerProvider
  let mockLogger: Logger

  beforeEach(() => {
    mockLogger = createTestLogger()
    mockProvider = createTestLoggerProvider(mockLogger)

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
      const config: LoggerConfig = { name: 'Custom', level: 'debug' }
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
      vi.mocked(mockProvider.isEnabled).mockReturnValue(false)
      expect(service.isEnabled()).toBe(false)
    })
  })
})
