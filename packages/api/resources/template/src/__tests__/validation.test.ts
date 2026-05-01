import { describe, expect, it } from 'vitest'

import { createTemplateSchema, instantiateSchema, updateTemplateSchema } from '../validation.js'

describe('@molecule/api-resource-template — validation', () => {
  describe('createTemplateSchema', () => {
    it('accepts a minimal valid payload', () => {
      const result = createTemplateSchema.safeParse({
        resourceType: 'doc',
        slug: 'starter',
        name: 'Starter',
        snapshot: {},
      })
      expect(result.success).toBe(true)
    })

    it('rejects an invalid slug', () => {
      const result = createTemplateSchema.safeParse({
        resourceType: 'doc',
        slug: 'Has Spaces!',
        name: 'Bad',
        snapshot: {},
      })
      expect(result.success).toBe(false)
    })

    it('rejects an empty resourceType', () => {
      const result = createTemplateSchema.safeParse({
        resourceType: '',
        slug: 'ok',
        name: 'Bad',
        snapshot: {},
      })
      expect(result.success).toBe(false)
    })

    it('accepts variables and tags', () => {
      const result = createTemplateSchema.safeParse({
        resourceType: 'doc',
        slug: 'rich',
        name: 'Rich',
        snapshot: { x: '{{a}}' },
        variables: [{ name: 'a', defaultValue: 'b', required: true }],
        tags: ['featured', 'beta'],
        isPublic: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects variable names with leading digit', () => {
      const result = createTemplateSchema.safeParse({
        resourceType: 'doc',
        slug: 'bad-var',
        name: 'Bad',
        snapshot: {},
        variables: [{ name: '1bad' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateTemplateSchema', () => {
    it('accepts an empty patch', () => {
      expect(updateTemplateSchema.safeParse({}).success).toBe(true)
    })

    it('accepts null description', () => {
      expect(updateTemplateSchema.safeParse({ description: null }).success).toBe(true)
    })
  })

  describe('instantiateSchema', () => {
    it('accepts an empty body', () => {
      expect(instantiateSchema.safeParse({}).success).toBe(true)
    })

    it('accepts primitive variable values', () => {
      const result = instantiateSchema.safeParse({
        variables: { a: 'x', b: 1, c: true, d: null },
      })
      expect(result.success).toBe(true)
    })

    it('rejects object variable values', () => {
      const result = instantiateSchema.safeParse({
        variables: { a: { nested: 'no' } },
      })
      expect(result.success).toBe(false)
    })
  })
})
