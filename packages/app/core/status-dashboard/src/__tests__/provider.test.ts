const { mockBond, mockBondGet, mockIsBonded } = vi.hoisted(() => ({
  mockBond: vi.fn(),
  mockBondGet: vi.fn(),
  mockIsBonded: vi.fn(),
}))

vi.mock('@molecule/app-bond', () => ({
  bond: mockBond,
  get: mockBondGet,
  isBonded: mockIsBonded,
}))

vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'

describe('@molecule/app-status-dashboard provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setProvider', () => {
    it('should bond the provider with the correct type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mock = { name: 'test-status' } as any
      setProvider(mock)
      expect(mockBond).toHaveBeenCalledWith('status-dashboard', mock)
    })
  })

  describe('getProvider', () => {
    it('should return null when no provider is bonded', () => {
      mockBondGet.mockReturnValue(undefined)
      expect(getProvider()).toBeNull()
    })

    it('should return the bonded provider', () => {
      const mock = { name: 'test-status' }
      mockBondGet.mockReturnValue(mock)
      expect(getProvider()).toEqual(mock)
    })
  })

  describe('hasProvider', () => {
    it('should return false when no provider is bonded', () => {
      mockIsBonded.mockReturnValue(false)
      expect(hasProvider()).toBe(false)
    })

    it('should return true when a provider is bonded', () => {
      mockIsBonded.mockReturnValue(true)
      expect(hasProvider()).toBe(true)
    })

    it('should call isBonded with the correct bond type', () => {
      mockIsBonded.mockReturnValue(false)
      hasProvider()
      expect(mockIsBonded).toHaveBeenCalledWith('status-dashboard')
    })
  })

  describe('requireProvider', () => {
    it('should throw when no provider is bonded', () => {
      mockBondGet.mockReturnValue(undefined)
      expect(() => requireProvider()).toThrow(
        'Status dashboard provider not configured. Bond a status dashboard provider first.',
      )
    })

    it('should return the provider when one is bonded', () => {
      const mock = { name: 'test-status' }
      mockBondGet.mockReturnValue(mock)
      expect(requireProvider()).toEqual(mock)
    })

    it('should call bondGet with the correct bond type', () => {
      const mock = { name: 'test-status' }
      mockBondGet.mockReturnValue(mock)
      requireProvider()
      expect(mockBondGet).toHaveBeenCalledWith('status-dashboard')
    })
  })
})
