/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import { describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { createAddress, getDefaultAddress } from '../index.js'

describe('README @example', () => {
  it('bonds the store, creates a default shipping address and reads it back', async () => {
    const row = {
      id: 'addr-1',
      userId: 'user-123',
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: '12 St James Square',
      line2: null,
      city: 'London',
      region: null,
      postalCode: 'SW1Y 4JH',
      countryIso: 'GB',
      phone: null,
      isDefaultShipping: true,
      isDefaultBilling: false,
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.updateMany.mockResolvedValueOnce({ data: null, affected: 1 })
    fakeStore.create.mockResolvedValueOnce({ data: row, affected: 1 })
    fakeStore.findOne.mockResolvedValueOnce(row)

    setStore(store)

    const userId = 'user-123'
    const address = await createAddress({
      userId,
      label: 'Home',
      recipientName: 'Ada Lovelace',
      line1: '12 St James Square',
      line2: null,
      city: 'London',
      region: null,
      postalCode: 'SW1Y 4JH',
      countryIso: 'gb',
      phone: null,
      isDefaultShipping: true,
      isDefaultBilling: false,
    })
    const shipTo = await getDefaultAddress(userId, 'shipping')

    expect(fakeStore.updateMany).toHaveBeenCalledWith(
      'addresses',
      [
        { field: 'userId', operator: '=', value: 'user-123' },
        { field: 'isDefaultShipping', operator: '=', value: true },
      ],
      { isDefaultShipping: false },
    )
    expect(fakeStore.create).toHaveBeenCalledWith(
      'addresses',
      expect.objectContaining({ userId: 'user-123', countryIso: 'GB', isDefaultShipping: true }),
    )
    expect(address.countryIso).toBe('GB')
    expect(shipTo?.id).toBe('addr-1')
  })
})
