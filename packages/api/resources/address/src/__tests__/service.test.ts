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

import { beforeEach, describe, expect, it, vi } from 'vitest'

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
import type { Address, CreateAddressInput } from '../types.js'

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'a-1',
    userId: 'user-1',
    label: 'Home',
    recipientName: 'Alice',
    line1: '123 Main',
    line2: null,
    city: 'Brooklyn',
    region: 'NY',
    postalCode: '11201',
    countryIso: 'US',
    phone: null,
    isDefaultShipping: false,
    isDefaultBilling: false,
    createdAt: '2026-05-13T08:00:00.000Z',
    updatedAt: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

function inputFromAddress(addr: Address): CreateAddressInput {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = addr
  return rest
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('createAddress', () => {
  it('returns the created address', async () => {
    mockCreate.mockResolvedValue({ data: makeAddress() })
    const out = await createAddress(inputFromAddress(makeAddress()))
    expect(out.id).toBe('a-1')
  })

  it('uppercases countryIso on write', async () => {
    mockCreate.mockResolvedValue({ data: makeAddress() })
    await createAddress(inputFromAddress(makeAddress({ countryIso: 'us' })))
    expect(mockCreate.mock.calls[0][1].countryIso).toBe('US')
  })

  it('throws when create returns no data', async () => {
    mockCreate.mockResolvedValue({ data: null })
    await expect(createAddress(inputFromAddress(makeAddress()))).rejects.toThrow(
      'Database create returned no data',
    )
  })

  it('clears other shipping defaults when isDefaultShipping=true on input', async () => {
    mockCreate.mockResolvedValue({ data: makeAddress() })
    mockUpdateMany.mockResolvedValue(undefined)
    await createAddress(inputFromAddress(makeAddress({ isDefaultShipping: true })))
    expect(mockUpdateMany).toHaveBeenCalledWith(
      'addresses',
      expect.arrayContaining([
        { field: 'userId', operator: '=', value: 'user-1' },
        { field: 'isDefaultShipping', operator: '=', value: true },
      ]),
      { isDefaultShipping: false },
    )
  })

  it('clears other billing defaults when isDefaultBilling=true on input', async () => {
    mockCreate.mockResolvedValue({ data: makeAddress() })
    mockUpdateMany.mockResolvedValue(undefined)
    await createAddress(inputFromAddress(makeAddress({ isDefaultBilling: true })))
    expect(mockUpdateMany).toHaveBeenCalled()
    const where = mockUpdateMany.mock.calls[0][1]
    expect(where).toContainEqual({ field: 'isDefaultBilling', operator: '=', value: true })
  })

  it('does NOT clear defaults when neither flag is set', async () => {
    mockCreate.mockResolvedValue({ data: makeAddress() })
    await createAddress(inputFromAddress(makeAddress()))
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

describe('listAddresses', () => {
  it('scopes by userId and orders defaults-first', async () => {
    mockFindMany.mockResolvedValue([])
    await listAddresses('user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toEqual([{ field: 'userId', operator: '=', value: 'user-1' }])
    expect(args.orderBy).toEqual([
      { field: 'isDefaultShipping', direction: 'desc' },
      { field: 'isDefaultBilling', direction: 'desc' },
      { field: 'createdAt', direction: 'desc' },
    ])
  })
})

describe('getAddress IDOR', () => {
  it('null when missing', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getAddress('user-1', 'a-1')).toBeNull()
  })

  it('null when cross-owner', async () => {
    mockFindById.mockResolvedValue(makeAddress({ userId: 'other' }))
    expect(await getAddress('user-1', 'a-1')).toBeNull()
  })

  it('returns row for owner', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    const out = await getAddress('user-1', 'a-1')
    expect(out?.id).toBe('a-1')
  })
})

describe('updateAddress', () => {
  it('returns null for cross-owner update', async () => {
    mockFindById.mockResolvedValue(makeAddress({ userId: 'other' }))
    expect(await updateAddress('user-1', 'a-1', { city: 'X' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('clears other shipping defaults when isDefaultShipping=true (except self)', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockUpdateMany.mockResolvedValue(undefined)
    mockUpdateById.mockResolvedValue({ data: makeAddress({ isDefaultShipping: true }) })
    await updateAddress('user-1', 'a-1', { isDefaultShipping: true })
    const where = mockUpdateMany.mock.calls[0][1]
    expect(where).toContainEqual({ field: 'id', operator: '!=', value: 'a-1' })
  })

  it('uppercases countryIso on update', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockUpdateById.mockResolvedValue({ data: makeAddress({ countryIso: 'GB' }) })
    await updateAddress('user-1', 'a-1', { countryIso: 'gb' })
    expect(mockUpdateById.mock.calls[0][2].countryIso).toBe('GB')
  })

  it('returns updated row', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockUpdateById.mockResolvedValue({ data: makeAddress({ city: 'NYC' }) })
    const out = await updateAddress('user-1', 'a-1', { city: 'NYC' })
    expect(out?.city).toBe('NYC')
  })
})

describe('deleteAddress', () => {
  it('false for cross-owner', async () => {
    mockFindById.mockResolvedValue(makeAddress({ userId: 'other' }))
    expect(await deleteAddress('user-1', 'a-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('true when delete affects rows', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteAddress('user-1', 'a-1')).toBe(true)
  })

  it('false when delete affects zero rows (race)', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockDeleteById.mockResolvedValue({ affected: 0 })
    expect(await deleteAddress('user-1', 'a-1')).toBe(false)
  })
})

describe('setDefault', () => {
  it('false when address missing/cross-owner', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await setDefault('user-1', 'a-1', 'shipping')).toBe(false)
  })

  it('clears other shipping defaults then flips self to true', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockUpdateMany.mockResolvedValue(undefined)
    mockUpdateById.mockResolvedValue({ data: makeAddress({ isDefaultShipping: true }) })
    expect(await setDefault('user-1', 'a-1', 'shipping')).toBe(true)
    // updateMany clears OTHER addresses' default flag
    expect(mockUpdateMany.mock.calls[0][1]).toContainEqual({
      field: 'id',
      operator: '!=',
      value: 'a-1',
    })
    // updateById flips THIS address's flag
    expect(mockUpdateById.mock.calls[0][2]).toEqual({ isDefaultShipping: true })
  })

  it('flips isDefaultBilling=true for kind=billing', async () => {
    mockFindById.mockResolvedValue(makeAddress())
    mockUpdateMany.mockResolvedValue(undefined)
    mockUpdateById.mockResolvedValue({ data: makeAddress({ isDefaultBilling: true }) })
    await setDefault('user-1', 'a-1', 'billing')
    expect(mockUpdateById.mock.calls[0][2]).toEqual({ isDefaultBilling: true })
  })
})

describe('countAddresses + getDefaultAddress', () => {
  it('countAddresses scopes by userId', async () => {
    mockCount.mockResolvedValue(5)
    expect(await countAddresses('user-1')).toBe(5)
    expect(mockCount.mock.calls[0][1]).toEqual([
      { field: 'userId', operator: '=', value: 'user-1' },
    ])
  })

  it('getDefaultAddress(shipping) queries the shipping flag', async () => {
    mockFindOne.mockResolvedValue(makeAddress({ isDefaultShipping: true }))
    const out = await getDefaultAddress('user-1', 'shipping')
    expect(out?.isDefaultShipping).toBe(true)
    expect(mockFindOne.mock.calls[0][1]).toEqual([
      { field: 'userId', operator: '=', value: 'user-1' },
      { field: 'isDefaultShipping', operator: '=', value: true },
    ])
  })

  it('getDefaultAddress(billing) queries the billing flag', async () => {
    mockFindOne.mockResolvedValue(null)
    expect(await getDefaultAddress('user-1', 'billing')).toBeNull()
    expect(mockFindOne.mock.calls[0][1]).toContainEqual({
      field: 'isDefaultBilling',
      operator: '=',
      value: true,
    })
  })
})
