/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real env bond.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import { createEnvProvider } from '@molecule/api-secrets-env'

import {
  buildConfigReport,
  getRequired,
  logConfigReport,
  registerSecret,
  setProvider,
} from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    delete process.env.GEOCODER_API_KEY
  })

  it('reports and returns a configured secret', async () => {
    process.env.GEOCODER_API_KEY = 'test-key'
    setProvider(createEnvProvider({ path: '.env' }))
    registerSecret({
      key: 'GEOCODER_API_KEY',
      description: 'API key for the geocoding service',
      helpUrl: 'https://geocoder.example.com/keys',
    })

    const report = logConfigReport(await buildConfigReport(['GEOCODER_API_KEY', 'PORT']))
    expect(report.ok).toBe(true)
    expect(report.entries.map((e) => [e.key, e.status])).toEqual([
      ['GEOCODER_API_KEY', 'set'],
      ['PORT', process.env.PORT ? 'set' : 'default'],
    ])

    expect(await getRequired('GEOCODER_API_KEY')).toBe('test-key')
  })

  it('flags the missing secret without throwing, and getRequired fails fast', async () => {
    setProvider(createEnvProvider({ path: '.env' }))
    registerSecret({
      key: 'GEOCODER_API_KEY',
      description: 'API key for the geocoding service',
      helpUrl: 'https://geocoder.example.com/keys',
    })

    const report = logConfigReport(await buildConfigReport(['GEOCODER_API_KEY', 'PORT']))
    expect(report.ok).toBe(false)
    expect(report.missingRequired.map((e) => e.key)).toEqual(['GEOCODER_API_KEY'])

    await expect(getRequired('GEOCODER_API_KEY')).rejects.toThrow(/GEOCODER_API_KEY/)
  })
})
