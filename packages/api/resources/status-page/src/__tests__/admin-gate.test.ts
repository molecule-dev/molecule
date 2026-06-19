const { mockCreate, mockFindById, mockUpdateById, mockDeleteById, mockHasProvider, mockCan } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockDeleteById: vi.fn(),
    mockHasProvider: vi.fn(),
    mockCan: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-permissions', () => ({
  hasProvider: mockHasProvider,
  can: mockCan,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
  getAnalytics: () => ({ track: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-locales-status-page', () => ({}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isStatusAdmin, requireAdmin, STATUS_ADMIN_PERMISSION } from '../authorizers/index.js'
import { createIncident } from '../handlers/createIncident.js'
import { createService } from '../handlers/createService.js'
import { deleteService } from '../handlers/deleteService.js'
import { updateIncident } from '../handlers/updateIncident.js'
import { updateService } from '../handlers/updateService.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(
  locals: Record<string, unknown> = { session: { userId: 'u1', isAdmin: true } },
): any {
  return { locals }
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111'

const validServiceBody = { name: 'API', url: 'https://api.test' }
const validIncidentBody = {
  serviceId: VALID_UUID,
  title: 'Outage',
  severity: 'major',
  status: 'investigating',
  startedAt: '2026-05-13T10:00:00.000Z',
}

describe('status-page admin gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fail-closed defaults: no permissions provider, deny.
    mockHasProvider.mockReturnValue(false)
    mockCan.mockResolvedValue(false)
  })

  describe('isStatusAdmin', () => {
    it('returns false with no session (fail-closed)', async () => {
      expect(await isStatusAdmin(mockRes({}))).toBe(false)
    })

    it('returns false for an authenticated non-admin with no permission provider', async () => {
      expect(await isStatusAdmin(mockRes({ session: { userId: 'u1' } }))).toBe(false)
    })

    it('honors isAdmin === true', async () => {
      expect(await isStatusAdmin(mockRes({ session: { userId: 'u1', isAdmin: true } }))).toBe(true)
    })

    it("honors role === 'admin'", async () => {
      expect(await isStatusAdmin(mockRes({ session: { userId: 'u1', role: 'admin' } }))).toBe(true)
    })

    it("honors roles including 'admin'", async () => {
      expect(
        await isStatusAdmin(mockRes({ session: { userId: 'u1', roles: ['ops', 'admin'] } })),
      ).toBe(true)
    })

    it("honors permissions including 'status:manage'", async () => {
      expect(STATUS_ADMIN_PERMISSION).toBe('status:manage')
      expect(
        await isStatusAdmin(
          mockRes({ session: { userId: 'u1', permissions: [STATUS_ADMIN_PERMISSION] } }),
        ),
      ).toBe(true)
    })

    it('grants via a bonded permissions provider that allows manage status', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      expect(await isStatusAdmin(mockRes({ session: { userId: 'u1' } }))).toBe(true)
      expect(mockCan).toHaveBeenCalledWith('user:u1', 'manage', 'status')
    })

    it('denies (fail-closed) when the permissions check throws', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockRejectedValue(new Error('provider down'))
      expect(await isStatusAdmin(mockRes({ session: { userId: 'u1' } }))).toBe(false)
    })
  })

  describe('requireAdmin middleware', () => {
    it('calls next(Unauthorized) when there is no session', async () => {
      const next = vi.fn()
      await requireAdmin()(mockRes({}), mockRes({}), next)
      // First positional arg is the forwarded error string.
      expect(next).toHaveBeenCalledWith('Unauthorized')
    })

    it('calls next(Forbidden) for an authenticated non-admin', async () => {
      const next = vi.fn()
      const res = mockRes({ session: { userId: 'u1' } })
      await requireAdmin()(res, res, next)
      expect(next).toHaveBeenCalledWith('Permission required to manage the status page')
    })

    it('calls next() with no error for an admin', async () => {
      const next = vi.fn()
      const res = mockRes({ session: { userId: 'u1', isAdmin: true } })
      await requireAdmin()(res, res, next)
      expect(next).toHaveBeenCalledWith()
    })
  })

  // Each mutating handler: anonymous + non-admin must be denied (fail-closed),
  // and the legitimate admin path must still proceed to the database.
  const cases = [
    {
      name: 'createService',
      run: (res: unknown) =>
        createService({ tableName: 'services' })(
          { body: validServiceBody, params: {}, query: {} } as never,
          res as never,
        ),
      db: mockCreate,
    },
    {
      name: 'updateService',
      run: (res: unknown) =>
        updateService({ tableName: 'services' })(
          { body: { enabled: false }, params: { id: VALID_UUID }, query: {} } as never,
          res as never,
        ),
      db: mockUpdateById,
    },
    {
      name: 'deleteService',
      run: (res: unknown) =>
        deleteService({ tableName: 'services' })(
          { body: {}, params: { id: VALID_UUID }, query: {} } as never,
          res as never,
        ),
      db: mockDeleteById,
    },
    {
      name: 'createIncident',
      run: (res: unknown) =>
        createIncident({ tableName: 'services' })(
          { body: validIncidentBody, params: {}, query: {} } as never,
          res as never,
        ),
      db: mockCreate,
    },
    {
      name: 'updateIncident',
      run: (res: unknown) =>
        updateIncident({ tableName: 'services' })(
          { body: { status: 'resolved' }, params: { id: VALID_UUID }, query: {} } as never,
          res as never,
        ),
      db: mockUpdateById,
    },
  ]

  for (const { name, run, db } of cases) {
    describe(name, () => {
      it('denies an unauthenticated caller with 403 and writes nothing', async () => {
        const result = await run(mockRes({}))
        expect((result as { statusCode: number }).statusCode).toBe(403)
        expect((result as { body: { errorKey: string } }).body.errorKey).toBe(
          'status.error.forbidden',
        )
        expect(db).not.toHaveBeenCalled()
      })

      it('denies an authenticated non-admin with 403 and writes nothing', async () => {
        const result = await run(mockRes({ session: { userId: 'attacker' } }))
        expect((result as { statusCode: number }).statusCode).toBe(403)
        expect((result as { body: { errorKey: string } }).body.errorKey).toBe(
          'status.error.forbidden',
        )
        expect(db).not.toHaveBeenCalled()
      })

      it('allows an admin (legitimate flow keeps working)', async () => {
        // findById must return an existing row for the update/delete handlers.
        mockFindById.mockResolvedValue({ id: VALID_UUID })
        mockCreate.mockResolvedValue({ data: { id: VALID_UUID } })
        mockUpdateById.mockResolvedValue({ data: { id: VALID_UUID } })
        mockDeleteById.mockResolvedValue({ data: { id: VALID_UUID } })

        const result = await run(mockRes({ session: { userId: 'u1', isAdmin: true } }))
        // Admin path is not blocked: status is a success code, not 403/401.
        expect([200, 201]).toContain((result as { statusCode: number }).statusCode)
        expect(db).toHaveBeenCalled()
      })
    })
  }
})
