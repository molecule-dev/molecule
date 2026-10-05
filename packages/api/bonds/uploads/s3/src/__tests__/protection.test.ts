/**
 * Tests for per-object Object Lock / checksum options and the bucket-protection probe.
 *
 * @module
 */

import { PassThrough } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSend = vi.fn()
const mockUploadDone = vi.fn()
const mockTrackBondFailure = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () {
    return { send: mockSend }
  }),
  DeleteObjectCommand: vi.fn(function (params: unknown) {
    return { params, type: 'DeleteObjectCommand' }
  }),
  GetObjectCommand: vi.fn(function (params: unknown) {
    return { params, type: 'GetObjectCommand' }
  }),
  HeadObjectCommand: vi.fn(function (params: unknown) {
    return { params, type: 'HeadObjectCommand' }
  }),
  GetBucketVersioningCommand: vi.fn(function (params: unknown) {
    return { params, type: 'GetBucketVersioningCommand' }
  }),
  GetObjectLockConfigurationCommand: vi.fn(function (params: unknown) {
    return { params, type: 'GetObjectLockConfigurationCommand' }
  }),
}))

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn(function ({ params }: { params: unknown }) {
    return { done: mockUploadDone, abort: vi.fn(), params }
  }),
}))

vi.mock('@molecule/api-analytics', () => ({
  trackBondFailure: (...args: unknown[]) => mockTrackBondFailure(...args),
}))

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }
const info = { filename: 'a.bin', encoding: '7bit', mimeType: 'application/octet-stream' }
const DAY = 86_400_000

/**
 * Params of every `Upload` constructed so far.
 * @returns The params, in order.
 */
async function uploadParams(): Promise<Record<string, unknown>[]> {
  const { Upload } = await import('@aws-sdk/lib-storage')
  return (Upload as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => (c[0] as { params: Record<string, unknown> }).params,
  )
}

/**
 * Options of every `S3Client` constructed so far.
 * @returns The options, in order.
 */
async function clientOptions(): Promise<Record<string, unknown>[]> {
  const { S3Client } = await import('@aws-sdk/client-s3')
  return (S3Client as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => c[0] as Record<string, unknown>,
  )
}

beforeEach(async () => {
  vi.resetModules()
  vi.resetAllMocks()
  mockUploadDone.mockResolvedValue({ Location: 'x' })
  const { bond } = await import('@molecule/api-bond')
  bond('logger', mockLogger)
})

afterEach(async () => {
  const { unbond } = await import('@molecule/api-bond')
  unbond('logger')
})

