import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { ConfigProvider, ConfigSchema, ConfigValidationResult } from '../types.js'

// We need to reset the module state between tests
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let get: typeof ProviderModule.get
let getRequired: typeof ProviderModule.getRequired
let getString: typeof ProviderModule.getString
let getNumber: typeof ProviderModule.getNumber
let getBoolean: typeof ProviderModule.getBoolean
let getJson: typeof ProviderModule.getJson
let has: typeof ProviderModule.has
let validate: typeof ProviderModule.validate

/**
 * Creates a simple env-based provider for testing convenience functions.
 */
function createTestEnvProvider(): ConfigProvider {
  return {
    get<T = string>(key: string, defaultValue?: T): T | undefined {
      const value = process.env[key]
      return value !== undefined ? (value as T) : defaultValue
    },
    getRequired<T = string>(key: string): T {
      const value = process.env[key]
      if (value === undefined) {
        throw new Error(`Required configuration '${key}' is not set.`)
      }
      return value as T
    },
    getAll(): Record<string, unknown> {
      return { ...process.env }
    },
    has(key: string): boolean {
      return process.env[key] !== undefined
    },
    set(key: string, value: unknown): void {
      process.env[key] = String(value)
    },
    validate(schema: ConfigSchema[]): ConfigValidationResult {
      const errors: ConfigValidationResult['errors'] = []
      const warnings: ConfigValidationResult['warnings'] = []

      for (const config of schema) {
        const value = process.env[config.key]

        if (config.required && value === undefined) {
          errors.push({
            key: config.key,
            message: `Required configuration '${config.key}' is not set.`,
          })
          continue
        }

        if (value === undefined) {
          continue
        }

        if (config.type === 'number') {
          const num = Number(value)
          if (isNaN(num)) {
            errors.push({
              key: config.key,
              message: `Configuration '${config.key}' must be a number.`,
            })
          } else {
            if (config.min !== undefined && num < config.min) {
              errors.push({
                key: config.key,
                message: `Configuration '${config.key}' must be at least ${config.min}.`,
              })
            }
            if (config.max !== undefined && num > config.max) {
              errors.push({
                key: config.key,
                message: `Configuration '${config.key}' must be at most ${config.max}.`,
              })
            }
          }
        }

        if (config.type === 'boolean') {
          if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            errors.push({
              key: config.key,
              message: `Configuration '${config.key}' must be a boolean (true/false/1/0).`,
            })
          }
        }

        if (config.type === 'json') {
          try {
            JSON.parse(value)
          } catch {
            errors.push({
              key: config.key,
              message: `Configuration '${config.key}' must be valid JSON.`,
            })
          }
        }

        if (config.pattern) {
          const regex = new RegExp(config.pattern)
          if (!regex.test(value)) {
            errors.push({
              key: config.key,
              message: `Configuration '${config.key}' does not match pattern '${config.pattern}'.`,
            })
          }
        }

        if (config.enum && !config.enum.includes(value)) {
          errors.push({
            key: config.key,
            message: `Configuration '${config.key}' must be one of: ${config.enum.join(', ')}.`,
          })
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      }
    },
  }
}

