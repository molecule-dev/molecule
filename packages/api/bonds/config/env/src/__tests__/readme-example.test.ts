/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getBoolean, getNumber, getRequired, setProvider, validate } from '@molecule/api-config'

import { provider } from '../index.js'

const KEYS = ['DATABASE_URL', 'PORT', 'FEATURE_SIGNUPS'] as const
const saved: Record<string, string | undefined> = {}

describe('README @example', () => {
  beforeEach(() => {
    for (const key of KEYS) saved[key] = process.env[key]
  })

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('validates the env at boot and reads typed values through the core', () => {
    process.env.DATABASE_URL = 'postgres://localhost/app'
    process.env.PORT = '8080'
    process.env.FEATURE_SIGNUPS = 'true'

    setProvider(provider)

    const result = validate([
      { key: 'DATABASE_URL', type: 'string', required: true },
      { key: 'PORT', type: 'number', min: 1, max: 65535 },
      { key: 'FEATURE_SIGNUPS', type: 'boolean' },
    ])
    expect(result.valid).toBe(true)

    expect(getRequired('DATABASE_URL')).toBe('postgres://localhost/app')
    expect(getNumber('PORT', 3000)).toBe(8080)
    expect(getBoolean('FEATURE_SIGNUPS', false)).toBe(true)
  })

  it('reports missing/malformed vars and falls back to getter defaults', () => {
    delete process.env.DATABASE_URL
    process.env.PORT = 'abc'
    delete process.env.FEATURE_SIGNUPS

    setProvider(provider)

    const result = validate([
      { key: 'DATABASE_URL', type: 'string', required: true },
      { key: 'PORT', type: 'number', min: 1, max: 65535 },
      { key: 'FEATURE_SIGNUPS', type: 'boolean' },
    ])
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.key)).toEqual(['DATABASE_URL', 'PORT'])
    expect(() => getRequired('DATABASE_URL')).toThrow()
    expect(getNumber('PORT', 3000)).toBe(3000)
    expect(getBoolean('FEATURE_SIGNUPS', false)).toBe(false)
  })
})