describe('objectLock', () => {
  it('sends the mode and a retain-until date of now + retainDays on every upload', async () => {
    const { createProvider } = await import('../provider.js')
    const store = createProvider({
      bucket: 'backups',
      objectLock: { mode: 'COMPLIANCE', retainDays: 30 },
    })
    const before = Date.now()
    store.upload('dump', new PassThrough(), info, vi.fn())
    const after = Date.now()

    const [params] = await uploadParams()
    expect(params.ObjectLockMode).toBe('COMPLIANCE')
    const until = (params.ObjectLockRetainUntilDate as Date).getTime()
    expect(until).toBeGreaterThanOrEqual(before + 30 * DAY)
    expect(until).toBeLessThanOrEqual(after + 30 * DAY)
    // A lock PUT needs a checksum: named explicitly when none is configured.
    expect(params.ChecksumAlgorithm).toBe('CRC32')
  })

  it('computes the retain-until date per upload, not once per provider', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-01T00:00:00Z'))
      const { createProvider } = await import('../provider.js')
      const store = createProvider({
        bucket: 'b',
        objectLock: { mode: 'GOVERNANCE', retainDays: 1 },
      })
      store.upload('a', new PassThrough(), info, vi.fn())
      vi.setSystemTime(new Date('2026-10-05T00:00:00Z'))
      store.upload('b', new PassThrough(), info, vi.fn())
      const [first, second] = await uploadParams()
      expect(first.ObjectLockMode).toBe('GOVERNANCE')
      expect((first.ObjectLockRetainUntilDate as Date).toISOString()).toBe(
        '2026-10-02T00:00:00.000Z',
      )
      expect((second.ObjectLockRetainUntilDate as Date).toISOString()).toBe(
        '2026-10-06T00:00:00.000Z',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('sends no lock or checksum params when not configured', async () => {
    const { createProvider } = await import('../provider.js')
    createProvider({ bucket: 'b' }).upload('f', new PassThrough(), info, vi.fn())
    const [params] = await uploadParams()
    expect(params).not.toHaveProperty('ObjectLockMode')
    expect(params).not.toHaveProperty('ObjectLockRetainUntilDate')
    expect(params).not.toHaveProperty('ChecksumAlgorithm')
    const [opts] = await clientOptions()
    expect(opts).not.toHaveProperty('requestChecksumCalculation')
  })

  it('rejects an invalid retainDays, an unknown mode, and checksumAlgorithm none', async () => {
    const { createProvider } = await import('../provider.js')
    expect(() =>
      createProvider({ bucket: 'b', objectLock: { mode: 'COMPLIANCE', retainDays: 0 } }),
    ).toThrow(/retainDays/)
    expect(() =>
      createProvider({ bucket: 'b', objectLock: { mode: 'COMPLIANCE', retainDays: NaN } }),
    ).toThrow(/retainDays/)
    expect(() =>
      createProvider({
        bucket: 'b',
        objectLock: { mode: 'LEGAL' as 'COMPLIANCE', retainDays: 1 },
      }),
    ).toThrow(/mode/)
    expect(() =>
      createProvider({
        bucket: 'b',
        objectLock: { mode: 'COMPLIANCE', retainDays: 1 },
        checksumAlgorithm: 'none',
      }),
    ).toThrow(/checksumAlgorithm/)
  })
})

describe('checksumAlgorithm', () => {
  it('passes the configured algorithm through as ChecksumAlgorithm', async () => {
    const { createProvider } = await import('../provider.js')
    createProvider({ bucket: 'b', checksumAlgorithm: 'SHA256' }).upload(
      'f',
      new PassThrough(),
      info,
      vi.fn(),
    )
    createProvider({
      bucket: 'b',
      checksumAlgorithm: 'CRC32C',
      objectLock: { mode: 'COMPLIANCE', retainDays: 7 },
    }).upload('f', new PassThrough(), info, vi.fn())
    const [plain, locked] = await uploadParams()
    expect(plain.ChecksumAlgorithm).toBe('SHA256')
    expect(locked.ChecksumAlgorithm).toBe('CRC32C')
  })

  it("'none' sends no algorithm and turns the SDK's automatic checksum off", async () => {
    const { createProvider } = await import('../provider.js')
    const store = createProvider({ bucket: 'b', checksumAlgorithm: 'none' })
    store.upload('f', new PassThrough(), info, vi.fn())
    const [params] = await uploadParams()
    expect(params).not.toHaveProperty('ChecksumAlgorithm')
    const [opts] = await clientOptions()
    expect(opts.requestChecksumCalculation).toBe('WHEN_REQUIRED')
  })
})

describe('describeBucketProtection', () => {
  /**
   * Answers each command type with a configured result (or rejection).
   * @param answers - Per command type: a value to resolve, or an Error to reject with.
   */
  function answer(answers: Record<string, unknown>): void {
    mockSend.mockImplementation(async (cmd: { type: string }) => {
      const a = answers[cmd.type]
      if (a instanceof Error) throw a
      return a
    })
  }

  it('reports versioning Enabled and a COMPLIANCE 30-day default retention', async () => {
    answer({
      GetBucketVersioningCommand: { Status: 'Enabled' },
      GetObjectLockConfigurationCommand: {
        ObjectLockConfiguration: {
          ObjectLockEnabled: 'Enabled',
          Rule: { DefaultRetention: { Mode: 'COMPLIANCE', Days: 30 } },
        },
      },
    })
    const { createProvider } = await import('../provider.js')
    const p = await createProvider({ bucket: 'vault' }).describeBucketProtection()
    expect(p).toEqual({
      versioning: 'Enabled',
      objectLock: { enabled: true, mode: 'COMPLIANCE', days: 30 },
      checkedAt: expect.any(String),
    })
    expect(Number.isNaN(Date.parse(p.checkedAt))).toBe(false)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'GetBucketVersioningCommand', params: { Bucket: 'vault' } }),
    )
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GetObjectLockConfigurationCommand',
        params: { Bucket: 'vault' },
      }),
    )
  })

  it('reports a bucket without object lock (and never versioned) as such', async () => {
    answer({
      GetBucketVersioningCommand: {},
      GetObjectLockConfigurationCommand: Object.assign(new Error('no lock config'), {
        name: 'ObjectLockConfigurationNotFoundError',
        $metadata: { httpStatusCode: 404 },
      }),
    })
    const { createProvider } = await import('../provider.js')
    const p = await createProvider({ bucket: 'b' }).describeBucketProtection()
    expect(p.versioning).toBe('off')
    expect(p.objectLock).toEqual({ enabled: false })
    expect(mockTrackBondFailure).not.toHaveBeenCalled()
  })

  it('reports Suspended versioning', async () => {
    answer({
      GetBucketVersioningCommand: { Status: 'Suspended' },
      GetObjectLockConfigurationCommand: { ObjectLockConfiguration: {} },
    })
    const { createProvider } = await import('../provider.js')
    const p = await createProvider({ bucket: 'b' }).describeBucketProtection()
    expect(p.versioning).toBe('Suspended')
    expect(p.objectLock).toEqual({ enabled: false })
  })

  it('throws and tracks the failure on AccessDenied', async () => {
    const denied = Object.assign(new Error('Access Denied'), {
      name: 'AccessDenied',
      $metadata: { httpStatusCode: 403 },
    })
    answer({
      GetBucketVersioningCommand: { Status: 'Enabled' },
      GetObjectLockConfigurationCommand: denied,
    })
    const { createProvider } = await import('../provider.js')
    await expect(createProvider({ bucket: 'b' }).describeBucketProtection()).rejects.toThrow(
      'Access Denied',
    )
    expect(mockTrackBondFailure).toHaveBeenCalledWith({
      bond: 'uploads-s3',
      operation: 'describe-protection',
      error: denied,
    })
  })

  it('throws on NoSuchBucket from the object-lock read too, even though it is a 404', async () => {
    const missing = Object.assign(new Error('no bucket'), {
      name: 'NoSuchBucket',
      $metadata: { httpStatusCode: 404 },
    })
    answer({
      GetBucketVersioningCommand: { Status: 'Enabled' },
      GetObjectLockConfigurationCommand: missing,
    })
    const { createProvider } = await import('../provider.js')
    await expect(createProvider({ bucket: 'b' }).describeBucketProtection()).rejects.toBe(missing)
  })

  it('throws on NoSuchBucket even though it is a 404', async () => {
    const missing = Object.assign(new Error('no bucket'), {
      name: 'NoSuchBucket',
      $metadata: { httpStatusCode: 404 },
    })
    answer({ GetBucketVersioningCommand: missing })
    const { createProvider } = await import('../provider.js')
    await expect(createProvider({ bucket: 'b' }).describeBucketProtection()).rejects.toBe(missing)
    expect(mockTrackBondFailure).toHaveBeenCalledTimes(1)
  })
})

