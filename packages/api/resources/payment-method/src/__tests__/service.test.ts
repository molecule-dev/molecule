const { mockCreate, mockFindOne, mockFindMany, mockUpdateMany, mockDeleteById, mockGet } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindOne: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateMany: vi.fn(),
    mockDeleteById: vi.fn(),
    mockGet: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findOne: mockFindOne,
  findMany: mockFindMany,
  updateMany: mockUpdateMany,
  deleteById: mockDeleteById,
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  attachPaymentMethod,
  createSetupIntent,
  deletePaymentMethod,
  getPaymentMethod,
  listPaymentMethods,
  PROVIDER_NAME,
  setDefaultPaymentMethod,
  TABLE_NAME,
} from '../service.js'

const ROW = {
  id: 'pm-1',
  userId: 'user-1',
  provider: 'stripe',
  providerCustomerId: 'cus_123',
  providerPaymentMethodId: 'pm_abc',
  last4: '4242',
  brand: 'visa',
  expMonth: 12,
  expYear: 2030,
  isDefault: true,
  createdAt: '2024-01-01T00:00:00Z',
}

function mockProvider(overrides: Record<string, unknown> = {}) {
  return {
    providerName: 'stripe',
    createSetupIntent: vi.fn(),
    getPaymentMethod: vi.fn(),
    detachPaymentMethod: vi.fn(),
    ...overrides,
  }
}

