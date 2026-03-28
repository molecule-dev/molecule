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

import { cancel } from '../handlers/cancel.js'
import { create } from '../handlers/create.js'
import { getHistory } from '../handlers/getHistory.js'
import { list } from '../handlers/list.js'
import { read } from '../handlers/read.js'
import { refund } from '../handlers/refund.js'
import { updateStatus } from '../handlers/updateStatus.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockReq(overrides: Record<string, unknown> = {}): any {
  return {
    params: {},
    body: {},
    query: {},
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

const ORDER_ROW = {
  id: 'order-1',
  userId: 'user-1',
  status: 'pending',
  subtotal: 20,
  tax: 2,
  shipping: 5,
  discount: 0,
  total: 27,
  shippingAddress: null,
  billingAddress: null,
  paymentId: null,
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const ITEM_ROW = {
  id: 'item-1',
  orderId: 'order-1',
  productId: 'prod-1',
  variantId: null,
  name: 'Widget',
  price: 10,
  quantity: 2,
  image: null,
}

describe('@molecule/api-resource-order handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({
        body: { items: [{ productId: 'p1', name: 'X', price: 5, quantity: 1 }] },
      })
      const res = mockRes({ locals: {} })

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 when items are missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.itemsRequired' }),
      )
    })

    it('should return 400 when items array is empty', async () => {
      const req = mockReq({ body: { items: [] } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when item is invalid', async () => {
      const req = mockReq({ body: { items: [{ productId: 'p1' }] } })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errorKey: 'order.error.invalidItem' }),
      )
    })

    it('should create an order with items', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: ORDER_ROW }) // create order
        .mockResolvedValueOnce({ data: ITEM_ROW }) // create item
        .mockResolvedValueOnce({ data: { id: 'event-1' } }) // create event

      const req = mockReq({
        body: {
          items: [{ productId: 'prod-1', name: 'Widget', price: 10, quantity: 2 }],
        },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCreate).toHaveBeenCalledWith(
        'orders',
        expect.objectContaining({ userId: 'user-1', status: 'pending' }),
      )
      expect(mockCreate).toHaveBeenCalledWith(
        'order_items',
        expect.objectContaining({ orderId: 'order-1', productId: 'prod-1' }),
      )
      expect(mockCreate).toHaveBeenCalledWith(
        'order_events',
        expect.objectContaining({ orderId: 'order-1', status: 'pending' }),
      )
    })

    it('should return 500 on database error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB error'))

      const req = mockReq({
        body: {
          items: [{ productId: 'p1', name: 'Widget', price: 10, quantity: 1 }],
        },
      })
      const res = mockRes()

      await create(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('list', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq()
      const res = mockRes({ locals: {} })

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return paginated orders', async () => {
      mockFindMany.mockResolvedValueOnce([ORDER_ROW])
      mockCount.mockResolvedValueOnce(1)
      // Items for the order
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq({ query: { page: '1', limit: '10' } })
      const res = mockRes()

      await list(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ id: 'order-1' })],
          total: 1,
          page: 1,
          limit: 10,
        }),
      )
    })

    it('should filter by status', async () => {
      mockFindMany.mockResolvedValueOnce([])
      mockCount.mockResolvedValueOnce(0)

      const req = mockReq({ query: { status: 'shipped' } })
      const res = mockRes()

      await list(req, res)

      expect(mockFindMany).toHaveBeenCalledWith(
        'orders',
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ field: 'status', value: 'shipped' }),
          ]),
        }),
      )
    })

    it('should return 500 on database error', async () => {
      mockFindMany.mockRejectedValueOnce(new Error('DB error'))
      mockCount.mockResolvedValueOnce(0)

      const req = mockReq()
      const res = mockRes()

      await list(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('read', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes({ locals: {} })

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when order not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 when order belongs to another user', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, userId: 'other-user' })

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return order with items', async () => {
      mockFindById.mockResolvedValueOnce(ORDER_ROW)
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await read(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order-1',
          items: [expect.objectContaining({ productId: 'prod-1' })],
        }),
      )
    })
  })

  describe('updateStatus', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'order-1' }, body: { status: 'confirmed' } })
      const res = mockRes({ locals: {} })

      await updateStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 400 for invalid status', async () => {
      const req = mockReq({ params: { id: 'order-1' }, body: { status: 'invalid' } })
      const res = mockRes()

      await updateStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return 404 when order not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' }, body: { status: 'confirmed' } })
      const res = mockRes()

      await updateStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 409 for invalid transition', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, status: 'delivered' })

      const req = mockReq({ params: { id: 'order-1' }, body: { status: 'pending' } })
      const res = mockRes()

      await updateStatus(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('should update status with valid transition', async () => {
      mockFindById.mockResolvedValueOnce(ORDER_ROW) // pending -> confirmed is valid
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: { id: 'event-1' } })
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq({ params: { id: 'order-1' }, body: { status: 'confirmed' } })
      const res = mockRes()

      await updateStatus(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'confirmed' }),
      )
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }))
    })
  })

  describe('cancel', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes({ locals: {} })

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when order not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 when order belongs to another user', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, userId: 'other-user' })

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return 409 when order cannot be cancelled', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, status: 'delivered' })

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await cancel(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('should cancel a pending order', async () => {
      mockFindById.mockResolvedValueOnce(ORDER_ROW) // pending -> cancelled is valid
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: { id: 'event-1' } })
      mockFindMany.mockResolvedValueOnce([ITEM_ROW])

      const req = mockReq({ params: { id: 'order-1' }, body: { reason: 'changed mind' } })
      const res = mockRes()

      await cancel(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'cancelled' }),
      )
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
    })
  })

  describe('refund', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes({ locals: {} })

      await refund(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when order not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await refund(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 409 when order cannot be refunded', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, status: 'pending' })

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await refund(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('should return 400 for invalid refund amount', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, status: 'delivered' })

      const req = mockReq({ params: { id: 'order-1' }, body: { amount: 999 } })
      const res = mockRes()

      await refund(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should issue a full refund', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, status: 'delivered' })
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: { id: 'event-1' } })

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await refund(req, res)

      expect(mockUpdateById).toHaveBeenCalledWith(
        'orders',
        'order-1',
        expect.objectContaining({ status: 'refunded' }),
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          amount: 27,
          status: 'refunded',
        }),
      )
    })

    it('should issue a partial refund', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, status: 'delivered' })
      mockUpdateById.mockResolvedValueOnce({})
      mockCreate.mockResolvedValueOnce({ data: { id: 'event-1' } })

      const req = mockReq({
        params: { id: 'order-1' },
        body: { amount: 10, reason: 'damaged item' },
      })
      const res = mockRes()

      await refund(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          amount: 10,
          status: 'refunded',
        }),
      )
    })
  })

  describe('getHistory', () => {
    it('should return 401 when not authenticated', async () => {
      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes({ locals: {} })

      await getHistory(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should return 404 when order not found', async () => {
      mockFindById.mockResolvedValueOnce(null)

      const req = mockReq({ params: { id: 'missing' } })
      const res = mockRes()

      await getHistory(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('should return 403 when order belongs to another user', async () => {
      mockFindById.mockResolvedValueOnce({ ...ORDER_ROW, userId: 'other-user' })

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await getHistory(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('should return order event history', async () => {
      mockFindById.mockResolvedValueOnce(ORDER_ROW)
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'e1',
          orderId: 'order-1',
          status: 'pending',
          metadata: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'e2',
          orderId: 'order-1',
          status: 'confirmed',
          metadata: '{"by":"admin"}',
          createdAt: '2024-01-02T00:00:00Z',
        },
      ])

      const req = mockReq({ params: { id: 'order-1' } })
      const res = mockRes()

      await getHistory(req, res)

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ status: 'pending' }),
        expect.objectContaining({ status: 'confirmed', metadata: { by: 'admin' } }),
      ])
    })
  })
})
