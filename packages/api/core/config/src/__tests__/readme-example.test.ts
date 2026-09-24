/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the env bond (its outside
 * world is `process.env`, set per test and restored afterwards).
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provider } from '@molecule/api-config-env'

import { getBoolean, getJson, getNumber, getRequired, setProvider, validate } from '../index.js'

const KEYS = ['DATABASE_URL', 'PORT', 'DEBUG', 'APP_FLAGS'] as const
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

  it('validates at boot and reads typed values through the env bond', () => {
    process.env.DATABASE_URL = 'postgres://localhost/app'
    process.env.PORT = '8080'
    process.env.DEBUG = 'yes'
    process.env.APP_FLAGS = '{"beta":true}'

    setProvider(provider)

    const result = validate([
      { key: 'DATABASE_URL', type: 'string', required: true },
      { key: 'PORT', type: 'number', min: 1, max: 65535 },
    ])
    if (!result.valid) throw new Error(result.errors.map((e) => e.message).join('\n'))

    expect(getRequired('DATABASE_URL')).toBe('postgres://localhost/app')
    expect(getNumber('PORT', 3000)).toBe(8080)
    expect(getBoolean('DEBUG', false)).toBe(true)
    expect(getJson<{ beta: boolean }>('APP_FLAGS', { beta: false })).toEqual({ beta: true })
  })

  it('reports problems without throwing and falls back to getter defaults', () => {
    delete process.env.DATABASE_URL
    process.env.PORT = 'not-a-port'
    delete process.env.DEBUG
    process.env.APP_FLAGS = '{bad json'

    setProvider(provider)

    const result = validate([
      { key: 'DATABASE_URL', type: 'string', required: true },
      { key: 'PORT', type: 'number', min: 1, max: 65535 },
    ])
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.key)).toEqual(['DATABASE_URL', 'PORT'])
    expect(() => getRequired('DATABASE_URL')).toThrow()
    expect(getNumber('PORT', 3000)).toBe(3000)
    expect(getBoolean('DEBUG', false)).toBe(false)
    expect(getJson<{ beta: boolean }>('APP_FLAGS', { beta: false })).toEqual({ beta: false })
  })
})
