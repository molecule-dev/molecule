vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { envProvider, provider } from '../provider.js'

describe('@molecule/api-config-env', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    // Save env vars we'll modify
    for (const key of [
      '__TEST_GET__',
      '__TEST_REQ__',
      '__TEST_HAS__',
      '__TEST_SET__',
      '__TEST_NUM__',
      '__TEST_BOOL__',
      '__TEST_JSON__',
      '__TEST_PAT__',
      '__TEST_ENUM__',
    ]) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  describe('exports', () => {
    it('should export envProvider and provider as the same object', () => {
      expect(envProvider).toBe(provider)
    })

    it('should have all ConfigProvider methods', () => {
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.getRequired).toBe('function')
      expect(typeof provider.getAll).toBe('function')
      expect(typeof provider.has).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.validate).toBe('function')
    })
  })

  describe('get', () => {
    it('should return env var value', () => {
      process.env.__TEST_GET__ = 'hello'

      expect(provider.get('__TEST_GET__')).toBe('hello')
    })

    it('should return undefined for missing key', () => {
      expect(provider.get('__TEST_GET__')).toBeUndefined()
    })

    it('should return default value for missing key', () => {
      expect(provider.get('__TEST_GET__', 'fallback')).toBe('fallback')
    })

    it('should prefer env var over default', () => {
      process.env.__TEST_GET__ = 'from-env'

      expect(provider.get('__TEST_GET__', 'fallback')).toBe('from-env')
    })
  })

  describe('getRequired', () => {
    it('should return value when set', () => {
      process.env.__TEST_REQ__ = 'value'

      expect(provider.getRequired('__TEST_REQ__')).toBe('value')
    })

    it('should throw for missing key', () => {
      expect(() => provider.getRequired('__TEST_REQ__')).toThrow(
        "Required configuration '__TEST_REQ__' is not set.",
      )
    })
  })

  describe('getAll', () => {
    it('should return a copy of process.env', () => {
      const all = provider.getAll()

      expect(all).toEqual(expect.objectContaining({ PATH: expect.any(String) }))
      // Should be a copy, not a reference
      expect(all).not.toBe(process.env)
    })
  })

  describe('has', () => {
    it('should return true when key exists', () => {
      process.env.__TEST_HAS__ = 'yes'

      expect(provider.has('__TEST_HAS__')).toBe(true)
    })

    it('should return false when key is missing', () => {
      expect(provider.has('__TEST_HAS__')).toBe(false)
    })
  })

  describe('set', () => {
    it('should set env var', () => {
      provider.set('__TEST_SET__', 'new-value')

      expect(process.env.__TEST_SET__).toBe('new-value')
    })

    it('should stringify non-string values', () => {
      provider.set('__TEST_SET__', 42)

      expect(process.env.__TEST_SET__).toBe('42')
    })
  })

  describe('validate', () => {
    it('should return valid for empty schema', () => {
      const result = provider.validate([])

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should error on missing required config', () => {
      const result = provider.validate([{ key: '__TEST_REQ__', required: true }])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].key).toBe('__TEST_REQ__')
    })

    it('should pass for present required config', () => {
      process.env.__TEST_REQ__ = 'present'

      const result = provider.validate([{ key: '__TEST_REQ__', required: true }])

      expect(result.valid).toBe(true)
    })

    it('should skip optional missing config without error', () => {
      const result = provider.validate([{ key: '__TEST_REQ__', required: false }])

      expect(result.valid).toBe(true)
    })

    describe('number validation', () => {
      it('should error for non-numeric value', () => {
        process.env.__TEST_NUM__ = 'not-a-number'

        const result = provider.validate([{ key: '__TEST_NUM__', type: 'number' }])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('must be a number')
      })

      it('should error when below min', () => {
        process.env.__TEST_NUM__ = '3'

        const result = provider.validate([{ key: '__TEST_NUM__', type: 'number', min: 5 }])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('at least 5')
      })

      it('should error when above max', () => {
        process.env.__TEST_NUM__ = '100'

        const result = provider.validate([{ key: '__TEST_NUM__', type: 'number', max: 50 }])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('at most 50')
      })

      it('should pass for valid number within range', () => {
        process.env.__TEST_NUM__ = '10'

        const result = provider.validate([
          { key: '__TEST_NUM__', type: 'number', min: 1, max: 100 },
        ])

        expect(result.valid).toBe(true)
      })
    })

    describe('boolean validation', () => {
      it.each(['true', 'false', '1', '0', 'TRUE', 'FALSE'])('should accept %s', (value) => {
        process.env.__TEST_BOOL__ = value

        const result = provider.validate([{ key: '__TEST_BOOL__', type: 'boolean' }])

        expect(result.valid).toBe(true)
      })

      it('should error for non-boolean value', () => {
        process.env.__TEST_BOOL__ = 'maybe'

        const result = provider.validate([{ key: '__TEST_BOOL__', type: 'boolean' }])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('must be a boolean')
      })
    })

    describe('json validation', () => {
      it('should accept valid JSON', () => {
        process.env.__TEST_JSON__ = '{"key":"value"}'

        const result = provider.validate([{ key: '__TEST_JSON__', type: 'json' }])

        expect(result.valid).toBe(true)
      })

      it('should error for invalid JSON', () => {
        process.env.__TEST_JSON__ = '{invalid}'

        const result = provider.validate([{ key: '__TEST_JSON__', type: 'json' }])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('must be valid JSON')
      })
    })

    describe('pattern validation', () => {
      it('should pass for matching pattern', () => {
        process.env.__TEST_PAT__ = 'abc-123'

        const result = provider.validate([{ key: '__TEST_PAT__', pattern: '^[a-z]+-\\d+$' }])

        expect(result.valid).toBe(true)
      })

      it('should error for non-matching pattern', () => {
        process.env.__TEST_PAT__ = 'INVALID'

        const result = provider.validate([{ key: '__TEST_PAT__', pattern: '^[a-z]+$' }])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('does not match pattern')
      })
    })

    describe('enum validation', () => {
      it('should pass for valid enum value', () => {
        process.env.__TEST_ENUM__ = 'production'

        const result = provider.validate([
          { key: '__TEST_ENUM__', enum: ['development', 'staging', 'production'] },
        ])

        expect(result.valid).toBe(true)
      })

      it('should error for invalid enum value', () => {
        process.env.__TEST_ENUM__ = 'invalid'

        const result = provider.validate([
          { key: '__TEST_ENUM__', enum: ['development', 'staging', 'production'] },
        ])

        expect(result.valid).toBe(false)
        expect(result.errors[0].message).toContain('must be one of')
      })
    })

    it('should collect multiple errors', () => {
      process.env.__TEST_NUM__ = 'not-a-number'
      process.env.__TEST_BOOL__ = 'maybe'

      const result = provider.validate([
        { key: '__TEST_REQ__', required: true },
        { key: '__TEST_NUM__', type: 'number' },
        { key: '__TEST_BOOL__', type: 'boolean' },
      ])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
    })
  })
})
