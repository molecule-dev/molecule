const {
  mockCount,
  mockCreate,
  mockDeleteById,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockUpdateById,
  mockUpdateMany,
} = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteById: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockUpdateMany: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
  updateMany: mockUpdateMany,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _values?: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from '../handlers/create.js'
import { del } from '../handlers/del.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { setAsDefault, update } from '../handlers/update.js'
import {
  countAddresses,
  createAddress,
  deleteAddress,
  getAddress,
  getDefaultAddress,
  listAddresses,
  setDefault,
  updateAddress,
} from '../service.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return { params: {}, body: {}, query: {}, ...overrides }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRes(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    locals: { session: { userId: 'user-1' } },
    ...overrides,
  }
  return res
}

const VALID_BODY = {
  recipientName: 'Ada Lovelace',
  line1: '1 Analytical Engine Way',
  city: 'London',
  postalCode: 'SW1A 1AA',
  countryIso: 'GB',
}

const SAMPLE_ADDRESS = {
  id: 'addr-1',
  userId: 'user-1',
  label: null,
  recipientName: 'Ada Lovelace',
  line1: '1 Analytical Engine Way',
  line2: null,
  city: 'London',
  region: null,
  postalCode: 'SW1A 1AA',
  countryIso: 'GB',
  phone: null,
  isDefaultShipping: false,
  isDefaultBilling: false,
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
}

