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

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn(
    (key: string, _vars: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  ),
}))

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSetupIntent } from '../handlers/createSetupIntent.js'
import { deletePaymentMethod } from '../handlers/deletePaymentMethod.js'
import { listPaymentMethods } from '../handlers/listPaymentMethods.js'
import { setDefaultPaymentMethod } from '../handlers/setDefaultPaymentMethod.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    ...overrides,
  }
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

describe('@molecule/api-resource-payment-method handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSetupIntent', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await createSetupIntent(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 201 with the SetupIntent payload', async () => {
      const provider = {
        providerName: 'stripe',
        createSetupIntent: vi
          .fn()
          .mockResolvedValue({ id: 'seti_1', clientSecret: 'cs_1', customerId: 'cus_123' }),
      }
      mockGet.mockReturnValue(provider)
      mockFindMany.mockResolvedValueOnce([ROW])

      const req = mockReq()
      const res = mockRes()

      await createSetupIntent(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'seti_1', clientSecret: 'cs_1', provider: 'stripe' }),
      )
    })

    it('returns 500 when the bond is not wired', async () => {
      mockGet.mockReturnValue(undefined)
      const req = mockReq()
      const res = mockRes()

      await createSetupIntent(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'paymentMethod.error.setupIntentFailed' }),
      )
    })
  })

  describe('listPaymentMethods', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })
      await listPaymentMethods(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns saved payment methods', async () => {
      mockFindMany.mockResolvedValueOnce([ROW])
      const req = mockReq()
      const res = mockRes()

      await listPaymentMethods(req, res)

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'pm-1', brand: 'visa', last4: '4242' }),
      ])
    })

    it('returns 500 on database error', async () => {
      mockFindMany.mockRejectedValueOnce(new Error('db down'))
      const req = mockReq()
      const res = mockRes()

      await listPaymentMethods(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('setDefaultPaymentMethod', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'pm-1' } })
      const res = mockRes({ locals: {} })
      await setDefaultPaymentMethod(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id is missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await setDefaultPaymentMethod(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when method is not found', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const req = mockReq({ params: { id: 'pm-x' } })
      const res = mockRes()

      await setDefaultPaymentMethod(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns the promoted method', async () => {
      mockFindOne
        .mockResolvedValueOnce(ROW) // ownership check
        .mockResolvedValueOnce({ ...ROW, isDefault: true })
      mockUpdateMany.mockResolvedValue({})

      const req = mockReq({ params: { id: 'pm-1' } })
      const res = mockRes()

      await setDefaultPaymentMethod(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pm-1', isDefault: true }),
      )
    })
  })

  describe('deletePaymentMethod', () => {
    it('returns 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'pm-1' } })
      const res = mockRes({ locals: {} })
      await deletePaymentMethod(req, res)
      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('returns 400 when id is missing', async () => {
      const req = mockReq()
      const res = mockRes()
      await deletePaymentMethod(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 404 when method is not found', async () => {
      mockFindOne.mockResolvedValueOnce(null)
      const req = mockReq({ params: { id: 'pm-x' } })
      const res = mockRes()

      await deletePaymentMethod(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('returns 204 after detach + delete', async () => {
      mockFindOne.mockResolvedValueOnce(ROW)
      mockGet.mockReturnValue({
        providerName: 'stripe',
        detachPaymentMethod: vi.fn().mockResolvedValue(true),
      })

      const req = mockReq({ params: { id: 'pm-1' } })
      const res = mockRes()

      await deletePaymentMethod(req, res)

      expect(mockDeleteById).toHaveBeenCalledWith('payment_methods', 'pm-1')
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.end).toHaveBeenCalled()
    })
  })
})
