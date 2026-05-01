/**
 * Sanity test: the package barrel re-exports the documented public surface.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}))

import * as pkg from '../index.js'

describe('package barrel', () => {
  it('exports all documented public functions', () => {
    expect(typeof pkg.createApiKey).toBe('function')
    expect(typeof pkg.rotateApiKey).toBe('function')
    expect(typeof pkg.revokeApiKey).toBe('function')
    expect(typeof pkg.verifyApiKey).toBe('function')
    expect(typeof pkg.recordApiKeyUse).toBe('function')
  })

  it('exports the resource definition', () => {
    expect(pkg.resource.name).toBe('ApiKey')
    expect(pkg.resource.tableName).toBe('api_keys')
  })

  it('exports the masking and hashing utilities', () => {
    expect(typeof pkg.hashPlaintextToken).toBe('function')
    expect(typeof pkg.maskPlaintextToken).toBe('function')
    expect(typeof pkg.generatePlaintextToken).toBe('function')
    expect(typeof pkg.constantTimeEqual).toBe('function')
  })
})