describe('bucketProtectionMeets', () => {
  const base = {
    versioning: 'Enabled' as const,
    objectLock: { enabled: true, mode: 'COMPLIANCE' as const, days: 30 },
    checkedAt: '2026-10-05T00:00:00.000Z',
  }

  it('accepts a bucket that meets every requirement', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    expect(bucketProtectionMeets(base, { mode: 'COMPLIANCE', minDays: 30 })).toEqual({
      ok: true,
      reasons: [],
    })
  })

  it('fails when versioning is not Enabled', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    for (const versioning of ['off', 'Suspended'] as const) {
      const r = bucketProtectionMeets({ ...base, versioning }, { mode: 'GOVERNANCE', minDays: 1 })
      expect(r.ok).toBe(false)
      expect(r.reasons.join(' ')).toMatch(/versioning/)
    }
  })

  it('fails when object lock is off', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    const r = bucketProtectionMeets(
      { ...base, objectLock: { enabled: false } },
      { mode: 'GOVERNANCE', minDays: 1 },
    )
    expect(r.ok).toBe(false)
    expect(r.reasons).toEqual(['object lock is not enabled on the bucket'])
  })

  it('COMPLIANCE satisfies a GOVERNANCE want; GOVERNANCE does not satisfy COMPLIANCE', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    expect(bucketProtectionMeets(base, { mode: 'GOVERNANCE', minDays: 30 }).ok).toBe(true)
    const gov = { ...base, objectLock: { enabled: true, mode: 'GOVERNANCE' as const, days: 30 } }
    expect(bucketProtectionMeets(gov, { mode: 'GOVERNANCE', minDays: 30 }).ok).toBe(true)
    const r = bucketProtectionMeets(gov, { mode: 'COMPLIANCE', minDays: 30 })
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/COMPLIANCE is required/)
  })

  it('fails when the default retention is shorter than minDays, or missing', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    const r = bucketProtectionMeets(base, { mode: 'COMPLIANCE', minDays: 31 })
    expect(r.ok).toBe(false)
    expect(r.reasons).toEqual(['default retention is 30 days, at least 31 are required'])
    const noRule = bucketProtectionMeets(
      { ...base, objectLock: { enabled: true } },
      { mode: 'GOVERNANCE', minDays: 1 },
    )
    expect(noRule.ok).toBe(false)
    expect(noRule.reasons).toEqual(['the bucket has no default retention rule'])
  })

  it('counts years as 365 days', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    const years = { ...base, objectLock: { enabled: true, mode: 'COMPLIANCE' as const, years: 1 } }
    expect(bucketProtectionMeets(years, { mode: 'COMPLIANCE', minDays: 365 }).ok).toBe(true)
    expect(bucketProtectionMeets(years, { mode: 'COMPLIANCE', minDays: 366 }).ok).toBe(false)
  })

  it('reports every unmet requirement at once', async () => {
    const { bucketProtectionMeets } = await import('../provider.js')
    const r = bucketProtectionMeets(
      { versioning: 'off', objectLock: { enabled: false }, checkedAt: base.checkedAt },
      { mode: 'COMPLIANCE', minDays: 30 },
    )
    expect(r.reasons).toHaveLength(2)
  })
})
