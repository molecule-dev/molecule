import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Capture logger calls so we can assert the relaxed-mode warning fires and
// silence its output during the test run.
const { mockWarn, mockError } = vi.hoisted(() => ({
  mockWarn: vi.fn(),
  mockError: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({ info: vi.fn(), warn: mockWarn, error: mockError }),
}))

describe('deriveSsl (verify-by-default)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED
    delete process.env.PGSSLROOTCERT
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('local / explicit no-SSL connections → no TLS', () => {
    it.each([
      'postgres://localhost:5432/myapp',
      'postgres://127.0.0.1:5432/myapp',
      'postgres://user:pw@172.17.0.1:5432/myapp?sslmode=disable',
      'postgres:///myapp',
      'postgresql:///myapp',
    ])('returns false for %s', async (url) => {
      const { deriveSsl } = await import('../ssl.js')
      expect(deriveSsl(url)).toBe(false)
    })
  })

  // THE FIX: a remote managed Postgres with no explicit opt-out must VERIFY
  // the server certificate. Before the fix this returned
  // `{ rejectUnauthorized: false }`, silently accepting any cert (MITM-able).
  describe('remote connection with no opt-out → verify against system CA', () => {
    it('returns true (verification on) for a remote managed DB', async () => {
      const { deriveSsl } = await import('../ssl.js')
      const result = deriveSsl('postgres://user:secret@db.example-cloud.com:5432/app')
      expect(result).toBe(true)
      // It must NOT be the insecure relaxed object.
      expect(result).not.toEqual({ rejectUnauthorized: false })
      expect(mockWarn).not.toHaveBeenCalled()
    })
  })

  describe('explicit operator opt-out → relax verification + warn once', () => {
    it('relaxes when DATABASE_SSL_REJECT_UNAUTHORIZED=false', async () => {
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'false'
      const { deriveSsl } = await import('../ssl.js')
      expect(deriveSsl('postgres://user:pw@db.example-cloud.com:5432/app')).toEqual({
        rejectUnauthorized: false,
      })
      expect(mockWarn).toHaveBeenCalledTimes(1)
    })

    it('relaxes when sslmode=no-verify is in the URL', async () => {
      const { deriveSsl } = await import('../ssl.js')
      expect(
        deriveSsl('postgres://user:pw@db.example-cloud.com:5432/app?sslmode=no-verify'),
      ).toEqual({ rejectUnauthorized: false })
      expect(mockWarn).toHaveBeenCalledTimes(1)
    })

    it('warns at most once per process even across multiple calls', async () => {
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'false'
      const { deriveSsl } = await import('../ssl.js')
      deriveSsl('postgres://a@db.example-cloud.com/app')
      deriveSsl('postgres://b@db.example-cloud.com/app')
      expect(mockWarn).toHaveBeenCalledTimes(1)
    })
  })

  describe('private-CA managed provider → PGSSLROOTCERT, verification ON', () => {
    let tmpDir: string
    let caPath: string

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'pg-ssl-test-'))
      caPath = join(tmpDir, 'ca.pem')
      writeFileSync(caPath, '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n')
    })

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true })
    })

    it('verifies against the operator CA bundle without disabling verification', async () => {
      process.env.PGSSLROOTCERT = caPath
      const { deriveSsl } = await import('../ssl.js')
      const result = deriveSsl('postgres://user:pw@db.example-cloud.com:5432/app')
      expect(result).toEqual({
        ca: '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n',
        rejectUnauthorized: true,
      })
    })

    it('falls back to system-CA verification (not disabled) when the CA file is unreadable', async () => {
      process.env.PGSSLROOTCERT = join(tmpDir, 'does-not-exist.pem')
      const { deriveSsl } = await import('../ssl.js')
      const result = deriveSsl('postgres://user:pw@db.example-cloud.com:5432/app')
      expect(result).toBe(true)
      expect(mockError).toHaveBeenCalledTimes(1)
    })
  })

  describe('isLocalUrl', () => {
    it('detects local and explicit no-SSL URLs', async () => {
      const { isLocalUrl } = await import('../ssl.js')
      expect(isLocalUrl('postgres://localhost/app')).toBe(true)
      expect(isLocalUrl('postgres://db.example-cloud.com/app')).toBe(false)
    })
  })
})
