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
import type { WorkspaceProvider } from '../types.js'

describe('@molecule/app-ide provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set provider via bond', () => {
    const mock = { name: 'test' } as unknown as WorkspaceProvider
    setProvider(mock)
    expect(mockBond).toHaveBeenCalledWith('ide', mock)
  })

  it('should get provider', () => {
    mockBondGet.mockReturnValue({ name: 'test' })
    expect(getProvider()).toEqual({ name: 'test' })
  })

  it('should return null when no provider set', () => {
    mockBondGet.mockReturnValue(undefined)
    expect(getProvider()).toBeNull()
  })

  it('should check if provider is bonded', () => {
    mockIsBonded.mockReturnValue(true)
    expect(hasProvider()).toBe(true)

    mockIsBonded.mockReturnValue(false)
    expect(hasProvider()).toBe(false)
  })

  it('should require provider when set', () => {
    mockBondGet.mockReturnValue({ name: 'test' })
    expect(requireProvider()).toEqual({ name: 'test' })
  })

  it('should throw when requiring absent provider', () => {
    mockBondGet.mockReturnValue(undefined)
    expect(() => requireProvider()).toThrow('IDE workspace provider not configured')
  })
})
