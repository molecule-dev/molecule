const { mockCreate, mockFindOne, mockFindMany, mockFindById, mockUpdateById, mockCount } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockCount: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  findById: mockFindById,
  updateById: mockUpdateById,
  count: mockCount,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
  registerLocaleModule: vi.fn(),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@molecule/api-locales-property', () => ({}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { createAmenity } from '../handlers/createAmenity.js'
import { createPhoto } from '../handlers/createPhoto.js'
import { createUnit } from '../handlers/createUnit.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { listAmenities } from '../handlers/listAmenities.js'
import { listPhotos } from '../handlers/listPhotos.js'
import { listUnits } from '../handlers/listUnits.js'
import { read } from '../handlers/read.js'
import { update } from '../handlers/update.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(userId = 'user-1'): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId } },
  }
  return res
}

/** Response with no authenticated session — mirrors a request from an anonymous caller. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockAnonRes(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: {},
  }
  return res
}

const validAddress = {
  addressLine1: '123 Main St',
  city: 'Springfield',
  countryCode: 'US',
}

describe('@molecule/api-resource-property handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('returns 400 when name is missing', async () => {
      const req = mockReq({ body: { ...validAddress } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.nameRequired' }),
      )
    })

    it('returns 400 when name is blank', async () => {
      const req = mockReq({ body: { name: '   ', ...validAddress } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.nameRequired' }),
      )
    })

    it('returns 400 when address is missing', async () => {
      const req = mockReq({ body: { name: 'Main' } })
      const res = mockRes()

      mockFindOne.mockResolvedValue(null)
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.addressRequired' }),
      )
    })

    it('returns 400 when name produces empty slug', async () => {
      const req = mockReq({ body: { name: '!!!', ...validAddress } })
      const res = mockRes()

      mockFindOne.mockResolvedValue(null)
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.invalidName' }),
      )
    })

    it('creates property with slugified name and uppercased country code', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({
        data: { id: '1', name: 'Sunset Apartments', slug: 'sunset-apartments' },
      })

      const req = mockReq({
        body: {
          name: 'Sunset Apartments!',
          addressLine1: '123 Main St',
          city: 'Springfield',
          countryCode: 'us',
        },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'properties',
        expect.objectContaining({
          name: 'Sunset Apartments!',
          slug: 'sunset-apartments',
          countryCode: 'US',
          type: 'apartment',
          status: 'draft',
          unitCount: 0,
        }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('appends timestamp suffix on slug collision', async () => {
      mockFindOne.mockResolvedValue({ id: 'existing', slug: 'building' })
      mockCreate.mockResolvedValue({ data: { id: '2' } })

      const req = mockReq({ body: { name: 'Building', ...validAddress } })
      const res = mockRes()

      await create(req, res)

      const createdSlug = mockCreate.mock.calls[0][1].slug as string
      expect(createdSlug).toMatch(/^building-[a-z0-9]+$/)
    })

    it('accepts optional fields', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        body: {
          name: 'Grand Hotel',
          ...validAddress,
          type: 'hotel',
          status: 'active',
          description: 'Luxury accommodations',
          coverImageUrl: 'https://example.com/cover.jpg',
          latitude: 40.71,
          longitude: -74.0,
          region: 'NY',
          postalCode: '10001',
        },
      })
      const res = mockRes()

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'properties',
        expect.objectContaining({
          type: 'hotel',
          status: 'active',
          description: 'Luxury accommodations',
          coverImageUrl: 'https://example.com/cover.jpg',
          latitude: 40.71,
          longitude: -74.0,
          region: 'NY',
          postalCode: '10001',
        }),
      )
    })

    it('returns 500 on database error', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ body: { name: 'Test', ...validAddress } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.createFailed' }),
      )
    })
  })

  describe('read', () => {
    it('returns property by id', async () => {
      const property = { id: '1', name: 'House', deletedAt: null }
      mockFindById.mockResolvedValue(property)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(property)
    })

    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.notFound' }),
      )
    })

    it('returns 404 for soft-deleted property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.readFailed' }),
      )
    })
  })

  describe('list', () => {
    it('returns paginated properties excluding soft-deleted', async () => {
      const properties = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ]
      mockFindMany.mockResolvedValue(properties)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('properties', {
        where: [{ field: 'deletedAt', operator: 'is_null' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
      expect(res.json).toHaveBeenCalledWith({ data: properties, page: 1, perPage: 20 })
    })

    it('respects page and perPage query params', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ query: { page: '3', perPage: '10' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('properties', {
        where: [{ field: 'deletedAt', operator: 'is_null' }],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 10,
        offset: 20,
      })
    })

    it('caps perPage at 100', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({ query: { perPage: '500' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'properties',
        expect.objectContaining({ limit: 100 }),
      )
    })

    it('filters by status, type, and city when provided', async () => {
      mockFindMany.mockResolvedValue([])

      const req = mockReq({
        query: { status: 'active', type: 'hotel', city: 'Springfield' },
      })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('properties', {
        where: [
          { field: 'deletedAt', operator: 'is_null' },
          { field: 'status', operator: '=', value: 'active' },
          { field: 'type', operator: '=', value: 'hotel' },
          { field: 'city', operator: '=', value: 'Springfield' },
        ],
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
        limit: 20,
        offset: 0,
      })
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.listFailed' }),
      )
    })
  })

  describe('update', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' }, body: { name: 'New' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 for soft-deleted property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' }, body: { name: 'New' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('updates only provided fields', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1', name: 'Updated' } })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Updated' } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.name).toBe('Updated')
      expect(updateData.updatedAt).toBeDefined()
      expect(updateData.description).toBeUndefined()
      expect(updateData.type).toBeUndefined()
    })

    it('uppercases countryCode on update', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({ params: { id: '1' }, body: { countryCode: 'fr' } })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.countryCode).toBe('FR')
    })

    it('updates multiple fields', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({
        params: { id: '1' },
        body: { type: 'house', status: 'active', city: 'Brooklyn', latitude: 40.6 },
      })
      const res = mockRes()

      await update(req, res)

      const updateData = mockUpdateById.mock.calls[0][2] as Record<string, unknown>
      expect(updateData.type).toBe('house')
      expect(updateData.status).toBe('active')
      expect(updateData.city).toBe('Brooklyn')
      expect(updateData.latitude).toBe(40.6)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' }, body: { name: 'Test' } })
      const res = mockRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.updateFailed' }),
      )
    })
  })

  describe('del', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 for already soft-deleted property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('soft-deletes property and returns 204', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'properties',
        '1',
        expect.objectContaining({
          deletedAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      )
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.deleteFailed' }),
      )
    })
  })

  describe('listUnits', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await listUnits(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 404 for soft-deleted property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: '2025-01-01T00:00:00Z' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listUnits(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns units for a valid property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      const units = [
        { id: 'u1', propertyId: '1', name: '101' },
        { id: 'u2', propertyId: '1', name: '102' },
      ]
      mockFindMany.mockResolvedValue(units)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listUnits(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('property_units', {
        where: [{ field: 'propertyId', operator: '=', value: '1' }],
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      })
      expect(res.json).toHaveBeenCalledWith(units)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listUnits(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.listUnitsFailed' }),
      )
    })
  })

  describe('createUnit', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' }, body: { name: '101' } })
      const res = mockRes()

      await createUnit(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 400 when unit name is missing', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })

      const req = mockReq({ params: { id: '1' }, body: {} })
      const res = mockRes()

      await createUnit(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unitNameRequired' }),
      )
    })

    it('creates unit, recounts unitCount, and updates property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockCreate.mockResolvedValue({ data: { id: 'u1', propertyId: '1', name: '101' } })
      mockCount.mockResolvedValue(7)
      mockUpdateById.mockResolvedValue({ data: { id: '1', unitCount: 7 } })

      const req = mockReq({
        params: { id: '1' },
        body: { name: '101', floor: 1, bedrooms: 2 },
      })
      const res = mockRes()

      await createUnit(req, res)

      expect(mockCreate).toHaveBeenCalledWith('property_units', {
        propertyId: '1',
        name: '101',
        description: null,
        floor: 1,
        bedrooms: 2,
        bathrooms: null,
        maxOccupancy: null,
        areaSquareMetres: null,
        isAvailable: true,
      })
      expect(mockCount).toHaveBeenCalledWith('property_units', [
        { field: 'propertyId', operator: '=', value: '1' },
      ])
      expect(mockUpdateById).toHaveBeenCalledWith(
        'properties',
        '1',
        expect.objectContaining({ unitCount: 7 }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' }, body: { name: '101' } })
      const res = mockRes()

      await createUnit(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.createUnitFailed' }),
      )
    })
  })

  describe('listPhotos', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await listPhotos(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns photos ordered by position then createdAt', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      const photos = [{ id: 'p1', propertyId: '1', url: 'https://example.com/a.jpg', position: 0 }]
      mockFindMany.mockResolvedValue(photos)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listPhotos(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('property_photos', {
        where: [{ field: 'propertyId', operator: '=', value: '1' }],
        orderBy: [
          { field: 'position', direction: 'asc' },
          { field: 'createdAt', direction: 'asc' },
        ],
      })
      expect(res.json).toHaveBeenCalledWith(photos)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockRejectedValue(new Error('DB error'))

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listPhotos(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.listPhotosFailed' }),
      )
    })
  })

  describe('createPhoto', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({
        params: { id: 'missing' },
        body: { url: 'https://example.com/a.jpg' },
      })
      const res = mockRes()

      await createPhoto(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 400 when photo url is missing', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })

      const req = mockReq({ params: { id: '1' }, body: {} })
      const res = mockRes()

      await createPhoto(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.photoUrlRequired' }),
      )
    })

    it('creates photo with defaults', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      const created = { id: 'p1', propertyId: '1', url: 'https://example.com/a.jpg', position: 0 }
      mockCreate.mockResolvedValue({ data: created })

      const req = mockReq({
        params: { id: '1' },
        body: { url: 'https://example.com/a.jpg' },
      })
      const res = mockRes()

      await createPhoto(req, res)

      expect(mockCreate).toHaveBeenCalledWith('property_photos', {
        propertyId: '1',
        url: 'https://example.com/a.jpg',
        caption: null,
        position: 0,
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { id: '1' },
        body: { url: 'https://example.com/a.jpg' },
      })
      const res = mockRes()

      await createPhoto(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.createPhotoFailed' }),
      )
    })
  })

  describe('listAmenities', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await listAmenities(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns amenities ordered by code', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      const amenities = [{ id: 'a1', propertyId: '1', code: 'pool', label: 'Pool' }]
      mockFindMany.mockResolvedValue(amenities)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()

      await listAmenities(req, res)

      expect(mockFindMany).toHaveBeenCalledWith('property_amenities', {
        where: [{ field: 'propertyId', operator: '=', value: '1' }],
        orderBy: [{ field: 'code', direction: 'asc' }],
      })
      expect(res.json).toHaveBeenCalledWith(amenities)
    })
  })

  describe('createAmenity', () => {
    it('returns 404 when property not found', async () => {
      mockFindById.mockResolvedValue(null)

      const req = mockReq({
        params: { id: 'missing' },
        body: { code: 'pool', label: 'Pool' },
      })
      const res = mockRes()

      await createAmenity(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 400 when fields are missing', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })

      const req = mockReq({ params: { id: '1' }, body: { code: 'pool' } })
      const res = mockRes()

      await createAmenity(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.amenityFieldsRequired' }),
      )
    })

    it('returns 409 when amenity code already exists for property', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockFindOne.mockResolvedValue({ id: 'a1', code: 'pool' })

      const req = mockReq({
        params: { id: '1' },
        body: { code: 'pool', label: 'Pool' },
      })
      const res = mockRes()

      await createAmenity(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.amenityExists' }),
      )
    })

    it('lowercases code and creates amenity', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockFindOne.mockResolvedValue(null)
      const created = { id: 'a1', propertyId: '1', code: 'pool', label: 'Pool' }
      mockCreate.mockResolvedValue({ data: created })

      const req = mockReq({
        params: { id: '1' },
        body: { code: 'POOL', label: 'Pool' },
      })
      const res = mockRes()

      await createAmenity(req, res)

      expect(mockCreate).toHaveBeenCalledWith('property_amenities', {
        propertyId: '1',
        code: 'pool',
        label: 'Pool',
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(created)
    })

    it('returns 500 on database error', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockRejectedValue(new Error('DB error'))

      const req = mockReq({
        params: { id: '1' },
        body: { code: 'pool', label: 'Pool' },
      })
      const res = mockRes()

      await createAmenity(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.createAmenityFailed' }),
      )
    })
  })

  // Regression coverage for PASS-5 AUTHCLASS-01: the six mutating handlers must
  // fail closed on their own (no reliance on a route middleware the scaffolder
  // strips). Anonymous callers get 401; authenticated non-owners get 403; the
  // owner succeeds. Read routes stay public (covered by the suites above).
  describe('access control (AUTHCLASS-01)', () => {
    it('create rejects anonymous callers with 401', async () => {
      const req = mockReq({ body: { name: 'Sunset', ...validAddress } })
      const res = mockAnonRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unauthorized' }),
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('create stamps the property with the session userId as ownerId', async () => {
      mockFindOne.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({ body: { name: 'Sunset', ...validAddress } })
      const res = mockRes('owner-42')

      await create(req, res)

      expect(mockCreate).toHaveBeenCalledWith(
        'properties',
        expect.objectContaining({ ownerId: 'owner-42' }),
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('update rejects anonymous callers with 401 before any DB read', async () => {
      const req = mockReq({ params: { id: '1' }, body: { name: 'New' } })
      const res = mockAnonRes()

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unauthorized' }),
      )
      expect(mockFindById).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('update rejects non-owners with 403 and does not mutate', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'someone-else' })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Hijacked' } })
      const res = mockRes('user-1')

      await update(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.forbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('update succeeds for the owner', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1', name: 'Renamed' } })

      const req = mockReq({ params: { id: '1' }, body: { name: 'Renamed' } })
      const res = mockRes('user-1')

      await update(req, res)

      expect(mockUpdateById).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({ id: '1', name: 'Renamed' })
    })

    it('del rejects anonymous callers with 401', async () => {
      const req = mockReq({ params: { id: '1' } })
      const res = mockAnonRes()

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unauthorized' }),
      )
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('del rejects non-owners with 403 and does not soft-delete', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'someone-else' })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes('user-1')

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.forbidden' }),
      )
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('del succeeds for the owner', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'user-1' })
      mockUpdateById.mockResolvedValue({ data: { id: '1' } })

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes('user-1')

      await del(req, res)

      expect(res.status).toHaveBeenCalledWith(204)
    })

    it('createUnit rejects anonymous callers with 401', async () => {
      const req = mockReq({ params: { id: '1' }, body: { name: '101' } })
      const res = mockAnonRes()

      await createUnit(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unauthorized' }),
      )
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('createUnit rejects non-owners with 403', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'someone-else' })

      const req = mockReq({ params: { id: '1' }, body: { name: '101' } })
      const res = mockRes('user-1')

      await createUnit(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.forbidden' }),
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('createPhoto rejects anonymous callers with 401', async () => {
      const req = mockReq({ params: { id: '1' }, body: { url: 'https://example.com/a.jpg' } })
      const res = mockAnonRes()

      await createPhoto(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unauthorized' }),
      )
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('createPhoto rejects non-owners with 403', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'someone-else' })

      const req = mockReq({ params: { id: '1' }, body: { url: 'https://example.com/a.jpg' } })
      const res = mockRes('user-1')

      await createPhoto(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.forbidden' }),
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('createAmenity rejects anonymous callers with 401', async () => {
      const req = mockReq({ params: { id: '1' }, body: { code: 'pool', label: 'Pool' } })
      const res = mockAnonRes()

      await createAmenity(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.unauthorized' }),
      )
      expect(mockFindById).not.toHaveBeenCalled()
    })

    it('createAmenity rejects non-owners with 403', async () => {
      mockFindById.mockResolvedValue({ id: '1', deletedAt: null, ownerId: 'someone-else' })

      const req = mockReq({ params: { id: '1' }, body: { code: 'pool', label: 'Pool' } })
      const res = mockRes('user-1')

      await createAmenity(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'property.error.forbidden' }),
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })
})