describe('@molecule/api-resource-address service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAddress', () => {
    it('creates an address with all fields normalized', async () => {
      mockCreate.mockResolvedValue({ data: SAMPLE_ADDRESS, affected: 1 })

      const result = await createAddress({
        userId: 'user-1',
        label: null,
        recipientName: 'Ada Lovelace',
        line1: '1 Analytical Engine Way',
        line2: null,
        city: 'London',
        region: null,
        postalCode: 'SW1A 1AA',
        countryIso: 'gb',
        phone: null,
        isDefaultShipping: false,
        isDefaultBilling: false,
      })

      expect(result).toEqual(SAMPLE_ADDRESS)
      expect(mockCreate).toHaveBeenCalledTimes(1)
      const [table, data] = mockCreate.mock.calls[0]
      expect(table).toBe('addresses')
      expect(data.countryIso).toBe('GB')
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })

    it('clears existing default-shipping when isDefaultShipping is set', async () => {
      mockCreate.mockResolvedValue({
        data: { ...SAMPLE_ADDRESS, isDefaultShipping: true },
        affected: 1,
      })
      mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })

      await createAddress({
        userId: 'user-1',
        label: 'Home',
        recipientName: 'Ada Lovelace',
        line1: '1 Analytical Engine Way',
        line2: null,
        city: 'London',
        region: null,
        postalCode: 'SW1A 1AA',
        countryIso: 'GB',
        phone: null,
        isDefaultShipping: true,
        isDefaultBilling: false,
      })

      expect(mockUpdateMany).toHaveBeenCalledWith(
        'addresses',
        expect.arrayContaining([
          { field: 'userId', operator: '=', value: 'user-1' },
          { field: 'isDefaultShipping', operator: '=', value: true },
        ]),
        { isDefaultShipping: false },
      )
    })

    it('clears existing default-billing when isDefaultBilling is set', async () => {
      mockCreate.mockResolvedValue({
        data: { ...SAMPLE_ADDRESS, isDefaultBilling: true },
        affected: 1,
      })
      mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })

      await createAddress({
        userId: 'user-1',
        label: null,
        recipientName: 'Ada Lovelace',
        line1: '1 Analytical Engine Way',
        line2: null,
        city: 'London',
        region: null,
        postalCode: 'SW1A 1AA',
        countryIso: 'GB',
        phone: null,
        isDefaultShipping: false,
        isDefaultBilling: true,
      })

      expect(mockUpdateMany).toHaveBeenCalledWith(
        'addresses',
        expect.arrayContaining([
          { field: 'userId', operator: '=', value: 'user-1' },
          { field: 'isDefaultBilling', operator: '=', value: true },
        ]),
        { isDefaultBilling: false },
      )
    })

    it('throws if the database returns no row', async () => {
      mockCreate.mockResolvedValue({ data: null, affected: 0 })
      await expect(
        createAddress({
          userId: 'user-1',
          label: null,
          recipientName: 'Ada Lovelace',
          line1: '1 Analytical Engine Way',
          line2: null,
          city: 'London',
          region: null,
          postalCode: 'SW1A 1AA',
          countryIso: 'GB',
          phone: null,
          isDefaultShipping: false,
          isDefaultBilling: false,
        }),
      ).rejects.toThrow(/no data/i)
    })
  })

  describe('listAddresses', () => {
    it('lists addresses for a user, defaults first', async () => {
      mockFindMany.mockResolvedValue([SAMPLE_ADDRESS])
      const result = await listAddresses('user-1')
      expect(result).toEqual([SAMPLE_ADDRESS])
      const [table, opts] = mockFindMany.mock.calls[0]
      expect(table).toBe('addresses')
      expect(opts.where).toEqual([{ field: 'userId', operator: '=', value: 'user-1' }])
      expect(opts.orderBy[0]).toEqual({ field: 'isDefaultShipping', direction: 'desc' })
    })
  })

  describe('getAddress', () => {
    it('returns the address when owned by user', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      const result = await getAddress('user-1', 'addr-1')
      expect(result).toEqual(SAMPLE_ADDRESS)
    })

    it('returns null when address belongs to another user', async () => {
      mockFindById.mockResolvedValue({ ...SAMPLE_ADDRESS, userId: 'other-user' })
      const result = await getAddress('user-1', 'addr-1')
      expect(result).toBeNull()
    })

    it('returns null when address does not exist', async () => {
      mockFindById.mockResolvedValue(null)
      const result = await getAddress('user-1', 'addr-1')
      expect(result).toBeNull()
    })
  })

  describe('updateAddress', () => {
    it('updates an owned address', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockUpdateById.mockResolvedValue({
        data: { ...SAMPLE_ADDRESS, recipientName: 'Charles Babbage' },
        affected: 1,
      })

      const result = await updateAddress('user-1', 'addr-1', { recipientName: 'Charles Babbage' })
      expect(result?.recipientName).toBe('Charles Babbage')
    })

    it('returns null when not owned', async () => {
      mockFindById.mockResolvedValue({ ...SAMPLE_ADDRESS, userId: 'other-user' })
      const result = await updateAddress('user-1', 'addr-1', { recipientName: 'X' })
      expect(result).toBeNull()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })

    it('clears prior default-shipping when toggling on, excluding self', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockUpdateById.mockResolvedValue({
        data: { ...SAMPLE_ADDRESS, isDefaultShipping: true },
        affected: 1,
      })
      mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })

      await updateAddress('user-1', 'addr-1', { isDefaultShipping: true })

      expect(mockUpdateMany).toHaveBeenCalledWith(
        'addresses',
        expect.arrayContaining([
          { field: 'userId', operator: '=', value: 'user-1' },
          { field: 'isDefaultShipping', operator: '=', value: true },
          { field: 'id', operator: '!=', value: 'addr-1' },
        ]),
        { isDefaultShipping: false },
      )
    })
  })

  describe('deleteAddress', () => {
    it('deletes an owned address', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockDeleteById.mockResolvedValue({ data: null, affected: 1 })
      const result = await deleteAddress('user-1', 'addr-1')
      expect(result).toBe(true)
    })

    it('refuses to delete not-owned address', async () => {
      mockFindById.mockResolvedValue({ ...SAMPLE_ADDRESS, userId: 'other-user' })
      const result = await deleteAddress('user-1', 'addr-1')
      expect(result).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('returns false when not found', async () => {
      mockFindById.mockResolvedValue(null)
      const result = await deleteAddress('user-1', 'addr-1')
      expect(result).toBe(false)
    })
  })

  describe('setDefault', () => {
    it('clears all other shipping defaults and flags this one', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })
      mockUpdateById.mockResolvedValue({ data: SAMPLE_ADDRESS, affected: 1 })

      const ok = await setDefault('user-1', 'addr-1', 'shipping')
      expect(ok).toBe(true)

      expect(mockUpdateMany).toHaveBeenCalledWith(
        'addresses',
        expect.arrayContaining([
          { field: 'userId', operator: '=', value: 'user-1' },
          { field: 'isDefaultShipping', operator: '=', value: true },
          { field: 'id', operator: '!=', value: 'addr-1' },
        ]),
        { isDefaultShipping: false },
      )

      expect(mockUpdateById).toHaveBeenCalledWith('addresses', 'addr-1', {
        isDefaultShipping: true,
      })
    })

    it('handles billing kind', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })
      mockUpdateById.mockResolvedValue({ data: SAMPLE_ADDRESS, affected: 1 })

      const ok = await setDefault('user-1', 'addr-1', 'billing')
      expect(ok).toBe(true)
      expect(mockUpdateById).toHaveBeenCalledWith('addresses', 'addr-1', {
        isDefaultBilling: true,
      })
    })

    it('returns false if address does not belong to user', async () => {
      mockFindById.mockResolvedValue({ ...SAMPLE_ADDRESS, userId: 'other-user' })
      const ok = await setDefault('user-1', 'addr-1', 'shipping')
      expect(ok).toBe(false)
      expect(mockUpdateMany).not.toHaveBeenCalled()
      expect(mockUpdateById).not.toHaveBeenCalled()
    })
  })

  describe('countAddresses', () => {
    it("counts only the user's addresses", async () => {
      mockCount.mockResolvedValue(3)
      const result = await countAddresses('user-1')
      expect(result).toBe(3)
      expect(mockCount).toHaveBeenCalledWith('addresses', [
        { field: 'userId', operator: '=', value: 'user-1' },
      ])
    })
  })

  describe('getDefaultAddress', () => {
    it('looks up the default-shipping address', async () => {
      mockFindOne.mockResolvedValue(SAMPLE_ADDRESS)
      const result = await getDefaultAddress('user-1', 'shipping')
      expect(result).toEqual(SAMPLE_ADDRESS)
      expect(mockFindOne).toHaveBeenCalledWith('addresses', [
        { field: 'userId', operator: '=', value: 'user-1' },
        { field: 'isDefaultShipping', operator: '=', value: true },
      ])
    })

    it('returns null when no default exists', async () => {
      mockFindOne.mockResolvedValue(null)
      const result = await getDefaultAddress('user-1', 'billing')
      expect(result).toBeNull()
    })
  })
})