describe('config provider', () => {
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    // Clean up test env vars
    delete process.env.TEST_STRING
    delete process.env.TEST_NUMBER
    delete process.env.TEST_BOOLEAN
    delete process.env.TEST_JSON
    delete process.env.REQUIRED_KEY

    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    get = providerModule.get
    getRequired = providerModule.getRequired
    getString = providerModule.getString
    getNumber = providerModule.getNumber
    getBoolean = providerModule.getBoolean
    getJson = providerModule.getJson
    has = providerModule.has
    validate = providerModule.validate
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'No configuration provider set. Call setProvider() first.',
      )
    })

    it('should report no provider via hasProvider', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set custom provider', () => {
      const mockProvider: ConfigProvider = {
        get: vi.fn(),
        getRequired: vi.fn(),
        getAll: vi.fn(),
        has: vi.fn(),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('get', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should return env value', () => {
      process.env.TEST_STRING = 'test-value'
      const result = get('TEST_STRING')
      expect(result).toBe('test-value')
    })

    it('should return default value when not set', () => {
      const result = get('NONEXISTENT_KEY', 'default')
      expect(result).toBe('default')
    })

    it('should return undefined when not set and no default', () => {
      const result = get('NONEXISTENT_KEY')
      expect(result).toBeUndefined()
    })
  })

  describe('getRequired', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should return env value', () => {
      process.env.REQUIRED_KEY = 'required-value'
      const result = getRequired('REQUIRED_KEY')
      expect(result).toBe('required-value')
    })

    it('should throw when key is not set', () => {
      expect(() => getRequired('NONEXISTENT_KEY')).toThrow(
        "Required configuration 'NONEXISTENT_KEY' is not set.",
      )
    })
  })

  describe('getString', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should return string value', () => {
      process.env.TEST_STRING = 'hello'
      const result = getString('TEST_STRING')
      expect(result).toBe('hello')
    })

    it('should return default value', () => {
      const result = getString('NONEXISTENT', 'fallback')
      expect(result).toBe('fallback')
    })
  })

  describe('getNumber', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should return number value', () => {
      process.env.TEST_NUMBER = '42'
      const result = getNumber('TEST_NUMBER')
      expect(result).toBe(42)
    })

    it('should return float value', () => {
      process.env.TEST_NUMBER = '3.14'
      const result = getNumber('TEST_NUMBER')
      expect(result).toBe(3.14)
    })

    it('should return default for non-numeric value', () => {
      process.env.TEST_NUMBER = 'not-a-number'
      const result = getNumber('TEST_NUMBER', 100)
      expect(result).toBe(100)
    })

    it('should return default when not set', () => {
      const result = getNumber('NONEXISTENT', 99)
      expect(result).toBe(99)
    })

    it('should return undefined when not set and no default', () => {
      const result = getNumber('NONEXISTENT')
      expect(result).toBeUndefined()
    })
  })

  describe('getBoolean', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should return true for "true"', () => {
      process.env.TEST_BOOLEAN = 'true'
      const result = getBoolean('TEST_BOOLEAN')
      expect(result).toBe(true)
    })

    it('should return true for "1"', () => {
      process.env.TEST_BOOLEAN = '1'
      const result = getBoolean('TEST_BOOLEAN')
      expect(result).toBe(true)
    })

    it('should return true for "yes"', () => {
      process.env.TEST_BOOLEAN = 'yes'
      const result = getBoolean('TEST_BOOLEAN')
      expect(result).toBe(true)
    })

    it('should return false for "false"', () => {
      process.env.TEST_BOOLEAN = 'false'
      const result = getBoolean('TEST_BOOLEAN')
      expect(result).toBe(false)
    })

    it('should return false for other values', () => {
      process.env.TEST_BOOLEAN = 'no'
      const result = getBoolean('TEST_BOOLEAN')
      expect(result).toBe(false)
    })

    it('should return default when not set', () => {
      const result = getBoolean('NONEXISTENT', true)
      expect(result).toBe(true)
    })

    it('should be case-insensitive', () => {
      process.env.TEST_BOOLEAN = 'TRUE'
      expect(getBoolean('TEST_BOOLEAN')).toBe(true)

      process.env.TEST_BOOLEAN = 'Yes'
      expect(getBoolean('TEST_BOOLEAN')).toBe(true)
    })
  })

  describe('getJson', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should parse JSON value', () => {
      process.env.TEST_JSON = '{"key":"value","num":42}'
      const result = getJson<{ key: string; num: number }>('TEST_JSON')
      expect(result).toEqual({ key: 'value', num: 42 })
    })

    it('should parse JSON array', () => {
      process.env.TEST_JSON = '[1,2,3]'
      const result = getJson<number[]>('TEST_JSON')
      expect(result).toEqual([1, 2, 3])
    })

    it('should return default for invalid JSON', () => {
      process.env.TEST_JSON = 'not-valid-json'
      const result = getJson('TEST_JSON', { fallback: true })
      expect(result).toEqual({ fallback: true })
    })

    it('should return default when not set', () => {
      const result = getJson('NONEXISTENT', { default: true })
      expect(result).toEqual({ default: true })
    })
  })

  describe('has', () => {
    beforeEach(() => {
      setProvider(createTestEnvProvider())
    })

    it('should return true when key exists', () => {
      process.env.TEST_STRING = 'value'
      expect(has('TEST_STRING')).toBe(true)
    })

    it('should return false when key does not exist', () => {
      expect(has('NONEXISTENT_KEY')).toBe(false)
    })
  })

  describe('validate', () => {
    it('should throw when provider does not support validation', () => {
      const mockProvider: ConfigProvider = {
        get: vi.fn(),
        getRequired: vi.fn(),
        getAll: vi.fn(),
        has: vi.fn(),
        // validate not defined
      }
      setProvider(mockProvider)

      const schema: ConfigSchema[] = [{ key: 'TEST', required: true }]
      expect(() => validate(schema)).toThrow(
        'Current configuration provider does not support validation.',
      )
    })

    it('should validate required config', () => {
      setProvider(createTestEnvProvider())
      process.env.REQUIRED_KEY = 'value'

      const schema: ConfigSchema[] = [{ key: 'REQUIRED_KEY', required: true }]
      const result = validate(schema)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation for missing required config', () => {
      setProvider(createTestEnvProvider())

      const schema: ConfigSchema[] = [{ key: 'MISSING_REQUIRED', required: true }]
      const result = validate(schema)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].key).toBe('MISSING_REQUIRED')
    })
  })
})

