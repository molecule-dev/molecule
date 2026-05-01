/**
 * Sanity test: the package barrel re-exports the documented public surface.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}))

import * as pkg from '../index.js'

describe('package barrel', () => {
  it('exports all documented public functions', () => {
    expect(typeof pkg.issueToken).toBe('function')
    expect(typeof pkg.verifyToken).toBe('function')
    expect(typeof pkg.revokeToken).toBe('function')
    expect(typeof pkg.recordTokenUse).toBe('function')
    expect(typeof pkg.listTokens).toBe('function')
    expect(typeof pkg.rotateToken).toBe('function')
  })

  it('exports the resource definition', () => {
    expect(pkg.resource.name).toBe('DeviceAuthToken')
    expect(pkg.resource.tableName).toBe('device_auth_tokens')
  })

  it('exports the masking and hashing utilities', () => {
    expect(typeof pkg.hashPlaintextToken).toBe('function')
    expect(typeof pkg.maskPlaintextToken).toBe('function')
    expect(typeof pkg.generatePlaintextToken).toBe('function')
    expect(typeof pkg.constantTimeEqual).toBe('function')
  })
})
