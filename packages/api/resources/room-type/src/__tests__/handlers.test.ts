const {
  mockCreate,
  mockFindMany,
  mockFindById,
  mockUpdateById,
  mockDeleteById,
  mockCount,
  mockHasProvider,
  mockCan,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindById: vi.fn(),
  mockUpdateById: vi.fn(),
  mockDeleteById: vi.fn(),
  mockCount: vi.fn(),
  mockHasProvider: vi.fn(),
  mockCan: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  deleteById: mockDeleteById,
  count: mockCount,
}))

vi.mock('@molecule/api-permissions', () => ({
  hasProvider: mockHasProvider,
  can: mockCan,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((key: string) => key),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  }
}

/** Session claim that satisfies the room-type admin gate without a permissions provider. */
const ADMIN_SESSION = { userId: 'admin-1', isAdmin: true }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    // Default to an admin session so the (now admin-gated) mutation handlers
    // exercise their happy path; non-admin / anonymous cases override `locals`.
    locals: { session: { ...ADMIN_SESSION } },
    ...overrides,
  }
  return res
}

const ROOM_TYPE_ROW = {
  id: 'rt-1',
  propertyId: 'prop-1',
  name: 'Deluxe King',
  description: null,
  capacity: 2,
  baseRateCents: 25_000,
  currency: 'USD',
  amenities: JSON.stringify(['wifi']),
  photos: JSON.stringify([]),
  totalUnits: 12,
  active: true,
  metadata: null,
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
}

const VALID_BODY = {
  propertyId: 'prop-1',
  name: 'Deluxe King',
  capacity: 2,
  baseRateCents: 25_000,
  currency: 'USD',
  totalUnits: 12,
  amenities: ['wifi'],
}

