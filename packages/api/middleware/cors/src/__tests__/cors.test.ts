const { mockBond, mockGet, mockIsBonded, mockRegisterSecrets } = vi.hoisted(() => ({
  mockBond: vi.fn(),
  mockGet: vi.fn(),
  mockIsBonded: vi.fn(),
  mockRegisterSecrets: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  bond: mockBond,
  get: mockGet,
  isBonded: mockIsBonded,
}))

vi.mock('@molecule/api-secrets', () => ({
  registerSecrets: mockRegisterSecrets,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cors,
  createCorsMiddleware,
  getCors,
  getCorsFactory,
  hasCors,
  setCors,
  setCorsFactory,
} from '../cors.js'

beforeEach(() => {
  // Don't reset registerSecrets — it's already been called at module load and
  // we don't want to rewipe its history (it never gets re-called).
  mockBond.mockReset()
  mockGet.mockReset()
  mockIsBonded.mockReset()
})

describe('setCors / getCors', () => {
  it('setCors bonds with the correct BOND_TYPE', () => {
    const mw = vi.fn()
    setCors(mw)
    expect(mockBond).toHaveBeenCalledWith('middleware:cors', mw)
  })

  it('getCors returns the bonded middleware', () => {
    const mw = vi.fn()
    mockGet.mockReturnValue(mw)
    expect(getCors()).toBe(mw)
    expect(mockGet).toHaveBeenCalledWith('middleware:cors')
  })

  it('getCors throws a helpful error when no implementation is bonded', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => getCors()).toThrow(/No CORS implementation has been bonded/)
    expect(() => getCors()).toThrow(/@molecule\/api-middleware-cors-express/)
  })
})

describe('hasCors', () => {
  it('returns true when bonded', () => {
    mockIsBonded.mockReturnValue(true)
    expect(hasCors()).toBe(true)
    expect(mockIsBonded).toHaveBeenCalledWith('middleware:cors')
  })

  it('returns false when not bonded', () => {
    mockIsBonded.mockReturnValue(false)
    expect(hasCors()).toBe(false)
  })
})

describe('default cors middleware (delegating wrapper)', () => {
  it('delegates to the bonded middleware (request/response/next pass through)', () => {
    const bonded = vi.fn()
    mockGet.mockReturnValue(bonded)
    const req = {}
    const res = {}
    const next = vi.fn()
    cors(req, res, next)
    expect(bonded).toHaveBeenCalledWith(req, res, next)
  })

  it('throws via getCors when no impl bonded (lazy — not at module load)', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => cors({}, {}, vi.fn())).toThrow(/No CORS implementation/)
  })
})

describe('setCorsFactory / getCorsFactory', () => {
  it('setCorsFactory bonds with the factory BOND_TYPE', () => {
    const factory = vi.fn()
    setCorsFactory(factory)
    expect(mockBond).toHaveBeenCalledWith('middleware:cors:factory', factory)
  })

  it('getCorsFactory returns the bonded factory', () => {
    const factory = vi.fn()
    mockGet.mockReturnValue(factory)
    expect(getCorsFactory()).toBe(factory)
    expect(mockGet).toHaveBeenCalledWith('middleware:cors:factory')
  })

  it('getCorsFactory returns null when not bonded (lenient — unlike getCors)', () => {
    mockGet.mockReturnValue(undefined)
    expect(getCorsFactory()).toBeNull()
  })
})

describe('createCorsMiddleware', () => {
  it('invokes the bonded factory with options and returns its result', () => {
    const mw = vi.fn()
    const factory = vi.fn().mockReturnValue(mw)
    mockGet.mockReturnValue(factory)
    const out = createCorsMiddleware({ origin: 'https://x.test' } as never)
    expect(factory).toHaveBeenCalledWith({ origin: 'https://x.test' })
    expect(out).toBe(mw)
  })

  it('throws when no factory is bonded', () => {
    mockGet.mockReturnValue(undefined)
    expect(() => createCorsMiddleware({} as never)).toThrow(/No CORS factory has been bonded/)
  })
})

describe('module-level secrets registration', () => {
  it('registers APP_ORIGIN / SITE_ORIGIN / APP_URL_SCHEME at module load', () => {
    // Captured at import time — assertable via the persistent .calls.
    const allKeys = mockRegisterSecrets.mock.calls
      .flatMap((c) => (c[0] as Array<{ key: string }>) ?? [])
      .map((s) => s.key)
    expect(allKeys).toContain('APP_ORIGIN')
    expect(allKeys).toContain('SITE_ORIGIN')
    expect(allKeys).toContain('APP_URL_SCHEME')
  })

  it('marks origin secrets as optional (required=false)', () => {
    const allSecrets = mockRegisterSecrets.mock.calls.flatMap(
      (c) => (c[0] as Array<{ key: string; required?: boolean }>) ?? [],
    )
    for (const s of allSecrets) {
      expect(s.required).toBe(false)
    }
  })
})
