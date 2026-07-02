/**
 * Boot-time configuration report + actionable config errors (report.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn(),
  get: vi.fn(() => null),
  isBonded: vi.fn(() => false),
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { buildConfigReport, configNotConfiguredError, logConfigReport } from '../report.js'
import { registerSecrets } from '../registry.js'

const TEST_KEYS = [
  'REPORT_TEST_SET',
  'REPORT_TEST_MISSING_REQUIRED',
  'REPORT_TEST_MISSING_OPTIONAL',
  'REPORT_TEST_DEFAULTED',
]

beforeEach(() => {
  registerSecrets([
    {
      key: 'REPORT_TEST_SET',
      description: 'A configured secret',
      helpUrl: 'https://example.com/set',
    },
    {
      key: 'REPORT_TEST_MISSING_REQUIRED',
      description: 'A missing required secret',
      helpUrl: 'https://example.com/get-it',
    },
    {
      key: 'REPORT_TEST_MISSING_OPTIONAL',
      description: 'A missing optional secret',
      required: false,
    },
    {
      key: 'REPORT_TEST_DEFAULTED',
      description: 'An unset secret with a default',
      required: false,
      default: 'the-default',
    },
  ])
  process.env.REPORT_TEST_SET = 'value'
  delete process.env.REPORT_TEST_MISSING_REQUIRED
  delete process.env.REPORT_TEST_MISSING_OPTIONAL
  delete process.env.REPORT_TEST_DEFAULTED
})

afterEach(() => {
  for (const key of TEST_KEYS) delete process.env[key]
})

describe('buildConfigReport', () => {
  it('classifies set / default / missing and splits missing by required', async () => {
    const report = await buildConfigReport(TEST_KEYS)

    expect(report.entries).toHaveLength(4)
    const byKey = Object.fromEntries(report.entries.map((e) => [e.key, e]))
    expect(byKey.REPORT_TEST_SET).toMatchObject({ status: 'set', required: true })
    expect(byKey.REPORT_TEST_MISSING_REQUIRED).toMatchObject({
      status: 'missing',
      required: true,
      helpUrl: 'https://example.com/get-it',
    })
    expect(byKey.REPORT_TEST_MISSING_OPTIONAL).toMatchObject({ status: 'missing', required: false })
    expect(byKey.REPORT_TEST_DEFAULTED).toMatchObject({ status: 'default', required: false })

    expect(report.ok).toBe(false)
    expect(report.missingRequired.map((e) => e.key)).toEqual(['REPORT_TEST_MISSING_REQUIRED'])
    expect(report.missingOptional.map((e) => e.key)).toEqual(['REPORT_TEST_MISSING_OPTIONAL'])
  })

  it('is ok when every required secret is present', async () => {
    process.env.REPORT_TEST_MISSING_REQUIRED = 'now-set'
    const report = await buildConfigReport(TEST_KEYS)
    expect(report.ok).toBe(true)
    expect(report.missingRequired).toHaveLength(0)
  })

  it('defaults to every registered definition when no keys are given', async () => {
    const report = await buildConfigReport()
    const keys = report.entries.map((e) => e.key)
    for (const key of TEST_KEYS) expect(keys).toContain(key)
  })
})

describe('logConfigReport', () => {
  it('returns the report unchanged (chainable) and never throws', async () => {
    const report = await buildConfigReport(TEST_KEYS)
    expect(logConfigReport(report)).toBe(report)
  })
})

describe('configNotConfiguredError', () => {
  it('carries statusCode 503, the errorKey, and the definition description + setup URL', () => {
    const error = configNotConfiguredError('REPORT_TEST_MISSING_REQUIRED', 'test capability')
    expect(error.statusCode).toBe(503)
    expect(error.errorKey).toBe('config.notConfigured')
    expect(error.message).toContain('REPORT_TEST_MISSING_REQUIRED is not set')
    expect(error.message).toContain('test capability is disabled')
    expect(error.message).toContain('A missing required secret')
    expect(error.message).toContain('https://example.com/get-it')
  })

  it('still produces a useful message for an unregistered key', () => {
    const error = configNotConfiguredError('TOTALLY_UNKNOWN_KEY')
    expect(error.statusCode).toBe(503)
    expect(error.message).toContain('TOTALLY_UNKNOWN_KEY is not set.')
  })
})
