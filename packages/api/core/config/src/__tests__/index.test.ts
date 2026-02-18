/**
 * Tests for `@molecule/api-config`
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type ConfigProvider,
  type ConfigSchema,
  type ConfigValidationResult,
  get,
  getBoolean,
  getJson,
  getNumber,
  getProvider,
  getRequired,
  getString,
  has,
  hasProvider,
  setProvider,
  validate,
} from '../index.js'

/**
 * Creates a simple env-based provider for testing.
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

describe('@molecule/api-config', () => {
  // Store original env values
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Set up a test provider before each test
    setProvider(createTestEnvProvider())
    // Clear test env variables
    delete process.env.TEST_KEY
    delete process.env.TEST_NUMBER
    delete process.env.TEST_BOOL
    delete process.env.TEST_JSON
    delete process.env.TEST_REQUIRED
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  describe('Provider management', () => {
    describe('setProvider', () => {
      it('should set a custom provider', () => {
        const customProvider: ConfigProvider = {
          get: <T = string>(): T | undefined => 'custom-value' as T,
          getRequired: <T = string>(): T => 'custom-required' as T,
          getAll: () => ({ custom: 'value' }),
          has: () => true,
        }

        setProvider(customProvider)
        expect(getProvider()).toBe(customProvider)
        expect(get('any-key')).toBe('custom-value')
      })
    })

    describe('getProvider', () => {
      it('should return the current provider', () => {
        const provider = getProvider()
        expect(provider).toBeDefined()
        expect(typeof provider.get).toBe('function')
        expect(typeof provider.getRequired).toBe('function')
        expect(typeof provider.getAll).toBe('function')
        expect(typeof provider.has).toBe('function')
      })
    })

    describe('hasProvider', () => {
      it('should return true when a provider is set', () => {
        expect(hasProvider()).toBe(true)
      })
    })
  })

  describe('get', () => {
    it('should return undefined for non-existent key', () => {
      expect(get('NON_EXISTENT_KEY')).toBeUndefined()
    })

    it('should return the value for an existing key', () => {
      process.env.TEST_KEY = 'test-value'
      expect(get('TEST_KEY')).toBe('test-value')
    })

    it('should return default value when key does not exist', () => {
      expect(get('NON_EXISTENT', 'default')).toBe('default')
    })

    it('should return actual value over default when key exists', () => {
      process.env.TEST_KEY = 'actual'
      expect(get('TEST_KEY', 'default')).toBe('actual')
    })

    it('should handle empty string values', () => {
      process.env.TEST_KEY = ''
      expect(get('TEST_KEY')).toBe('')
    })
  })

  describe('getRequired', () => {
    it('should return the value when key exists', () => {
      process.env.TEST_REQUIRED = 'required-value'
      expect(getRequired('TEST_REQUIRED')).toBe('required-value')
    })

    it('should throw when key does not exist', () => {
      expect(() => getRequired('NON_EXISTENT_REQUIRED')).toThrow(
        "Required configuration 'NON_EXISTENT_REQUIRED' is not set.",
      )
    })
  })

  describe('getString', () => {
    it('should return string value', () => {
      process.env.TEST_KEY = 'string-value'
      expect(getString('TEST_KEY')).toBe('string-value')
    })

    it('should return undefined for non-existent key', () => {
      expect(getString('NON_EXISTENT')).toBeUndefined()
    })

    it('should return default value when key does not exist', () => {
      expect(getString('NON_EXISTENT', 'default-string')).toBe('default-string')
    })
  })

  describe('getNumber', () => {
    it('should parse integer value', () => {
      process.env.TEST_NUMBER = '42'
      expect(getNumber('TEST_NUMBER')).toBe(42)
    })

    it('should parse float value', () => {
      process.env.TEST_NUMBER = '3.14'
      expect(getNumber('TEST_NUMBER')).toBe(3.14)
    })

    it('should parse negative number', () => {
      process.env.TEST_NUMBER = '-10'
      expect(getNumber('TEST_NUMBER')).toBe(-10)
    })

    it('should return undefined for non-existent key', () => {
      expect(getNumber('NON_EXISTENT')).toBeUndefined()
    })

    it('should return default value when key does not exist', () => {
      expect(getNumber('NON_EXISTENT', 100)).toBe(100)
    })

    it('should return default value for invalid number', () => {
      process.env.TEST_NUMBER = 'not-a-number'
      expect(getNumber('TEST_NUMBER', 50)).toBe(50)
    })

    it('should return default for NaN result', () => {
      process.env.TEST_NUMBER = 'abc'
      expect(getNumber('TEST_NUMBER', 0)).toBe(0)
    })

    it('should handle zero correctly', () => {
      process.env.TEST_NUMBER = '0'
      expect(getNumber('TEST_NUMBER')).toBe(0)
    })
  })

  describe('getBoolean', () => {
    it('should parse "true" as true', () => {
      process.env.TEST_BOOL = 'true'
      expect(getBoolean('TEST_BOOL')).toBe(true)
    })

    it('should parse "TRUE" as true (case insensitive)', () => {
      process.env.TEST_BOOL = 'TRUE'
      expect(getBoolean('TEST_BOOL')).toBe(true)
    })

    it('should parse "1" as true', () => {
      process.env.TEST_BOOL = '1'
      expect(getBoolean('TEST_BOOL')).toBe(true)
    })

    it('should parse "yes" as true', () => {
      process.env.TEST_BOOL = 'yes'
      expect(getBoolean('TEST_BOOL')).toBe(true)
    })

    it('should parse "YES" as true (case insensitive)', () => {
      process.env.TEST_BOOL = 'YES'
      expect(getBoolean('TEST_BOOL')).toBe(true)
    })

    it('should parse "false" as false', () => {
      process.env.TEST_BOOL = 'false'
      expect(getBoolean('TEST_BOOL')).toBe(false)
    })

    it('should parse "0" as false', () => {
      process.env.TEST_BOOL = '0'
      expect(getBoolean('TEST_BOOL')).toBe(false)
    })

    it('should parse "no" as false', () => {
      process.env.TEST_BOOL = 'no'
      expect(getBoolean('TEST_BOOL')).toBe(false)
    })

    it('should return undefined for non-existent key', () => {
      expect(getBoolean('NON_EXISTENT')).toBeUndefined()
    })

    it('should return default value when key does not exist', () => {
      expect(getBoolean('NON_EXISTENT', true)).toBe(true)
      expect(getBoolean('NON_EXISTENT', false)).toBe(false)
    })

    it('should return false for arbitrary string values', () => {
      process.env.TEST_BOOL = 'arbitrary'
      expect(getBoolean('TEST_BOOL')).toBe(false)
    })
  })

  describe('getJson', () => {
    it('should parse valid JSON object', () => {
      process.env.TEST_JSON = '{"key": "value", "num": 42}'
      expect(getJson('TEST_JSON')).toEqual({ key: 'value', num: 42 })
    })

    it('should parse valid JSON array', () => {
      process.env.TEST_JSON = '[1, 2, 3]'
      expect(getJson('TEST_JSON')).toEqual([1, 2, 3])
    })

    it('should parse JSON string', () => {
      process.env.TEST_JSON = '"hello"'
      expect(getJson('TEST_JSON')).toBe('hello')
    })

    it('should parse JSON number', () => {
      process.env.TEST_JSON = '42'
      expect(getJson('TEST_JSON')).toBe(42)
    })

    it('should parse JSON boolean', () => {
      process.env.TEST_JSON = 'true'
      expect(getJson('TEST_JSON')).toBe(true)
    })

    it('should parse JSON null', () => {
      process.env.TEST_JSON = 'null'
      expect(getJson('TEST_JSON')).toBeNull()
    })

    it('should return undefined for non-existent key', () => {
      expect(getJson('NON_EXISTENT')).toBeUndefined()
    })

    it('should return default value when key does not exist', () => {
      const defaultValue = { default: true }
      expect(getJson('NON_EXISTENT', defaultValue)).toEqual(defaultValue)
    })

    it('should return default value for invalid JSON', () => {
      process.env.TEST_JSON = 'not-valid-json'
      const defaultValue = { fallback: true }
      expect(getJson('TEST_JSON', defaultValue)).toEqual(defaultValue)
    })

    it('should return default for malformed JSON', () => {
      process.env.TEST_JSON = '{invalid: json}'
      expect(getJson('TEST_JSON', null)).toBeNull()
    })

    it('should handle nested JSON', () => {
      process.env.TEST_JSON = '{"nested": {"deep": {"value": 123}}}'
      expect(getJson<{ nested: { deep: { value: number } } }>('TEST_JSON')).toEqual({
        nested: { deep: { value: 123 } },
      })
    })
  })

  describe('has', () => {
    it('should return true when key exists', () => {
      process.env.TEST_KEY = 'value'
      expect(has('TEST_KEY')).toBe(true)
    })

    it('should return false when key does not exist', () => {
      expect(has('NON_EXISTENT_KEY')).toBe(false)
    })

    it('should return true for empty string value', () => {
      process.env.TEST_KEY = ''
      expect(has('TEST_KEY')).toBe(true)
    })
  })

  describe('validate', () => {
    describe('required validation', () => {
      it('should pass when required value is set', () => {
        process.env.TEST_REQUIRED = 'value'
        const schema: ConfigSchema[] = [{ key: 'TEST_REQUIRED', required: true }]
        const result = validate(schema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should fail when required value is not set', () => {
        const schema: ConfigSchema[] = [{ key: 'MISSING_REQUIRED', required: true }]
        const result = validate(schema)
        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].key).toBe('MISSING_REQUIRED')
        expect(result.errors[0].message).toContain('Required configuration')
      })

      it('should pass when optional value is not set', () => {
        const schema: ConfigSchema[] = [{ key: 'OPTIONAL_KEY', required: false }]
        const result = validate(schema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('type validation', () => {
      describe('number type', () => {
        it('should pass for valid number', () => {
          process.env.TEST_NUMBER = '42'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should fail for invalid number', () => {
          process.env.TEST_NUMBER = 'not-a-number'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number' }]
          const result = validate(schema)
          expect(result.valid).toBe(false)
          expect(result.errors[0].message).toContain('must be a number')
        })

        it('should validate min constraint', () => {
          process.env.TEST_NUMBER = '5'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number', min: 10 }]
          const result = validate(schema)
          expect(result.valid).toBe(false)
          expect(result.errors[0].message).toContain('at least 10')
        })

        it('should pass min constraint when value meets it', () => {
          process.env.TEST_NUMBER = '15'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number', min: 10 }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should validate max constraint', () => {
          process.env.TEST_NUMBER = '100'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number', max: 50 }]
          const result = validate(schema)
          expect(result.valid).toBe(false)
          expect(result.errors[0].message).toContain('at most 50')
        })

        it('should pass max constraint when value meets it', () => {
          process.env.TEST_NUMBER = '25'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number', max: 50 }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should validate both min and max constraints', () => {
          process.env.TEST_NUMBER = '5'
          const schema: ConfigSchema[] = [{ key: 'TEST_NUMBER', type: 'number', min: 10, max: 100 }]
          const result = validate(schema)
          expect(result.valid).toBe(false)
        })
      })

      describe('boolean type', () => {
        it('should pass for "true"', () => {
          process.env.TEST_BOOL = 'true'
          const schema: ConfigSchema[] = [{ key: 'TEST_BOOL', type: 'boolean' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should pass for "false"', () => {
          process.env.TEST_BOOL = 'false'
          const schema: ConfigSchema[] = [{ key: 'TEST_BOOL', type: 'boolean' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should pass for "1"', () => {
          process.env.TEST_BOOL = '1'
          const schema: ConfigSchema[] = [{ key: 'TEST_BOOL', type: 'boolean' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should pass for "0"', () => {
          process.env.TEST_BOOL = '0'
          const schema: ConfigSchema[] = [{ key: 'TEST_BOOL', type: 'boolean' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should fail for invalid boolean value', () => {
          process.env.TEST_BOOL = 'maybe'
          const schema: ConfigSchema[] = [{ key: 'TEST_BOOL', type: 'boolean' }]
          const result = validate(schema)
          expect(result.valid).toBe(false)
          expect(result.errors[0].message).toContain('must be a boolean')
        })
      })

      describe('json type', () => {
        it('should pass for valid JSON', () => {
          process.env.TEST_JSON = '{"key": "value"}'
          const schema: ConfigSchema[] = [{ key: 'TEST_JSON', type: 'json' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })

        it('should fail for invalid JSON', () => {
          process.env.TEST_JSON = '{invalid json}'
          const schema: ConfigSchema[] = [{ key: 'TEST_JSON', type: 'json' }]
          const result = validate(schema)
          expect(result.valid).toBe(false)
          expect(result.errors[0].message).toContain('must be valid JSON')
        })
      })

      describe('string type', () => {
        it('should pass for any string value', () => {
          process.env.TEST_KEY = 'any string'
          const schema: ConfigSchema[] = [{ key: 'TEST_KEY', type: 'string' }]
          const result = validate(schema)
          expect(result.valid).toBe(true)
        })
      })
    })

    describe('pattern validation', () => {
      it('should pass when value matches pattern', () => {
        process.env.TEST_KEY = 'abc123'
        const schema: ConfigSchema[] = [{ key: 'TEST_KEY', pattern: '^[a-z]+[0-9]+$' }]
        const result = validate(schema)
        expect(result.valid).toBe(true)
      })

      it('should fail when value does not match pattern', () => {
        process.env.TEST_KEY = '123abc'
        const schema: ConfigSchema[] = [{ key: 'TEST_KEY', pattern: '^[a-z]+[0-9]+$' }]
        const result = validate(schema)
        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('does not match pattern')
      })

      it('should validate email-like pattern', () => {
        process.env.TEST_KEY = 'test@example.com'
        const schema: ConfigSchema[] = [{ key: 'TEST_KEY', pattern: '^[^@]+@[^@]+\\.[^@]+$' }]
        const result = validate(schema)
        expect(result.valid).toBe(true)
      })
    })

    describe('enum validation', () => {
      it('should pass when value is in enum', () => {
        process.env.TEST_KEY = 'production'
        const schema: ConfigSchema[] = [
          { key: 'TEST_KEY', enum: ['development', 'staging', 'production'] },
        ]
        const result = validate(schema)
        expect(result.valid).toBe(true)
      })

      it('should fail when value is not in enum', () => {
        process.env.TEST_KEY = 'invalid'
        const schema: ConfigSchema[] = [
          { key: 'TEST_KEY', enum: ['development', 'staging', 'production'] },
        ]
        const result = validate(schema)
        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('must be one of')
      })
    })

    describe('multiple validations', () => {
      it('should accumulate multiple errors', () => {
        process.env.TEST_NUMBER = 'not-a-number'
        const schema: ConfigSchema[] = [
          { key: 'MISSING_REQUIRED', required: true },
          { key: 'TEST_NUMBER', type: 'number' },
          { key: 'MISSING_ENUM', enum: ['a', 'b'] },
        ]
        const result = validate(schema)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThanOrEqual(2)
      })

      it('should pass when all validations succeed', () => {
        process.env.REQUIRED_KEY = 'present'
        process.env.NUMBER_KEY = '42'
        process.env.ENUM_KEY = 'valid'
        const schema: ConfigSchema[] = [
          { key: 'REQUIRED_KEY', required: true },
          { key: 'NUMBER_KEY', type: 'number', min: 0, max: 100 },
          { key: 'ENUM_KEY', enum: ['valid', 'also-valid'] },
        ]
        const result = validate(schema)
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('validation result structure', () => {
      it('should return proper ConfigValidationResult structure', () => {
        const schema: ConfigSchema[] = []
        const result = validate(schema)
        expect(result).toHaveProperty('valid')
        expect(result).toHaveProperty('errors')
        expect(result).toHaveProperty('warnings')
        expect(Array.isArray(result.errors)).toBe(true)
        expect(Array.isArray(result.warnings)).toBe(true)
      })
    })

    describe('provider without validate', () => {
      it('should throw when provider does not support validation', () => {
        const noValidateProvider: ConfigProvider = {
          get: () => undefined,
          getRequired: () => {
            throw new Error('not set')
          },
          getAll: () => ({}),
          has: () => false,
        }
        setProvider(noValidateProvider)

        expect(() => validate([])).toThrow('does not support validation')
      })
    })
  })

  describe('Custom provider integration', () => {
    it('should work with a fully custom provider', () => {
      const memoryStore: Record<string, unknown> = {
        CUSTOM_KEY: 'custom-value',
        CUSTOM_NUMBER: '123',
      }

      const memoryProvider: ConfigProvider = {
        get<T = string>(key: string, defaultValue?: T): T | undefined {
          const value = memoryStore[key]
          return value !== undefined ? (value as T) : defaultValue
        },
        getRequired<T = string>(key: string): T {
          const value = memoryStore[key]
          if (value === undefined) {
            throw new Error(`Missing: ${key}`)
          }
          return value as T
        },
        getAll(): Record<string, unknown> {
          return { ...memoryStore }
        },
        has(key: string): boolean {
          return key in memoryStore
        },
        set(key: string, value: unknown): void {
          memoryStore[key] = value
        },
      }

      setProvider(memoryProvider)

      expect(get('CUSTOM_KEY')).toBe('custom-value')
      expect(has('CUSTOM_KEY')).toBe(true)
      expect(has('NON_EXISTENT')).toBe(false)
      expect(getRequired('CUSTOM_KEY')).toBe('custom-value')
      expect(() => getRequired('NON_EXISTENT')).toThrow('Missing: NON_EXISTENT')
    })
  })

  describe('Type exports', () => {
    it('should export ConfigProvider type', () => {
      const provider: ConfigProvider = {
        get: () => undefined,
        getRequired: () => {
          throw new Error()
        },
        getAll: () => ({}),
        has: () => false,
      }
      expect(provider).toBeDefined()
    })

    it('should export ConfigSchema type', () => {
      const schema: ConfigSchema = {
        key: 'TEST',
        description: 'Test config',
        type: 'string',
        required: true,
        default: 'default',
        secret: false,
        pattern: '^.*$',
      }
      expect(schema.key).toBe('TEST')
    })

    it('should export ConfigValidationResult type', () => {
      const result: ConfigValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      }
      expect(result.valid).toBe(true)
    })
  })
})
