const { mockHasProvider, mockCan } = vi.hoisted(() => ({
  mockHasProvider: vi.fn(),
  mockCan: vi.fn(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@molecule/api-permissions', () => ({
  hasProvider: mockHasProvider,
  can: mockCan,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isSubscriberAdmin, requireAdmin } from '../authorizers/index.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function res(session?: unknown): any {
  return { locals: session === undefined ? {} : { session } }
}

describe('@molecule/api-resource-subscriber — authorizers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fail-closed defaults: no provider, deny.
    mockHasProvider.mockReturnValue(false)
    mockCan.mockResolvedValue(false)
  })

  describe('isSubscriberAdmin', () => {
    it('returns false when there is no session', async () => {
      expect(await isSubscriberAdmin(res())).toBe(false)
    })

    it('returns false when the session has no userId', async () => {
      expect(await isSubscriberAdmin(res({ isAdmin: true }))).toBe(false)
    })

    it('returns false for an authenticated non-admin user (fail-closed, no provider)', async () => {
      expect(await isSubscriberAdmin(res({ userId: 'u1' }))).toBe(false)
    })

    it('honors an isAdmin session claim without a permissions provider', async () => {
      expect(await isSubscriberAdmin(res({ userId: 'u1', isAdmin: true }))).toBe(true)
      expect(mockCan).not.toHaveBeenCalled()
    })

    it("honors a role: 'admin' session claim", async () => {
      expect(await isSubscriberAdmin(res({ userId: 'u1', role: 'admin' }))).toBe(true)
    })

    it("honors a roles array containing 'admin'", async () => {
      expect(await isSubscriberAdmin(res({ userId: 'u1', roles: ['member', 'admin'] }))).toBe(true)
    })

    it("honors a permissions array containing 'subscriber:manage'", async () => {
      expect(
        await isSubscriberAdmin(res({ userId: 'u1', permissions: ['subscriber:manage'] })),
      ).toBe(true)
    })

    it('grants when a bonded permissions provider allows manage subscriber', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      expect(await isSubscriberAdmin(res({ userId: 'rbac-admin' }))).toBe(true)
      expect(mockCan).toHaveBeenCalledWith('user:rbac-admin', 'manage', 'subscriber')
    })

    it('denies when a bonded permissions provider rejects the action', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(false)
      expect(await isSubscriberAdmin(res({ userId: 'u1' }))).toBe(false)
    })

    it('fails closed when the permissions check throws', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockRejectedValue(new Error('provider boom'))
      expect(await isSubscriberAdmin(res({ userId: 'u1' }))).toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('forwards Unauthorized when there is no session', async () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requireAdmin()({} as any, res(), next)
      expect(next).toHaveBeenCalledWith('Unauthorized')
    })

    it('forwards Forbidden for an authenticated non-admin user', async () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requireAdmin()({} as any, res({ userId: 'u1' }), next)
      expect(next).toHaveBeenCalledWith('Admin access required to manage subscribers')
    })

    it('calls next() with no argument for an admin', async () => {
      const next = vi.fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await requireAdmin()({} as any, res({ userId: 'admin', isAdmin: true }), next)
      expect(next).toHaveBeenCalledWith()
    })
  })
})
