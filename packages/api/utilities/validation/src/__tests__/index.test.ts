/**
 * Comprehensive tests for `@molecule/api-utilities-validation`
 *
 * Tests the validation utilities including:
 * - isEmail: Email validation with basic and strict modes
 * - isUuid: UUID validation
 * - getValidProps: Zod-based resource props validation
 * - safeParse: Safe Zod parsing with result object
 * - validate: Zod parsing that throws on failure
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { getValidProps, safeParse, validate } from '../getValidProps.js'
import { isEmail } from '../isEmail.js'
import { isUuid } from '../isUuid.js'

describe('@molecule/api-utilities-validation', () => {
  describe('isEmail', () => {
    describe('basic mode (non-strict)', () => {
      it('should return true for valid email addresses', () => {
        expect(isEmail('user@example.com')).toBe(true)
        expect(isEmail('test@domain.org')).toBe(true)
        expect(isEmail('hello@world.co')).toBe(true)
      })

      it('should return true for emails with subdomains', () => {
        expect(isEmail('user@sub.example.com')).toBe(true)
        expect(isEmail('test@mail.domain.org')).toBe(true)
      })

      it('should return true for emails with numbers', () => {
        expect(isEmail('user123@example.com')).toBe(true)
        expect(isEmail('test@domain123.com')).toBe(true)
      })

      it('should return true for emails with plus signs', () => {
        expect(isEmail('user+tag@example.com')).toBe(true)
      })

      it('should return true for emails with dots in local part', () => {
        expect(isEmail('first.last@example.com')).toBe(true)
      })

      it('should return true for emails with hyphens in domain', () => {
        expect(isEmail('user@my-domain.com')).toBe(true)
      })

      it('should return false for invalid email addresses', () => {
        expect(isEmail('')).toBe(false)
        expect(isEmail('notanemail')).toBe(false)
        expect(isEmail('@example.com')).toBe(false)
        expect(isEmail('user@')).toBe(false)
        expect(isEmail('user@.com')).toBe(false)
      })

      it('should return false for emails with spaces', () => {
        expect(isEmail('user @example.com')).toBe(false)
        expect(isEmail('user@ example.com')).toBe(false)
        expect(isEmail(' user@example.com')).toBe(false)
        expect(isEmail('user@example.com ')).toBe(false)
      })

      it('should return false for emails missing TLD', () => {
        expect(isEmail('user@example')).toBe(false)
      })

      it('should return false for emails with multiple @ symbols', () => {
        expect(isEmail('user@@example.com')).toBe(false)
        expect(isEmail('user@test@example.com')).toBe(false)
      })
    })

    describe('strict mode', () => {
      it('should return true for valid email addresses', () => {
        expect(isEmail('user@example.com', true)).toBe(true)
        expect(isEmail('test@domain.org', true)).toBe(true)
        expect(isEmail('hello@world.co', true)).toBe(true)
      })

      it('should return true for emails with subdomains', () => {
        expect(isEmail('user@sub.example.com', true)).toBe(true)
        expect(isEmail('test@mail.domain.org', true)).toBe(true)
      })

      it('should return true for emails with plus signs', () => {
        expect(isEmail('user+tag@example.com', true)).toBe(true)
      })

      it('should return true for emails with dots in local part', () => {
        expect(isEmail('first.last@example.com', true)).toBe(true)
      })

      it('should return true for emails with hyphens in domain', () => {
        expect(isEmail('user@my-domain.com', true)).toBe(true)
      })

      it('should return false for invalid email addresses', () => {
        expect(isEmail('', true)).toBe(false)
        expect(isEmail('notanemail', true)).toBe(false)
        expect(isEmail('@example.com', true)).toBe(false)
        expect(isEmail('user@', true)).toBe(false)
      })

      it('should return false for emails with spaces', () => {
        expect(isEmail('user @example.com', true)).toBe(false)
        expect(isEmail('user@ example.com', true)).toBe(false)
      })

      it('should handle IP address domains', () => {
        // Strict mode supports IP addresses as domains
        expect(isEmail('user@192.168.1.1', true)).toBe(true)
        expect(isEmail('user@[192.168.1.1]', true)).toBe(true)
      })

      it('should return true for quoted local parts', () => {
        expect(isEmail('"user name"@example.com', true)).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle very long email addresses', () => {
        const longLocal = 'a'.repeat(64)
        const longEmail = `${longLocal}@example.com`
        expect(isEmail(longEmail)).toBe(true)
      })

      it('should handle unicode characters in basic mode', () => {
        // Basic mode regex may accept some unicode
        expect(isEmail('user@exämple.com')).toBe(true)
      })

      it('should handle single character TLDs', () => {
        // Single char TLDs are not valid per RFC but basic mode is permissive
        expect(isEmail('user@example.c')).toBe(true)
        expect(isEmail('user@example.c', true)).toBe(false)
      })

      it('should handle numeric TLDs', () => {
        expect(isEmail('user@example.123')).toBe(true)
      })
    })
  })

  describe('isUuid', () => {
    describe('valid UUIDs', () => {
      it('should return true for valid v1 UUIDs', () => {
        expect(isUuid('550e8400-e29b-11d4-a716-446655440000')).toBe(true)
      })

      it('should return true for valid v4 UUIDs', () => {
        expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
        expect(isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
      })

      it('should return true for valid v5 UUIDs', () => {
        expect(isUuid('550e8400-e29b-51d4-a716-446655440000')).toBe(true)
      })

      it('should return true for nil UUID', () => {
        expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true)
      })

      it('should return true for uppercase UUIDs', () => {
        expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
      })

      it('should return true for mixed case UUIDs', () => {
        expect(isUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true)
      })

      it('should return true for UUIDs with valid variant bits', () => {
        // Variant 0 (0xxx)
        expect(isUuid('550e8400-e29b-41d4-0716-446655440000')).toBe(true)
        // Variant 8 (10xx)
        expect(isUuid('550e8400-e29b-41d4-8716-446655440000')).toBe(true)
        // Variant 9 (10xx)
        expect(isUuid('550e8400-e29b-41d4-9716-446655440000')).toBe(true)
        // Variant a (10xx)
        expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
        // Variant b (10xx)
        expect(isUuid('550e8400-e29b-41d4-b716-446655440000')).toBe(true)
      })
    })

    describe('invalid UUIDs', () => {
      it('should return false for empty string', () => {
        expect(isUuid('')).toBe(false)
      })

      it('should return false for random strings', () => {
        expect(isUuid('not-a-uuid')).toBe(false)
        expect(isUuid('hello-world')).toBe(false)
      })

      it('should return false for UUIDs with wrong length', () => {
        expect(isUuid('550e8400-e29b-41d4-a716-44665544000')).toBe(false)
        expect(isUuid('550e8400-e29b-41d4-a716-4466554400000')).toBe(false)
      })

      it('should return false for UUIDs with missing hyphens', () => {
        expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false)
      })

      it('should return false for UUIDs with extra hyphens', () => {
        expect(isUuid('550e8400-e29b-41d4-a716-44665544-0000')).toBe(false)
      })

      it('should return false for UUIDs with invalid characters', () => {
        expect(isUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false)
        expect(isUuid('550e8400-e29b-41d4-a716-44665544000z')).toBe(false)
      })

      it('should return false for UUIDs with spaces', () => {
        expect(isUuid('550e8400-e29b-41d4-a716-446655440000 ')).toBe(false)
        expect(isUuid(' 550e8400-e29b-41d4-a716-446655440000')).toBe(false)
      })

      it('should return false for UUIDs with invalid version digit', () => {
        // Version must be 0-5 in third segment
        expect(isUuid('550e8400-e29b-61d4-a716-446655440000')).toBe(false)
        expect(isUuid('550e8400-e29b-71d4-a716-446655440000')).toBe(false)
      })

      it('should return false for UUIDs with invalid variant bits', () => {
        // Variant c, d, e, f are not valid RFC 4122 variants
        expect(isUuid('550e8400-e29b-41d4-c716-446655440000')).toBe(false)
        expect(isUuid('550e8400-e29b-41d4-d716-446655440000')).toBe(false)
        expect(isUuid('550e8400-e29b-41d4-e716-446655440000')).toBe(false)
        expect(isUuid('550e8400-e29b-41d4-f716-446655440000')).toBe(false)
      })

      it('should return false for UUIDs with braces', () => {
        expect(isUuid('{550e8400-e29b-41d4-a716-446655440000}')).toBe(false)
      })

      it('should return false for UUIDs with urn prefix', () => {
        expect(isUuid('urn:uuid:550e8400-e29b-41d4-a716-446655440000')).toBe(false)
      })
    })
  })

  describe('getValidProps', () => {
    describe('basic validation', () => {
      it('should return validated props for valid input', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        })

        const result = getValidProps({
          name: 'User',
          schema,
          props: { name: 'John', age: 30 },
        })

        expect(result).toEqual({ name: 'John', age: 30 })
      })

      it('should throw error for invalid input', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        })

        expect(() =>
          getValidProps({
            name: 'User',
            schema,
            props: { name: 'John', age: 'thirty' },
          }),
        ).toThrow()
      })

      it('should include resource name in error message', () => {
        const schema = z.object({
          name: z.string(),
        })

        expect(() =>
          getValidProps({
            name: 'User',
            schema,
            props: { name: 123 },
          }),
        ).toThrow(/User\.name/)
      })

      it('should include field path in error message', () => {
        const schema = z.object({
          profile: z.object({
            email: z.email(),
          }),
        })

        expect(() =>
          getValidProps({
            name: 'User',
            schema,
            props: { profile: { email: 'invalid' } },
          }),
        ).toThrow(/User\.profile\.email/)
      })
    })

    describe('schema types', () => {
      it('should validate string fields', () => {
        const schema = z.object({ value: z.string() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: 'hello' },
        })
        expect(result.value).toBe('hello')
      })

      it('should validate number fields', () => {
        const schema = z.object({ value: z.number() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: 42 },
        })
        expect(result.value).toBe(42)
      })

      it('should validate boolean fields', () => {
        const schema = z.object({ value: z.boolean() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: true },
        })
        expect(result.value).toBe(true)
      })

      it('should validate array fields', () => {
        const schema = z.object({ values: z.array(z.number()) })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { values: [1, 2, 3] },
        })
        expect(result.values).toEqual([1, 2, 3])
      })

      it('should validate enum fields', () => {
        const schema = z.object({
          status: z.enum(['pending', 'completed', 'failed']),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { status: 'completed' },
        })
        expect(result.status).toBe('completed')
      })

      it('should validate optional fields', () => {
        const schema = z.object({
          required: z.string(),
          optional: z.string().optional(),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { required: 'value' },
        })
        expect(result.required).toBe('value')
        expect(result.optional).toBeUndefined()
      })

      it('should validate nullable fields', () => {
        const schema = z.object({
          value: z.string().nullable(),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: null },
        })
        expect(result.value).toBeNull()
      })

      it('should validate UUID fields', () => {
        const schema = z.object({ id: z.string().uuid() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { id: '550e8400-e29b-41d4-a716-446655440000' },
        })
        expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should validate email fields', () => {
        const schema = z.object({ email: z.email() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { email: 'user@example.com' },
        })
        expect(result.email).toBe('user@example.com')
      })

      it('should validate date fields', () => {
        const schema = z.object({ date: z.date() })
        const date = new Date()
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { date },
        })
        expect(result.date).toEqual(date)
      })

      it('should validate record fields', () => {
        const schema = z.object({
          metadata: z.record(z.string(), z.unknown()),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { metadata: { key: 'value', num: 42 } },
        })
        expect(result.metadata).toEqual({ key: 'value', num: 42 })
      })
    })

    describe('transformations', () => {
      it('should apply default values', () => {
        const schema = z.object({
          name: z.string(),
          status: z.string().default('pending'),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { name: 'test' },
        })
        expect(result.status).toBe('pending')
      })

      it('should apply transforms', () => {
        const schema = z.object({
          email: z.string().transform((s) => s.toLowerCase()),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { email: 'USER@EXAMPLE.COM' },
        })
        expect(result.email).toBe('user@example.com')
      })

      it('should coerce values when schema specifies coercion', () => {
        const schema = z.object({
          count: z.coerce.number(),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { count: '42' },
        })
        expect(result.count).toBe(42)
      })
    })

    describe('multiple errors', () => {
      it('should combine multiple validation errors', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
          email: z.email(),
        })

        try {
          getValidProps({
            name: 'User',
            schema,
            props: { name: 123, age: 'thirty', email: 'invalid' },
          })
          expect.fail('Should have thrown')
        } catch (error) {
          const message = String(error)
          expect(message).toContain('User.name')
          expect(message).toContain('User.age')
          expect(message).toContain('User.email')
        }
      })
    })

    describe('nested objects', () => {
      it('should validate deeply nested objects', () => {
        const schema = z.object({
          level1: z.object({
            level2: z.object({
              level3: z.object({
                value: z.string(),
              }),
            }),
          }),
        })

        const result = getValidProps({
          name: 'Test',
          schema,
          props: {
            level1: {
              level2: {
                level3: {
                  value: 'deep',
                },
              },
            },
          },
        })

        expect(result.level1.level2.level3.value).toBe('deep')
      })

      it('should report nested field paths in errors', () => {
        const schema = z.object({
          level1: z.object({
            level2: z.object({
              value: z.number(),
            }),
          }),
        })

        expect(() =>
          getValidProps({
            name: 'Test',
            schema,
            props: {
              level1: {
                level2: {
                  value: 'not a number',
                },
              },
            },
          }),
        ).toThrow(/Test\.level1\.level2\.value/)
      })
    })

    describe('type inference', () => {
      it('should preserve type inference', () => {
        const schema = z.object({
          id: z.string().uuid(),
          name: z.string(),
          count: z.number(),
          active: z.boolean(),
          tags: z.array(z.string()),
        })

        type Props = z.infer<typeof schema>

        const result = getValidProps<Props>({
          name: 'Test',
          schema,
          props: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'test',
            count: 5,
            active: true,
            tags: ['a', 'b'],
          },
        })

        // TypeScript should recognize these properties
        expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
        expect(result.name).toBe('test')
        expect(result.count).toBe(5)
        expect(result.active).toBe(true)
        expect(result.tags).toEqual(['a', 'b'])
      })
    })
  })

  describe('safeParse', () => {
    describe('successful parsing', () => {
      it('should return success true with data for valid input', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        })

        const result = safeParse(schema, { name: 'John', age: 30 })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual({ name: 'John', age: 30 })
        }
      })

      it('should apply defaults', () => {
        const schema = z.object({
          name: z.string(),
          status: z.string().default('active'),
        })

        const result = safeParse(schema, { name: 'Test' })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.status).toBe('active')
        }
      })

      it('should apply transforms', () => {
        const schema = z.string().transform((s) => s.toUpperCase())

        const result = safeParse(schema, 'hello')

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe('HELLO')
        }
      })
    })

    describe('failed parsing', () => {
      it('should return success false with error for invalid input', () => {
        const schema = z.object({
          name: z.string(),
        })

        const result = safeParse(schema, { name: 123 })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBeDefined()
          expect(result.error.issues).toBeInstanceOf(Array)
        }
      })

      it('should include error details', () => {
        const schema = z.object({
          email: z.email(),
        })

        const result = safeParse(schema, { email: 'invalid' })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].path).toEqual(['email'])
          expect(result.error.issues[0].message).toContain('email')
        }
      })

      it('should report multiple errors', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        })

        const result = safeParse(schema, { name: 123, age: 'thirty' })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
        }
      })
    })

    describe('different schema types', () => {
      it('should parse string schemas', () => {
        const result = safeParse(z.string(), 'hello')
        expect(result.success).toBe(true)
      })

      it('should parse number schemas', () => {
        const result = safeParse(z.number(), 42)
        expect(result.success).toBe(true)
      })

      it('should parse boolean schemas', () => {
        const result = safeParse(z.boolean(), true)
        expect(result.success).toBe(true)
      })

      it('should parse array schemas', () => {
        const result = safeParse(z.array(z.number()), [1, 2, 3])
        expect(result.success).toBe(true)
      })

      it('should parse union schemas', () => {
        const schema = z.union([z.string(), z.number()])
        expect(safeParse(schema, 'hello').success).toBe(true)
        expect(safeParse(schema, 42).success).toBe(true)
        expect(safeParse(schema, true).success).toBe(false)
      })

      it('should parse discriminated union schemas', () => {
        const schema = z.discriminatedUnion('type', [
          z.object({ type: z.literal('a'), aValue: z.string() }),
          z.object({ type: z.literal('b'), bValue: z.number() }),
        ])

        const resultA = safeParse(schema, { type: 'a', aValue: 'hello' })
        expect(resultA.success).toBe(true)

        const resultB = safeParse(schema, { type: 'b', bValue: 42 })
        expect(resultB.success).toBe(true)
      })
    })
  })

  describe('validate', () => {
    describe('successful validation', () => {
      it('should return validated data for valid input', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        })

        const result = validate(schema, { name: 'John', age: 30 })

        expect(result).toEqual({ name: 'John', age: 30 })
      })

      it('should apply defaults', () => {
        const schema = z.object({
          name: z.string(),
          status: z.string().default('active'),
        })

        const result = validate(schema, { name: 'Test' })

        expect(result.status).toBe('active')
      })

      it('should apply transforms', () => {
        const schema = z.string().transform((s) => s.toUpperCase())

        const result = validate(schema, 'hello')

        expect(result).toBe('HELLO')
      })
    })

    describe('failed validation', () => {
      it('should throw ZodError for invalid input', () => {
        const schema = z.object({
          name: z.string(),
        })

        expect(() => validate(schema, { name: 123 })).toThrow()
      })

      it('should throw error with proper structure', () => {
        const schema = z.object({
          email: z.email(),
        })

        try {
          validate(schema, { email: 'invalid' })
          expect.fail('Should have thrown')
        } catch (error: unknown) {
          // ZodError has an errors property
          const zodError = error as {
            issues: Array<{ path: (string | number)[]; message: string }>
          }
          expect(zodError.issues).toBeInstanceOf(Array)
          expect(zodError.issues[0].path).toEqual(['email'])
        }
      })

      it('should include all validation errors', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        })

        try {
          validate(schema, { name: 123, age: 'thirty' })
          expect.fail('Should have thrown')
        } catch (error: unknown) {
          const zodError = error as { issues: Array<{ path: (string | number)[] }> }
          expect(zodError.issues.length).toBeGreaterThanOrEqual(2)
        }
      })
    })

    describe('different schema types', () => {
      it('should validate string schemas', () => {
        expect(validate(z.string(), 'hello')).toBe('hello')
      })

      it('should validate number schemas', () => {
        expect(validate(z.number(), 42)).toBe(42)
      })

      it('should validate boolean schemas', () => {
        expect(validate(z.boolean(), true)).toBe(true)
      })

      it('should validate array schemas', () => {
        expect(validate(z.array(z.number()), [1, 2, 3])).toEqual([1, 2, 3])
      })

      it('should validate null schemas', () => {
        expect(validate(z.null(), null)).toBeNull()
      })

      it('should validate undefined schemas', () => {
        expect(validate(z.undefined(), undefined)).toBeUndefined()
      })
    })

    describe('type inference', () => {
      it('should preserve type inference', () => {
        const schema = z.object({
          id: z.string(),
          count: z.number(),
        })

        const result = validate(schema, { id: 'abc', count: 5 })

        // TypeScript should recognize these as the correct types
        const id: string = result.id
        const count: number = result.count

        expect(id).toBe('abc')
        expect(count).toBe(5)
      })
    })
  })

  describe('Integration tests', () => {
    describe('real-world resource validation', () => {
      it('should validate a complete User resource', () => {
        const userSchema = z.object({
          id: z.string().uuid(),
          email: z.email(),
          name: z.string().min(1).max(100),
          role: z.enum(['admin', 'user', 'guest']).default('user'),
          createdAt: z.string().datetime().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })

        const props = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          name: 'John Doe',
        }

        const result = getValidProps({
          name: 'User',
          schema: userSchema,
          props,
        })

        expect(result.id).toBe(props.id)
        expect(result.email).toBe(props.email)
        expect(result.name).toBe(props.name)
        expect(result.role).toBe('user') // default applied
      })

      it('should validate a Payment resource', () => {
        const paymentSchema = z.object({
          id: z.string().uuid(),
          userId: z.string().uuid(),
          amount: z.number().positive(),
          currency: z.string().length(3),
          status: z.enum(['pending', 'completed', 'failed']).default('pending'),
          createdAt: z.string().datetime().optional(),
          updatedAt: z.string().datetime().optional(),
        })

        const props = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          amount: 99.99,
          currency: 'USD',
        }

        const result = getValidProps({
          name: 'Payment',
          schema: paymentSchema,
          props,
        })

        expect(result.amount).toBe(99.99)
        expect(result.currency).toBe('USD')
        expect(result.status).toBe('pending')
      })

      it('should reject invalid Payment amount', () => {
        const paymentSchema = z.object({
          amount: z.number().positive(),
        })

        expect(() =>
          getValidProps({
            name: 'Payment',
            schema: paymentSchema,
            props: { amount: -50 },
          }),
        ).toThrow(/Payment\.amount/)
      })
    })

    describe('combining utilities', () => {
      it('should use isEmail for pre-validation', () => {
        const email = 'user@example.com'

        // Pre-check with isEmail
        if (!isEmail(email)) {
          throw new Error('Invalid email format')
        }

        // Then validate with schema
        const schema = z.object({
          email: z.email(),
        })

        const result = safeParse(schema, { email })
        expect(result.success).toBe(true)
      })

      it('should use isUuid for pre-validation', () => {
        const id = '550e8400-e29b-41d4-a716-446655440000'

        // Pre-check with isUuid
        if (!isUuid(id)) {
          throw new Error('Invalid UUID format')
        }

        // Then validate with schema
        const schema = z.object({
          id: z.string().uuid(),
        })

        const result = safeParse(schema, { id })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Edge cases', () => {
    describe('empty and null inputs', () => {
      it('should handle empty object', () => {
        const schema = z.object({})
        const result = getValidProps({
          name: 'Empty',
          schema,
          props: {},
        })
        expect(result).toEqual({})
      })

      it('should handle null props when schema allows', () => {
        const schema = z.null()
        const result = validate(schema, null)
        expect(result).toBeNull()
      })

      it('should handle undefined props when schema allows', () => {
        const schema = z.undefined()
        const result = validate(schema, undefined)
        expect(result).toBeUndefined()
      })

      it('should reject null when not allowed', () => {
        const schema = z.object({ name: z.string() })
        expect(() =>
          getValidProps({
            name: 'Test',
            schema,
            props: null,
          }),
        ).toThrow()
      })

      it('should reject undefined when not allowed', () => {
        const schema = z.object({ name: z.string() })
        expect(() =>
          getValidProps({
            name: 'Test',
            schema,
            props: undefined,
          }),
        ).toThrow()
      })
    })

    describe('special string values', () => {
      it('should handle empty strings', () => {
        const schema = z.object({ value: z.string() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: '' },
        })
        expect(result.value).toBe('')
      })

      it('should handle whitespace strings', () => {
        const schema = z.object({ value: z.string() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: '   ' },
        })
        expect(result.value).toBe('   ')
      })

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(100000)
        const schema = z.object({ value: z.string() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: longString },
        })
        expect(result.value.length).toBe(100000)
      })

      it('should handle unicode strings', () => {
        const schema = z.object({ value: z.string() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: 'Hello \u{1F600} World' },
        })
        expect(result.value).toContain('\u{1F600}')
      })
    })

    describe('special number values', () => {
      it('should handle zero', () => {
        const schema = z.object({ value: z.number() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: 0 },
        })
        expect(result.value).toBe(0)
      })

      it('should handle negative numbers', () => {
        const schema = z.object({ value: z.number() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: -100 },
        })
        expect(result.value).toBe(-100)
      })

      it('should handle floating point numbers', () => {
        const schema = z.object({ value: z.number() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: 3.14159 },
        })
        expect(result.value).toBeCloseTo(3.14159)
      })

      it('should handle very large numbers', () => {
        const schema = z.object({ value: z.number() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: Number.MAX_SAFE_INTEGER },
        })
        expect(result.value).toBe(Number.MAX_SAFE_INTEGER)
      })

      it('should handle very small numbers', () => {
        const schema = z.object({ value: z.number() })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { value: Number.MIN_SAFE_INTEGER },
        })
        expect(result.value).toBe(Number.MIN_SAFE_INTEGER)
      })

      it('should reject Infinity by default', () => {
        const schema = z.object({ value: z.number() })
        expect(() =>
          getValidProps({
            name: 'Test',
            schema,
            props: { value: Infinity },
          }),
        ).toThrow()
      })

      it('should reject NaN with finite() constraint', () => {
        const schema = z.object({ value: z.number().finite() })
        expect(() =>
          getValidProps({
            name: 'Test',
            schema,
            props: { value: NaN },
          }),
        ).toThrow()
      })
    })

    describe('array edge cases', () => {
      it('should handle empty arrays', () => {
        const schema = z.object({ values: z.array(z.number()) })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { values: [] },
        })
        expect(result.values).toEqual([])
      })

      it('should handle nested arrays', () => {
        const schema = z.object({
          matrix: z.array(z.array(z.number())),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: {
            matrix: [
              [1, 2, 3],
              [4, 5, 6],
            ],
          },
        })
        expect(result.matrix).toEqual([
          [1, 2, 3],
          [4, 5, 6],
        ])
      })

      it('should handle arrays with mixed types when schema allows', () => {
        const schema = z.object({
          values: z.array(z.union([z.string(), z.number()])),
        })
        const result = getValidProps({
          name: 'Test',
          schema,
          props: { values: ['a', 1, 'b', 2] },
        })
        expect(result.values).toEqual(['a', 1, 'b', 2])
      })
    })

    describe('error message formatting', () => {
      it('should format single error correctly', () => {
        const schema = z.object({
          name: z.string(),
        })

        try {
          getValidProps({
            name: 'Resource',
            schema,
            props: { name: 123 },
          })
        } catch (error) {
          expect(String(error)).toMatch(/Resource\.name/)
        }
      })

      it('should format array index errors correctly', () => {
        const schema = z.object({
          items: z.array(z.string()),
        })

        try {
          getValidProps({
            name: 'Resource',
            schema,
            props: { items: ['a', 123, 'c'] },
          })
        } catch (error) {
          expect(String(error)).toMatch(/Resource\.items\.1/)
        }
      })

      it('should use custom error messages from schema', () => {
        const schema = z.object({
          age: z.number().min(18, { message: 'Must be at least 18 years old' }),
        })

        try {
          getValidProps({
            name: 'User',
            schema,
            props: { age: 10 },
          })
        } catch (error) {
          expect(String(error)).toContain('Must be at least 18 years old')
        }
      })
    })
  })
})
