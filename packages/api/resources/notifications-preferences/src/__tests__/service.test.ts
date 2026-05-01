const { mockFindOne, mockCreate, mockUpdateMany } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdateMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  findOne: mockFindOne,
  create: mockCreate,
  updateMany: mockUpdateMany,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPreferences, isEnabled, updatePreferences } from '../service.js'

describe('@molecule/api-notifications-preferences service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPreferences', () => {
    it('returns the stored preferences map when the row exists', async () => {
      const preferences = { 'order.shipped': { email: true, push: false, sms: true, inApp: true } }
      mockFindOne.mockResolvedValue({ userId: 'u1', preferences })

      const result = await getPreferences('u1')
      expect(result).toEqual(preferences)
      expect(mockFindOne).toHaveBeenCalledWith('notifications_preferences', [
        { field: 'userId', operator: '=', value: 'u1' },
      ])
    })

    it('returns an empty map when no row exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const result = await getPreferences('u1')
      expect(result).toEqual({})
    })
  })

  describe('updatePreferences', () => {
    it('creates a row on first update and merges defaults', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: {} })

      const merged = await updatePreferences('u1', {
        'order.shipped': { email: false },
      })

      expect(merged).toEqual({
        'order.shipped': { email: false, push: true, sms: true, inApp: true },
      })
      expect(mockCreate).toHaveBeenCalledWith('notifications_preferences', {
        userId: 'u1',
        preferences: merged,
      })
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    it('updates an existing row and preserves untouched types', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        preferences: {
          'order.shipped': { email: true, push: true, sms: true, inApp: true },
          'streak.at_risk': { email: true, push: true, sms: false, inApp: true },
        },
      })
      mockUpdateMany.mockResolvedValue({ affected: 1 })

      const merged = await updatePreferences('u1', {
        'order.shipped': { email: false, sms: false },
      })

      expect(merged).toEqual({
        'order.shipped': { email: false, push: true, sms: false, inApp: true },
        'streak.at_risk': { email: true, push: true, sms: false, inApp: true },
      })
      expect(mockUpdateMany).toHaveBeenCalledWith(
        'notifications_preferences',
        [{ field: 'userId', operator: '=', value: 'u1' }],
        { preferences: merged },
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('merges per-channel partials without overwriting unspecified channels', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        preferences: {
          'order.shipped': { email: false, push: false, sms: false, inApp: false },
        },
      })
      mockUpdateMany.mockResolvedValue({ affected: 1 })

      const merged = await updatePreferences('u1', {
        'order.shipped': { email: true },
      })

      expect(merged).toEqual({
        'order.shipped': { email: true, push: false, sms: false, inApp: false },
      })
    })

    it('seeds defaults for newly-touched types in an existing row', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        preferences: {
          'order.shipped': { email: true, push: true, sms: true, inApp: true },
        },
      })
      mockUpdateMany.mockResolvedValue({ affected: 1 })

      const merged = await updatePreferences('u1', {
        'streak.at_risk': { sms: false },
      })

      expect(merged).toEqual({
        'order.shipped': { email: true, push: true, sms: true, inApp: true },
        'streak.at_risk': { email: true, push: true, sms: false, inApp: true },
      })
    })
  })

  describe('isEnabled', () => {
    it('returns true when no row exists (default-on)', async () => {
      mockFindOne.mockResolvedValue(null)
      expect(await isEnabled('u1', 'order.shipped', 'email')).toBe(true)
    })

    it('returns true when the type has no stored entry', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        preferences: {
          'streak.at_risk': { email: false, push: true, sms: true, inApp: true },
        },
      })
      expect(await isEnabled('u1', 'order.shipped', 'email')).toBe(true)
    })

    it('returns true when the channel field is missing from the entry', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        preferences: {
          'order.shipped': { email: false } as never,
        },
      })
      expect(await isEnabled('u1', 'order.shipped', 'push')).toBe(true)
    })

    it('returns the stored boolean when explicitly set', async () => {
      mockFindOne.mockResolvedValue({
        userId: 'u1',
        preferences: {
          'order.shipped': { email: false, push: true, sms: false, inApp: true },
        },
      })
      expect(await isEnabled('u1', 'order.shipped', 'email')).toBe(false)
      expect(await isEnabled('u1', 'order.shipped', 'push')).toBe(true)
      expect(await isEnabled('u1', 'order.shipped', 'sms')).toBe(false)
      expect(await isEnabled('u1', 'order.shipped', 'inApp')).toBe(true)
    })
  })
})