describe('@molecule/api-resource-address handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ body: VALID_BODY })
      const res = mockRes({ locals: {} })
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when validation fails', async () => {
      const req = mockReq({ body: { ...VALID_BODY, countryIso: 'United Kingdom' } })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 400 when body is empty', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await create(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('creates an address and returns 201', async () => {
      mockCreate.mockResolvedValue({ data: SAMPLE_ADDRESS, affected: 1 })

      const req = mockReq({ body: VALID_BODY })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(SAMPLE_ADDRESS)
    })

    it('returns 500 if the service throws', async () => {
      mockCreate.mockRejectedValue(new Error('boom'))

      const req = mockReq({ body: VALID_BODY })
      const res = mockRes()
      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('list', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await list(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it("returns the user's addresses", async () => {
      mockFindMany.mockResolvedValue([SAMPLE_ADDRESS])
      const req = mockReq()
      const res = mockRes()
      await list(req, res)
      expect(res.json).toHaveBeenCalledWith({ data: [SAMPLE_ADDRESS] })
    })
  })

  describe('read', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ params: { id: 'addr-1' } })
      const res = mockRes({ locals: {} })
      await read(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await read(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when address not owned', async () => {
      mockFindById.mockResolvedValue({ ...SAMPLE_ADDRESS, userId: 'other-user' })
      const req = mockReq({ params: { id: 'addr-1' } })
      const res = mockRes()
      await read(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns the address when owned', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      const req = mockReq({ params: { id: 'addr-1' } })
      const res = mockRes()
      await read(req, res)
      expect(res.json).toHaveBeenCalledWith(SAMPLE_ADDRESS)
    })
  })

  describe('update', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ params: { id: 'addr-1' }, body: { city: 'Cambridge' } })
      const res = mockRes({ locals: {} })
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when validation fails', async () => {
      const req = mockReq({ params: { id: 'addr-1' }, body: { countryIso: 'XYZ' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when not found', async () => {
      mockFindById.mockResolvedValue(null)
      const req = mockReq({ params: { id: 'addr-1' }, body: { city: 'Cambridge' } })
      const res = mockRes()
      await update(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('updates and returns the address', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockUpdateById.mockResolvedValue({
        data: { ...SAMPLE_ADDRESS, city: 'Cambridge' },
        affected: 1,
      })
      const req = mockReq({ params: { id: 'addr-1' }, body: { city: 'Cambridge' } })
      const res = mockRes()
      await update(req, res)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ city: 'Cambridge' }))
    })
  })

  describe('setAsDefault', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ params: { id: 'addr-1' }, body: { kind: 'shipping' } })
      const res = mockRes({ locals: {} })
      await setAsDefault(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 with invalid kind', async () => {
      const req = mockReq({ params: { id: 'addr-1' }, body: { kind: 'pickup' } })
      const res = mockRes()
      await setAsDefault(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when not owned', async () => {
      mockFindById.mockResolvedValue(null)
      const req = mockReq({ params: { id: 'addr-1' }, body: { kind: 'shipping' } })
      const res = mockRes()
      await setAsDefault(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 204 on success', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })
      mockUpdateById.mockResolvedValue({ data: SAMPLE_ADDRESS, affected: 1 })
      const req = mockReq({ params: { id: 'addr-1' }, body: { kind: 'shipping' } })
      const res = mockRes()
      await setAsDefault(req, res)
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })

  describe('del', () => {
    it('returns 401 without a session', async () => {
      const req = mockReq({ params: { id: 'addr-1' } })
      const res = mockRes({ locals: {} })
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when not owned', async () => {
      mockFindById.mockResolvedValue(null)
      const req = mockReq({ params: { id: 'addr-1' } })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 204 on success', async () => {
      mockFindById.mockResolvedValue(SAMPLE_ADDRESS)
      mockDeleteById.mockResolvedValue({ data: null, affected: 1 })
      const req = mockReq({ params: { id: 'addr-1' } })
      const res = mockRes()
      await del(req, res)
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })
})
