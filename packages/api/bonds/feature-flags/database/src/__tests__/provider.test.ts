import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn().mockResolvedValue({ data: null, affected: 1 }),
  findMany: vi.fn().mockResolvedValue([]),
  updateById: vi.fn().mockResolvedValue({ data: null, affected: 1 }),
  deleteById: vi.fn().mockResolvedValue({ data: null, affected: 1 }),
}))

import * as db from '@molecule/api-database'

import { createProvider } from '../provider.js'

const mockCreate = vi.mocked(db.create)
const mockFindMany = vi.mocked(db.findMany)
const mockUpdateById = vi.mocked(db.updateById)
const mockDeleteById = vi.mocked(db.deleteById)

const makeFlagRow = (overrides?: Record<string, unknown>) => ({
  id: 'flag-1',
  name: 'dark-mode',
  enabled: 1,
  description: 'Enable dark mode',
  rules: null,
  percentage: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('database feature flags provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-1' as ReturnType<typeof crypto.randomUUID>)
  })

  describe('isEnabled', () => {
    it('should return false when flag does not exist', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      expect(await provider.isEnabled('nonexistent')).toBe(false)
    })

    it('should return true when flag is enabled', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow()])
      const provider = createProvider()

      expect(await provider.isEnabled('dark-mode')).toBe(true)
    })

    it('should return false when flag is disabled', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow({ enabled: 0 })])
      const provider = createProvider()

      expect(await provider.isEnabled('dark-mode')).toBe(false)
    })

    it('should evaluate targeting rules', async () => {
      const rules = [{ attribute: 'plan', operator: 'eq', value: 'pro' }]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      expect(
        await provider.isEnabled('dark-mode', {
          attributes: { plan: 'pro' },
        }),
      ).toBe(true)

      expect(
        await provider.isEnabled('dark-mode', {
          attributes: { plan: 'free' },
        }),
      ).toBe(false)
    })

    it('should evaluate neq operator', async () => {
      const rules = [{ attribute: 'plan', operator: 'neq', value: 'free' }]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      expect(await provider.isEnabled('flag', { attributes: { plan: 'pro' } })).toBe(true)
      expect(await provider.isEnabled('flag', { attributes: { plan: 'free' } })).toBe(false)
    })

    it('should evaluate in operator', async () => {
      const rules = [{ attribute: 'country', operator: 'in', value: ['US', 'CA'] }]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      expect(await provider.isEnabled('flag', { attributes: { country: 'US' } })).toBe(true)
      expect(await provider.isEnabled('flag', { attributes: { country: 'GB' } })).toBe(false)
    })

    it('should evaluate notIn operator', async () => {
      const rules = [{ attribute: 'country', operator: 'notIn', value: ['CN', 'RU'] }]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      expect(await provider.isEnabled('flag', { attributes: { country: 'US' } })).toBe(true)
      expect(await provider.isEnabled('flag', { attributes: { country: 'CN' } })).toBe(false)
    })

    it('should evaluate gt and lt operators', async () => {
      const rules = [{ attribute: 'age', operator: 'gt', value: 18 }]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      expect(await provider.isEnabled('flag', { attributes: { age: 25 } })).toBe(true)
      expect(await provider.isEnabled('flag', { attributes: { age: 16 } })).toBe(false)
    })

    it('should apply percentage rollout deterministically', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow({ percentage: 50 })])
      const provider = createProvider()

      // Same user should always get the same result
      const result1 = await provider.isEnabled('dark-mode', { userId: 'user-1' })
      const result2 = await provider.isEnabled('dark-mode', { userId: 'user-1' })
      expect(result1).toBe(result2)
    })

    it('should require all rules to match', async () => {
      const rules = [
        { attribute: 'plan', operator: 'eq', value: 'pro' },
        { attribute: 'country', operator: 'eq', value: 'US' },
      ]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      expect(
        await provider.isEnabled('flag', {
          attributes: { plan: 'pro', country: 'US' },
        }),
      ).toBe(true)
      expect(
        await provider.isEnabled('flag', {
          attributes: { plan: 'pro', country: 'GB' },
        }),
      ).toBe(false)
    })
  })

  describe('getFlag', () => {
    it('should return null when flag does not exist', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      expect(await provider.getFlag('nonexistent')).toBeNull()
    })

    it('should return the flag definition', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow()])
      const provider = createProvider()

      const flag = await provider.getFlag('dark-mode')

      expect(flag).not.toBeNull()
      expect(flag!.name).toBe('dark-mode')
      expect(flag!.enabled).toBe(true)
      expect(flag!.description).toBe('Enable dark mode')
      expect(flag!.createdAt).toBeInstanceOf(Date)
    })

    it('should deserialize rules from JSON', async () => {
      const rules = [{ attribute: 'plan', operator: 'eq', value: 'pro' }]
      mockFindMany.mockResolvedValue([makeFlagRow({ rules: JSON.stringify(rules) })])
      const provider = createProvider()

      const flag = await provider.getFlag('dark-mode')

      expect(flag!.rules).toEqual(rules)
    })
  })

  describe('setFlag', () => {
    it('should create a new flag', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      const result = await provider.setFlag({
        name: 'new-feature',
        enabled: true,
        description: 'A new feature',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        'feature_flags',
        expect.objectContaining({
          id: 'uuid-1',
          name: 'new-feature',
          enabled: true,
          description: 'A new feature',
        }),
      )
      expect(result.name).toBe('new-feature')
      expect(result.enabled).toBe(true)
    })

    it('should update an existing flag', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow()])
      const provider = createProvider()

      const result = await provider.setFlag({
        name: 'dark-mode',
        enabled: false,
        description: 'Updated',
      })

      expect(mockUpdateById).toHaveBeenCalledWith(
        'feature_flags',
        'flag-1',
        expect.objectContaining({
          enabled: false,
          description: 'Updated',
        }),
      )
      expect(result.enabled).toBe(false)
    })

    it('should use custom table name', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider({ tableName: 'custom_flags' })

      await provider.setFlag({ name: 'test', enabled: true })

      expect(mockCreate).toHaveBeenCalledWith('custom_flags', expect.any(Object))
    })

    it('should serialize rules to JSON', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      const rules = [{ attribute: 'plan', operator: 'eq' as const, value: 'pro' }]
      await provider.setFlag({ name: 'test', enabled: true, rules })

      expect(mockCreate).toHaveBeenCalledWith(
        'feature_flags',
        expect.objectContaining({
          rules: JSON.stringify(rules),
        }),
      )
    })
  })

  describe('getAllFlags', () => {
    it('should return all flags sorted by name', async () => {
      mockFindMany.mockResolvedValue([
        makeFlagRow({ name: 'alpha' }),
        makeFlagRow({ id: 'flag-2', name: 'beta' }),
      ])
      const provider = createProvider()

      const flags = await provider.getAllFlags()

      expect(flags).toHaveLength(2)
      expect(mockFindMany).toHaveBeenCalledWith('feature_flags', {
        orderBy: [{ field: 'name', direction: 'asc' }],
      })
    })

    it('should return empty array when no flags exist', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      const flags = await provider.getAllFlags()

      expect(flags).toEqual([])
    })
  })

  describe('deleteFlag', () => {
    it('should delete an existing flag', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow()])
      const provider = createProvider()

      await provider.deleteFlag('dark-mode')

      expect(mockDeleteById).toHaveBeenCalledWith('feature_flags', 'flag-1')
    })

    it('should throw when flag does not exist', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      await expect(provider.deleteFlag('nonexistent')).rejects.toThrow(
        'Feature flag not found: nonexistent',
      )
    })
  })

  describe('evaluateForUser', () => {
    it('should evaluate all flags for a user', async () => {
      mockFindMany.mockResolvedValue([
        makeFlagRow({ name: 'flag-a', enabled: 1 }),
        makeFlagRow({ id: 'flag-2', name: 'flag-b', enabled: 0 }),
      ])
      const provider = createProvider()

      const result = await provider.evaluateForUser('user-1')

      expect(result['flag-a']).toBe(true)
      expect(result['flag-b']).toBe(false)
    })

    it('should filter to specific flags when provided', async () => {
      mockFindMany.mockResolvedValue([makeFlagRow({ name: 'flag-a' })])
      const provider = createProvider()

      await provider.evaluateForUser('user-1', ['flag-a'])

      expect(mockFindMany).toHaveBeenCalledWith('feature_flags', {
        where: [{ field: 'name', operator: 'in', value: ['flag-a'] }],
      })
    })

    it('should fetch all flags when no specific flags are requested', async () => {
      mockFindMany.mockResolvedValue([])
      const provider = createProvider()

      await provider.evaluateForUser('user-1')

      expect(mockFindMany).toHaveBeenCalledWith('feature_flags', {})
    })
  })

  describe('provider export', () => {
    it('should export a lazy provider instance', async () => {
      const { provider: lazyProvider } = await import('../provider.js')

      expect(lazyProvider).toBeDefined()
      expect(typeof lazyProvider.isEnabled).toBe('function')
      expect(typeof lazyProvider.getFlag).toBe('function')
      expect(typeof lazyProvider.setFlag).toBe('function')
      expect(typeof lazyProvider.getAllFlags).toBe('function')
      expect(typeof lazyProvider.deleteFlag).toBe('function')
      expect(typeof lazyProvider.evaluateForUser).toBe('function')
    })
  })
})
