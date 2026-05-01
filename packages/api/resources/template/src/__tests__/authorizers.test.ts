import { describe, expect, it } from 'vitest'

import { canEditTemplate, canViewTemplate } from '../authorizers/index.js'
import type { Template } from '../types.js'

const baseTemplate: Template = {
  id: 't1',
  resourceType: 'doc',
  slug: 'starter',
  name: 'Starter',
  description: null,
  snapshot: {},
  variables: [],
  tags: [],
  version: 1,
  isPublic: false,
  createdBy: 'creator-1',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
}

describe('@molecule/api-resource-template — authorizers', () => {
  describe('canViewTemplate', () => {
    it('public templates are visible to anyone', () => {
      const tpl = { ...baseTemplate, isPublic: true }
      expect(canViewTemplate(tpl, null)).toBe(true)
      expect(canViewTemplate(tpl, 'someone-else')).toBe(true)
    })

    it('private templates are visible only to creator', () => {
      expect(canViewTemplate(baseTemplate, 'creator-1')).toBe(true)
      expect(canViewTemplate(baseTemplate, 'someone-else')).toBe(false)
      expect(canViewTemplate(baseTemplate, null)).toBe(false)
    })
  })

  describe('canEditTemplate', () => {
    it('only the creator can edit', () => {
      expect(canEditTemplate(baseTemplate, 'creator-1')).toBe(true)
      expect(canEditTemplate(baseTemplate, 'someone-else')).toBe(false)
      expect(canEditTemplate(baseTemplate, null)).toBe(false)
    })

    it('public visibility does not grant edit', () => {
      const tpl = { ...baseTemplate, isPublic: true }
      expect(canEditTemplate(tpl, 'someone-else')).toBe(false)
    })
  })
})