describe('config types', () => {
  it('should export ConfigSchema type', () => {
    const schema: ConfigSchema = {
      key: 'DATABASE_URL',
      description: 'Database connection string',
      type: 'string',
      required: true,
      secret: true,
      pattern: '^postgres://',
    }
    expect(schema.key).toBe('DATABASE_URL')
  })

  it('should export ConfigValidationResult type', () => {
    const result: ConfigValidationResult = {
      valid: false,
      errors: [{ key: 'MISSING_KEY', message: 'Required' }],
      warnings: [{ key: 'DEPRECATED_KEY', message: 'Deprecated' }],
    }
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.warnings).toHaveLength(1)
  })

  it('should export ConfigProvider type with required methods', () => {
    const provider: ConfigProvider = {
      get: <T>(_key: string, _defaultValue?: T): T | undefined => undefined,
      getRequired: <T>(_key: string): T => {
        throw new Error('not set')
      },
      getAll: (): Record<string, unknown> => ({}),
      has: (_key: string): boolean => false,
    }
    expect(typeof provider.get).toBe('function')
    expect(typeof provider.getRequired).toBe('function')
    expect(typeof provider.getAll).toBe('function')
    expect(typeof provider.has).toBe('function')
  })

  it('should export ConfigProvider type with optional methods', () => {
    const provider: ConfigProvider = {
      get: () => undefined,
      getRequired: () => {
        throw new Error('not set')
      },
      getAll: () => ({}),
      has: () => false,
      set: (_key: string, _value: unknown): void => {},
      validate: (_schema: ConfigSchema[]): ConfigValidationResult => ({
        valid: true,
        errors: [],
        warnings: [],
      }),
      reload: async (): Promise<void> => {},
      watch:
        (_callback: (key: string, value: unknown) => void): (() => void) =>
        () => {},
    }
    expect(typeof provider.set).toBe('function')
    expect(typeof provider.validate).toBe('function')
    expect(typeof provider.reload).toBe('function')
    expect(typeof provider.watch).toBe('function')
  })
})