describe('@molecule/api-resource-room-type handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Fail-closed defaults: no permissions provider, deny.
    mockHasProvider.mockReturnValue(false)
    mockCan.mockResolvedValue(false)
  })

  describe('create', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ body: VALID_BODY })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      // Fail-closed: no inventory row inserted for an anonymous caller.
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns 403 for an authenticated non-admin user (catalog injection blocked)', async () => {
      const req = mockReq({ body: VALID_BODY })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.forbidden' }),
      )
      // Fail-closed: no write attempted for a non-admin.
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a room type for a non-claim user when the permissions provider grants manage roomType', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      mockCreate.mockResolvedValueOnce({ data: ROOM_TYPE_ROW })

      const req = mockReq({ body: VALID_BODY })
      const res = mockRes({ locals: { session: { userId: 'manager-1' } } })

      await create(req, res)

      expect(mockCan).toHaveBeenCalledWith('user:manager-1', 'manage', 'roomType')
      expect(mockCreate).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 400 when required fields are missing', async () => {
      const req = mockReq({ body: { propertyId: 'prop-1' } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.fieldsRequired' }),
      )
    })

    it('returns 400 when capacity is invalid', async () => {
      const req = mockReq({ body: { ...VALID_BODY, capacity: 0 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.invalidCapacity' }),
      )
    })

    it('returns 400 when baseRateCents is negative', async () => {
      const req = mockReq({ body: { ...VALID_BODY, baseRateCents: -1 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.invalidRate' }),
      )
    })

    it('returns 400 when totalUnits is negative', async () => {
      const req = mockReq({ body: { ...VALID_BODY, totalUnits: -3 } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.invalidTotalUnits' }),
      )
    })

    it('persists a row with normalized fields and returns 201', async () => {
      mockCreate.mockResolvedValueOnce({ data: ROOM_TYPE_ROW })

      const req = mockReq({ body: VALID_BODY })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'room_types',
        expect.objectContaining({
          propertyId: 'prop-1',
          name: 'Deluxe King',
          capacity: 2,
          baseRateCents: 25_000,
          currency: 'USD',
          amenities: JSON.stringify(['wifi']),
          photos: JSON.stringify([]),
          totalUnits: 12,
          active: true,
        }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rt-1',
          propertyId: 'prop-1',
          amenities: ['wifi'],
        }),
      )
    })

    it('returns 500 on database error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({ body: VALID_BODY })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.createFailed' }),
      )
    })
  })

  describe('list', () => {
    it('returns paginated room types with default page and limit', async () => {
      mockCount.mockResolvedValueOnce(1)
      mockFindMany.mockResolvedValueOnce([ROOM_TYPE_ROW])

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ id: 'rt-1' })],
          total: 1,
          page: 1,
          limit: 20,
        }),
      )
    })

    it('filters by propertyId', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { propertyId: 'prop-9' } })
      const res = mockRes()

      await list(req, res)

      expect(mockCount).toHaveBeenCalledWith(
        'room_types',
        expect.arrayContaining([expect.objectContaining({ field: 'propertyId', value: 'prop-9' })]),
      )
    })

    it('honours activeOnly when sent as a string from URL params', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { activeOnly: 'true' } })
      const res = mockRes()

      await list(req, res)

      expect(mockCount).toHaveBeenCalledWith(
        'room_types',
        expect.arrayContaining([expect.objectContaining({ field: 'active', value: true })]),
      )
    })

    it('does not apply activeOnly when explicitly "false"', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { activeOnly: 'false' } })
      const res = mockRes()

      await list(req, res)

      const calledWhere = mockCount.mock.calls[0]?.[1] as Array<{ field: string }>
      expect(calledWhere.find((w) => w.field === 'active')).toBeUndefined()
    })

    it('filters by minCapacity', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { minCapacity: '4' } })
      const res = mockRes()

      await list(req, res)

      expect(mockCount).toHaveBeenCalledWith(
        'room_types',
        expect.arrayContaining([
          expect.objectContaining({ field: 'capacity', operator: '>=', value: 4 }),
        ]),
      )
    })

    it('clamps page to >= 1 and limit to <= 100', async () => {
      mockCount.mockResolvedValueOnce(0)
      mockFindMany.mockResolvedValueOnce([])

      const req = mockReq({ query: { page: '0', limit: '500' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'room_types',
        expect.objectContaining({ limit: 100, offset: 0 }),
      )
    })

    it('returns 500 on database error', async () => {
      mockCount.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.listFailed' }),
      )
    })
  })

  describe('read', () => {
    it('returns 404 when not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.notFound' }),
      )
    })

    it('returns the deserialized room type when found', async () => {
      mockFindById.mockResolvedValueOnce(ROOM_TYPE_ROW)

      const req = mockReq({ params: { id: 'rt-1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'rt-1',
          name: 'Deluxe King',
          amenities: ['wifi'],
        }),
      )
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({ params: { id: 'rt-1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('update', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'rt-1' }, body: { name: 'New name' } })
      const res = mockRes({ locals: {} })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 403 for an authenticated non-admin user (price/inventory edit blocked)', async () => {
      const req = mockReq({ params: { id: 'rt-1' }, body: { baseRateCents: 1 } })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.forbidden' }),
      )
      // Fail-closed: no read or write attempted for a non-admin.
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('allows a non-claim user when the permissions provider grants manage roomType', async () => {
      mockHasProvider.mockReturnValue(true)
      mockCan.mockResolvedValue(true)
      mockFindById.mockResolvedValueOnce(ROOM_TYPE_ROW)
      mockUpdateById.mockResolvedValueOnce({ data: { ...ROOM_TYPE_ROW, name: 'Renamed' } })

      const req = mockReq({ params: { id: 'rt-1' }, body: { name: 'Renamed' } })
      const res = mockRes({ locals: { session: { userId: 'rbac-user' } } })

      await update(req, res)

      expect(mockCan).toHaveBeenCalledWith('user:rbac-user', 'manage', 'roomType')
      expect(mockUpdateById).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalled()
    })

    it('returns 400 when capacity is invalid', async () => {
      const req = mockReq({ params: { id: 'rt-1' }, body: { capacity: 0 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.invalidCapacity' }),
      )
    })

    it('returns 400 when baseRateCents is negative', async () => {
      const req = mockReq({ params: { id: 'rt-1' }, body: { baseRateCents: -10 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.invalidRate' }),
      )
    })

    it('returns 400 when totalUnits is negative', async () => {
      const req = mockReq({ params: { id: 'rt-1' }, body: { totalUnits: -2 } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.invalidTotalUnits' }),
      )
    })

    it('returns 404 when room type not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' }, body: { name: 'X' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('updates only provided fields and returns the merged result', async () => {
      mockFindById.mockResolvedValueOnce(ROOM_TYPE_ROW)
      mockUpdateById.mockResolvedValueOnce({
        data: { ...ROOM_TYPE_ROW, name: 'Premier King', baseRateCents: 30_000 },
      })

      const req = mockReq({
        params: { id: 'rt-1' },
        body: { name: 'Premier King', baseRateCents: 30_000 },
      })
      const res = mockRes()

      await update(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'room_types',
        'rt-1',
        expect.objectContaining({ name: 'Premier King', baseRateCents: 30_000 }),
      )
      // Should NOT have included unspecified fields like propertyId
      const patch = mockUpdateById.mock.calls[0]?.[2] as Record<string, unknown>
      expect(patch).not.toHaveProperty('propertyId')
      expect(patch).not.toHaveProperty('capacity')

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Premier King', baseRateCents: 30_000 }),
      )
    })

    it('serializes amenities and photos arrays before persisting', async () => {
      mockFindById.mockResolvedValueOnce(ROOM_TYPE_ROW)
      mockUpdateById.mockResolvedValueOnce({ data: ROOM_TYPE_ROW })

      const req = mockReq({
        params: { id: 'rt-1' },
        body: { amenities: ['wifi', 'parking'], photos: ['https://cdn.example/a.jpg'] },
      })
      const res = mockRes()

      await update(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'room_types',
        'rt-1',
        expect.objectContaining({
          amenities: JSON.stringify(['wifi', 'parking']),
          photos: JSON.stringify(['https://cdn.example/a.jpg']),
        }),
      )
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({ params: { id: 'rt-1' }, body: { name: 'X' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('del', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'rt-1' } })
      const res = mockRes({ locals: {} })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 403 for an authenticated non-admin user (room-type delete blocked)', async () => {
      const req = mockReq({ params: { id: 'rt-1' } })
      const res = mockRes({ locals: { session: { userId: 'user-1' } } })

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.forbidden' }),
      )
      // Fail-closed: no delete attempted for a non-admin.
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('returns 404 when nothing was deleted', async () => {
      mockDeleteById.mockResolvedValueOnce({ affected: 0 })

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'roomType.error.notFound' }),
      )
    })

    it('returns 204 when deletion succeeds', async () => {
      mockDeleteById.mockResolvedValueOnce({ affected: 1 })

      const req = mockReq({ params: { id: 'rt-1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('room_types', 'rt-1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockDeleteById.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({ params: { id: 'rt-1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