describe('@molecule/api-resource-payment-method service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSetupIntent', () => {
    it('creates an intent reusing an existing customerId when present', async () => {
      const provider = mockProvider({
        createSetupIntent: vi
          .fn()
          .mockResolvedValue({ id: 'seti_1', clientSecret: 'cs_1', customerId: 'cus_123' }),
      })
      mockGet.mockReturnValue(provider)
      mockFindMany.mockResolvedValueOnce([ROW]) // existing customer lookup

      const result = await createSetupIntent('user-1')

      expect(mockGet).toHaveBeenCalledWith('payments', PROVIDER_NAME)
      expect(provider.createSetupIntent).toHaveBeenCalledWith({
        customerId: 'cus_123',
        metadata: { userId: 'user-1' },
      })
      expect(result).toEqual({
        id: 'seti_1',
        clientSecret: 'cs_1',
        customerId: 'cus_123',
        provider: 'stripe',
      })
    })

    it('issues a SetupIntent without customerId when the user has no saved methods', async () => {
      const provider = mockProvider({
        createSetupIntent: vi
          .fn()
          .mockResolvedValue({ id: 'seti_2', clientSecret: 'cs_2', customerId: 'cus_new' }),
      })
      mockGet.mockReturnValue(provider)
      mockFindMany.mockResolvedValueOnce([])

      const result = await createSetupIntent('user-1')

      expect(provider.createSetupIntent).toHaveBeenCalledWith({
        customerId: undefined,
        metadata: { userId: 'user-1' },
      })
      expect(result.customerId).toBe('cus_new')
    })

    it('throws when no payments provider is bonded', async () => {
      mockGet.mockReturnValue(undefined)
      await expect(createSetupIntent('user-1')).rejects.toThrow(/No payments provider/)
    })

    it('throws when the bonded provider lacks createSetupIntent', async () => {
      mockGet.mockReturnValue({ providerName: 'stripe' })
      await expect(createSetupIntent('user-1')).rejects.toThrow(/createSetupIntent/)
    })
  })

  describe('attachPaymentMethod', () => {
    it('persists the payment method using metadata from the provider', async () => {
      const provider = mockProvider({
        getPaymentMethod: vi.fn().mockResolvedValue({
          id: 'pm_abc',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2030,
        }),
      })
      mockGet.mockReturnValue(provider)
      // findExistingCustomerId
      mockFindMany.mockResolvedValueOnce([ROW])
      // existingForUser (isFirst check)
      mockFindMany.mockResolvedValueOnce([ROW])
      mockCreate.mockResolvedValueOnce({ data: { ...ROW, id: 'pm-2', isDefault: false } })

      const result = await attachPaymentMethod('user-1', 'pm_abc')

      expect(provider.getPaymentMethod).toHaveBeenCalledWith('pm_abc')
      expect(mockCreate).toHaveBeenCalledWith(
        TABLE_NAME,
        expect.objectContaining({
          userId: 'user-1',
          provider: 'stripe',
          providerCustomerId: 'cus_123',
          providerPaymentMethodId: 'pm_abc',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2030,
          isDefault: false,
        }),
      )
      expect(result.id).toBe('pm-2')
    })

    it('marks the first saved method as default', async () => {
      const provider = mockProvider({
        getPaymentMethod: vi.fn().mockResolvedValue({
          id: 'pm_first',
          brand: 'mastercard',
          last4: '0001',
          expMonth: 1,
          expYear: 2099,
        }),
      })
      mockGet.mockReturnValue(provider)
      mockFindMany.mockResolvedValueOnce([]) // no existing customer
      mockFindMany.mockResolvedValueOnce([]) // no existing methods
      mockCreate.mockResolvedValueOnce({
        data: { ...ROW, id: 'pm-first', providerPaymentMethodId: 'pm_first', isDefault: true },
      })

      const result = await attachPaymentMethod('user-1', 'pm_first')

      expect(mockCreate).toHaveBeenCalledWith(
        TABLE_NAME,
        expect.objectContaining({ isDefault: true, providerCustomerId: '' }),
      )
      expect(result.isDefault).toBe(true)
    })

    it('throws when the provider returns no payment method', async () => {
      const provider = mockProvider({
        getPaymentMethod: vi.fn().mockResolvedValue(null),
      })
      mockGet.mockReturnValue(provider)

      await expect(attachPaymentMethod('user-1', 'pm_missing')).rejects.toThrow(/not found/)
      expect(mockFindMany).not.toHaveBeenCalled()
    })
  })

  describe('listPaymentMethods', () => {
    it('returns the user’s saved methods sorted by createdAt desc', async () => {
      mockFindMany.mockResolvedValueOnce([ROW, { ...ROW, id: 'pm-2' }])
      const result = await listPaymentMethods('user-1')

      expect(mockFindMany).toHaveBeenCalledWith(
        TABLE_NAME,
        expect.objectContaining({
          where: [{ field: 'userId', operator: '=', value: 'user-1' }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
        }),
      )
      expect(result).toHaveLength(2)
      expect(result[0]?.id).toBe('pm-1')
    })
  })

  describe('getPaymentMethod', () => {
    it('returns the row when the user owns it', async () => {
      mockFindOne.mockResolvedValueOnce(ROW)
      const result = await getPaymentMethod('pm-1', 'user-1')
      expect(result?.id).toBe('pm-1')
    })

    it('returns null when the row is missing', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const result = await getPaymentMethod('pm-x', 'user-1')
      expect(result).toBeNull()
    })

    it('returns null when the row belongs to another user', async () => {
      mockFindOne.mockResolvedValueOnce({ ...ROW, userId: 'attacker' })
      const result = await getPaymentMethod('pm-1', 'user-1')
      expect(result).toBeNull()
    })
  })

  describe('setDefaultPaymentMethod', () => {
    it('clears existing defaults and promotes the target', async () => {
      mockFindOne
        .mockResolvedValueOnce(ROW) // ownership check
        .mockResolvedValueOnce({ ...ROW, isDefault: true }) // updated row reload
      mockUpdateMany.mockResolvedValue({})

      const result = await setDefaultPaymentMethod('user-1', 'pm-1')

      expect(mockUpdateMany).toHaveBeenNthCalledWith(
        1,
        TABLE_NAME,
        [
          { field: 'userId', operator: '=', value: 'user-1' },
          { field: 'isDefault', operator: '=', value: true },
        ],
        { isDefault: false },
      )
      expect(mockUpdateMany).toHaveBeenNthCalledWith(
        2,
        TABLE_NAME,
        [{ field: 'id', operator: '=', value: 'pm-1' }],
        { isDefault: true },
      )
      expect(result?.isDefault).toBe(true)
    })

    it('returns null when the user does not own the row', async () => {
      mockFindOne.mockResolvedValueOnce({ ...ROW, userId: 'other' })
      const result = await setDefaultPaymentMethod('user-1', 'pm-1')
      expect(result).toBeNull()
      expect(mockUpdateMany).not.toHaveBeenCalled()
    })
  })

  describe('deletePaymentMethod', () => {
    it('detaches at the provider and deletes the row', async () => {
      mockFindOne.mockResolvedValueOnce(ROW)
      const provider = mockProvider({
        detachPaymentMethod: vi.fn().mockResolvedValue(true),
      })
      mockGet.mockReturnValue(provider)

      const ok = await deletePaymentMethod('pm-1', 'user-1')

      expect(provider.detachPaymentMethod).toHaveBeenCalledWith('pm_abc')
      expect(mockDeleteById).toHaveBeenCalledWith(TABLE_NAME, 'pm-1')
      expect(ok).toBe(true)
    })

    it('returns false without calling provider when row is missing', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const ok = await deletePaymentMethod('pm-x', 'user-1')
      expect(ok).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('returns false when the row is owned by another user', async () => {
      mockFindOne.mockResolvedValueOnce({ ...ROW, userId: 'attacker' })
      const ok = await deletePaymentMethod('pm-1', 'user-1')
      expect(ok).toBe(false)
      expect(mockDeleteById).not.toHaveBeenCalled()
    })

    it('still deletes the row when the provider detach throws', async () => {
      mockFindOne.mockResolvedValueOnce(ROW)
      const provider = mockProvider({
        detachPaymentMethod: vi.fn().mockRejectedValue(new Error('provider down')),
      })
      mockGet.mockReturnValue(provider)

      const ok = await deletePaymentMethod('pm-1', 'user-1')

      expect(ok).toBe(true)
      expect(mockDeleteById).toHaveBeenCalledWith(TABLE_NAME, 'pm-1')
    })
  })
})
