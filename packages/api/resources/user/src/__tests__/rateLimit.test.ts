/**
 * Tests for the default auth brute-force throttle (M2-1).
 *
 * The user resource is the auth substrate `mlcl` scaffolds into every generated
 * app. Before this fix its login / 2FA routes shipped with `middlewares: []`,
 * leaving passwords and the 6-digit TOTP second factor brute-forceable. The
 * `rateLimit` authorizer wires an IP+account throttle with a low ceiling and is
 * exposed as a real handler-map key so the scaffold scanner preserves it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockHasProvider, mockConfigure, mockConsume, mockWarn, mockError, mockGetLogger, mockT } =
  vi.hoisted(() => {
    const warn = vi.fn()
    const error = vi.fn()
    return {
      mockHasProvider: vi.fn(),
      mockConfigure: vi.fn(),
      mockConsume: vi.fn(),
      mockWarn: warn,
      mockError: error,
      mockGetLogger: vi.fn(() => ({ warn, error, info: vi.fn(), debug: vi.fn() })),
      mockT: vi.fn(
        (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
          opts?.defaultValue ?? _key,
      ),
    }
  })

vi.mock('@molecule/api-bond', () => ({ getLogger: mockGetLogger }))
vi.mock('@molecule/api-i18n', () => ({ t: mockT }))
vi.mock('@molecule/api-rate-limit', () => ({
  hasProvider: mockHasProvider,
  configure: mockConfigure,
  consume: mockConsume,
}))

import type {
  MoleculeRequest,
  MoleculeRequestHandler,
  MoleculeResponse,
} from '@molecule/api-resource'

import { emailAccountKey, loginAccountKey, rateLimit } from '../authorizers/rateLimit.js'

interface TestRes extends MoleculeResponse {
  statusCode?: number
  body?: unknown
}

const makeRes = (): { res: TestRes; headers: Record<string, string> } => {
  const headers: Record<string, string> = {}
  const res = {} as TestRes
  res.setHeader = vi.fn((key: string, value: string) => {
    headers[key] = value
  })
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((body: unknown) => {
    res.body = body
  })
  return { res, headers }
}

const run = async (
  handler: MoleculeRequestHandler,
  req: Partial<MoleculeRequest>,
): Promise<{ next: ReturnType<typeof vi.fn>; res: TestRes }> => {
  const next = vi.fn()
  const { res } = makeRes()
  await handler(
    { params: {}, headers: {}, query: {}, body: {}, ...req } as unknown as MoleculeRequest,
    res,
    next,
  )
  return { next, res }
}

/** Did the middleware pass (next() with no error arg)? */
const passed = (next: ReturnType<typeof vi.fn>): boolean =>
  next.mock.calls.length === 1 && next.mock.calls[0].length === 0

/**
 * Installs a fake fixed-window provider that actually counts per key and honors
 * the per-bucket ceiling set via `configure()` immediately before each
 * `consume()` — so the test exercises the real per-IP vs per-account limit
 * split rather than a single canned response.
 */
const installFakeProvider = (): Map<string, number> => {
  const counts = new Map<string, number>()
  let currentMax = 0
  mockHasProvider.mockReturnValue(true)
  mockConfigure.mockImplementation((opts: { max: number }) => {
    currentMax = opts.max
  })
  mockConsume.mockImplementation(async (key: string) => {
    const max = currentMax
    const used = (counts.get(key) ?? 0) + 1
    counts.set(key, used)
    const allowed = used <= max
    return {
      allowed,
      remaining: Math.max(0, max - used),
      total: max,
      resetAt: new Date('2026-01-01T00:15:00Z'),
      ...(allowed ? {} : { retryAfter: 42 }),
    }
  })
  return counts
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('rateLimit authorizer (default auth brute-force protection)', () => {
  it('lets a legitimate login through while under the ceiling', async () => {
    installFakeProvider()
    const handler = rateLimit({ scope: 'auth', accountFrom: [loginAccountKey, emailAccountKey] })

    const { next, res } = await run(handler, {
      ip: '203.0.113.7',
      body: { email: 'real.user@example.com', password: 'correct horse' },
    })

    expect(passed(next)).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('REGRESSION: blocks password/TOTP-via-login brute force after the low ceiling (429, no next)', async () => {
    installFakeProvider()
    const handler = rateLimit({ scope: 'auth', accountFrom: [loginAccountKey, emailAccountKey] })

    const attempt = (token: string) =>
      run(handler, {
        ip: '198.51.100.66',
        body: { email: 'victim@example.com', password: 'guess', twoFactorToken: token },
      })

    // The first 10 attempts from the same IP+account are allowed through to the
    // handler (which still rejects wrong credentials/TOTP itself)...
    for (let i = 0; i < 10; i += 1) {
      const { next } = await attempt(String(100000 + i))
      expect(passed(next)).toBe(true)
    }

    // ...the 11th is throttled BEFORE the handler runs — closing the unbounded
    // guess rate that made the 6-digit second factor brute-forceable.
    const { next, res } = await attempt('999999')
    expect(passed(next)).toBe(false)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.body).toMatchObject({ errorKey: 'user.error.tooManyRequests' })
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '42')
  })

  it('buckets per account so a distributed (IP-rotating) attack on one account is still throttled', async () => {
    installFakeProvider()
    const handler = rateLimit({ scope: 'auth', accountFrom: [loginAccountKey, emailAccountKey] })

    // Same target account, a fresh IP every request.
    for (let i = 0; i < 10; i += 1) {
      const { next } = await run(handler, {
        ip: `10.0.0.${i}`,
        body: { email: 'target@example.com', password: 'x' },
      })
      expect(passed(next)).toBe(true)
    }

    const { next, res } = await run(handler, {
      ip: '10.0.0.250',
      body: { email: 'target@example.com', password: 'x' },
    })
    expect(passed(next)).toBe(false)
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('temp-locks the 2FA verification route after a stricter ceiling of consecutive misses', async () => {
    installFakeProvider()
    const handler = rateLimit({
      scope: '2fa',
      max: 5,
      accountFrom: [(req) => req.params?.id],
    })

    for (let i = 0; i < 5; i += 1) {
      const { next } = await run(handler, {
        ip: '192.0.2.5',
        params: { id: 'user-123' } as Record<string, string>,
        body: { token: String(100000 + i) },
      })
      expect(passed(next)).toBe(true)
    }

    const { next, res } = await run(handler, {
      ip: '192.0.2.5',
      params: { id: 'user-123' } as Record<string, string>,
      body: { token: '000000' },
    })
    expect(passed(next)).toBe(false)
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('degrades open (logs a warning, calls next) when no rate-limit provider is bonded', async () => {
    mockHasProvider.mockReturnValue(false)
    const handler = rateLimit({ scope: 'auth' })

    const { next, res } = await run(handler, { ip: '203.0.113.9', body: {} })

    expect(passed(next)).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
    expect(mockWarn).toHaveBeenCalledOnce()
    expect(mockConsume).not.toHaveBeenCalled()
  })

  it('degrades open (logs an error, calls next) when the limiter itself throws', async () => {
    mockHasProvider.mockReturnValue(true)
    mockConfigure.mockImplementation(() => {})
    mockConsume.mockRejectedValue(new Error('redis down'))
    const handler = rateLimit({ scope: 'auth', accountFrom: [emailAccountKey] })

    const { next, res } = await run(handler, {
      ip: '203.0.113.10',
      body: { email: 'real.user@example.com' },
    })

    expect(passed(next)).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
    expect(mockError).toHaveBeenCalledOnce()
  })
})
